/* TAPRI — vanilla JS + Supabase */

// Supabase client is initialized here from config.js.
// config.js must define window.TAPRI_SUPABASE_URL and
// window.TAPRI_SUPABASE_PUBLISHABLE_KEY.
const SUPABASE_URL = window.TAPRI_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = window.TAPRI_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Supabase configuration is missing.");
}

if (!window.supabase) {
    throw new Error("Supabase library failed to load.");
}

const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

const DEFAULT_ITEMS = [
    { name: "Double Switch", category: "cigarette", price: 28 },
    { name: "Connect", category: "cigarette", price: 28 },
    { name: "Blue Advance", category: "cigarette", price: 28 },
    { name: "Advance", category: "cigarette", price: 28 },
    { name: "Saunf Crush", category: "cigarette", price: 15 },
    { name: "Chai", category: "chai", price: 15 },
    { name: "Maggi", category: "food", price: 50 }
];

const DRAFT_KEY = "tapri_current_draft_v2";
const GROUP_KEY = "tapri_group_id_v2";

let currentUser = null;
let group = null;
let items = [];
let people = [];
let sessions = [];
let current = loadDraft();
let currentSessionName = localStorage.getItem("tapri_current_name_v2") || "";
let loading = true;

const $ = id => document.getElementById(id);
const personSelect = $("personSelect");
const itemSelect = $("itemSelect");
const quantityInput = $("quantityInput");
const addToSessionBtn = $("addToSessionBtn");
const sessionItems = $("sessionItems");
const saveSessionBtn = $("saveSessionBtn");
const sessionNameInput = $("sessionNameInput");
const historyList = $("historyList");
const manageItemsList = $("manageItemsList");
const managePeopleList = $("managePeopleList");

function loadDraft() {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY)) || {}; }
    catch { return {}; }
}

function saveDraft() {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(current));
}

function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem("tapri_current_name_v2");
}

function money(n) {
    const v = Number(n) || 0;
    return "₹" + v.toLocaleString("en-IN", {
        minimumFractionDigits: v % 1 ? 2 : 0,
        maximumFractionDigits: 2
    });
}

function esc(v) {
    const d = document.createElement("div");
    d.textContent = String(v ?? "");
    return d.innerHTML;
}

function today(date) {
    const d = new Date(date), n = new Date();
    return d.getFullYear() === n.getFullYear() &&
        d.getMonth() === n.getMonth() &&
        d.getDate() === n.getDate();
}

function iconRefresh() {
    window.lucide?.createIcons?.();
}

function itemById(id) {
    return items.find(i => i.id === id);
}

function personById(id) {
    return people.find(p => p.id === id);
}

function categoryLabel(c) {
    return ({
        cigarette: "Cigarette",
        chai: "Chai",
        food: "Food",
        other: "Other"
    })[c] || "Other";
}

function setConnectionStatus(text, connected = false) {
    const el = $("connectionStatus");
    if (!el) return;
    el.innerHTML = `<i data-lucide="${connected ? "cloud" : "loader-circle"}"></i>${esc(text)}`;
    iconRefresh();
}

function groupLink() {
    const url = new URL(window.location.href);
    url.searchParams.set("group", group.id);
    return url.toString();
}

async function init() {
    bindEvents();
    sessionNameInput.value = currentSessionName;
    setConnectionStatus("Connecting…");

    try {
        if (!window.supabase) throw new Error("Supabase library did not load.");
        if (!SUPABASE_URL || SUPABASE_URL.includes("YOUR_")) {
            throw new Error("Add your Supabase Project URL and Publishable key to config.js.");
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (sessionData.session) {
            currentUser = sessionData.session.user;
        } else {
            const { data, error } = await supabase.auth.signInAnonymously();
            if (error) throw new Error(`Anonymous sign-in failed: ${error.message}`);
            currentUser = data.user;
        }

        await loadOrCreateGroup();
        await loadGroupData();
        await ensureDefaultItems();
        await loadGroupData();

        renderAll();
        loading = false;
        setConnectionStatus("Synced", true);
    } catch (error) {
        console.error(error);
        loading = false;
        setConnectionStatus("Connection error");
        showFatalError(error.message || "Could not connect to Supabase.");
    }
}

async function loadOrCreateGroup() {
    const params = new URLSearchParams(window.location.search);
    const sharedGroupId = params.get("group");
    const storedGroupId = localStorage.getItem(GROUP_KEY);
    const targetGroupId = sharedGroupId || storedGroupId;

    if (targetGroupId) {
        // If this came from a shared link, join first. The membership INSERT
        // policy only requires that the new membership belongs to auth.uid().
        if (sharedGroupId) {
            try {
                await ensureMembership(targetGroupId);
            } catch (joinError) {
                if (joinError.code === "23503") {
                    throw new Error("This Tapri group no longer exists.");
                }
                throw joinError;
            }
        }

        const { data: existingGroup, error } = await supabase
            .from("groups")
            .select("id,name,created_by,created_at")
            .eq("id", targetGroupId)
            .maybeSingle();

        if (error) throw error;
        if (existingGroup) {
            group = existingGroup;
            if (!sharedGroupId) await ensureMembership(group.id);
            localStorage.setItem(GROUP_KEY, group.id);
            return;
        }

        if (sharedGroupId) {
            throw new Error("This Tapri group no longer exists.");
        }
    }

    const { data: createdGroup, error: createError } = await supabase
        .from("groups")
        .insert({ name: "My Tapri", created_by: currentUser.id })
        .select("id,name,created_by,created_at")
        .single();

    if (createError) throw createError;

    group = createdGroup;
    localStorage.setItem(GROUP_KEY, group.id);
    await ensureMembership(group.id, "owner");
}

async function ensureMembership(groupId, role = "member") {
    const { data: existing, error: readError } = await supabase
        .from("group_memberships")
        .select("id,role")
        .eq("group_id", groupId)
        .eq("user_id", currentUser.id)
        .maybeSingle();

    if (readError) throw readError;
    if (existing) return existing;

    const { data, error } = await supabase
        .from("group_memberships")
        .insert({ group_id: groupId, user_id: currentUser.id, role })
        .select("id,role")
        .single();

    if (error) throw error;
    return data;
}

async function loadGroupData() {
    const [peopleRes, itemsRes, sessionsRes] = await Promise.all([
        supabase.from("people").select("id,group_id,name,created_at").eq("group_id", group.id).order("name"),
        supabase.from("items").select("id,group_id,name,category,price,created_at,updated_at").eq("group_id", group.id).order("name"),
        supabase.from("sessions").select("id,group_id,name,session_date,total_items,total_cost,created_at,session_items(id,item_id,person_id,item_name,person_name,price,quantity,total,created_at)").eq("group_id", group.id).order("session_date", { ascending: false })
    ]);

    if (peopleRes.error) throw peopleRes.error;
    if (itemsRes.error) throw itemsRes.error;
    if (sessionsRes.error) throw sessionsRes.error;

    people = peopleRes.data || [];
    items = itemsRes.data || [];
    sessions = (sessionsRes.data || []).map(s => ({
        id: s.id,
        name: s.name,
        date: s.session_date,
        totalItems: Number(s.total_items) || 0,
        totalCost: Number(s.total_cost) || 0,
        items: (s.session_items || []).map(x => ({
            id: x.id,
            itemId: x.item_id,
            personId: x.person_id,
            name: x.item_name,
            purchaser: x.person_name,
            price: Number(x.price) || 0,
            quantity: Number(x.quantity) || 0,
            total: Number(x.total) || 0
        }))
    }));

    $("groupNameDisplay").textContent = group.name;
}

async function ensureDefaultItems() {
    if (items.length) return;

    const payload = DEFAULT_ITEMS.map(item => ({
        group_id: group.id,
        name: item.name,
        category: item.category,
        price: item.price
    }));

    const { error } = await supabase.from("items").insert(payload);
    if (error) throw error;
}

function renderAll() {
    renderPersonSelect();
    renderItemSelect();
    renderCurrent();
    renderHistory();
    updateSummaries();
    renderManageItems();
    renderManagePeople();
    updateAddState();
    iconRefresh();
}

function bindEvents() {
    personSelect.addEventListener("change", updateAddState);
    itemSelect.addEventListener("change", updateAddState);
    quantityInput.addEventListener("input", updateAddState);
    addToSessionBtn.addEventListener("click", addCurrent);

    sessionNameInput.addEventListener("input", () => {
        currentSessionName = sessionNameInput.value;
        localStorage.setItem("tapri_current_name_v2", currentSessionName);
    });

    saveSessionBtn.addEventListener("click", saveSession);
    $("addItemForm").addEventListener("submit", addItem);
    $("addPersonForm").addEventListener("submit", addPerson);
    $("manageItemsBtn").addEventListener("click", () => openModal("itemsModal", renderManageItems));
    $("managePeopleBtn").addEventListener("click", () => openModal("peopleModal", renderManagePeople));
    $("openSummaryBtn").addEventListener("click", () => openModal("summaryModal"));
    $("shareGroupBtn").addEventListener("click", () => openModal("groupModal", renderGroupModal));
    $("closeSummary").addEventListener("click", () => closeModal("summaryModal"));
    $("closeGroup").addEventListener("click", () => closeModal("groupModal"));
    $("saveGroupNameBtn").addEventListener("click", saveGroupName);
    $("copyGroupLinkBtn").addEventListener("click", copyGroupLink);

    $("summaryModal").addEventListener("click", e => { if (e.target.id === "summaryModal") closeModal("summaryModal"); });
    $("groupModal").addEventListener("click", e => { if (e.target.id === "groupModal") closeModal("groupModal"); });
    $("closeItems").addEventListener("click", () => closeModal("itemsModal"));
    $("closePeople").addEventListener("click", () => closeModal("peopleModal"));
    $("closeAddItem").addEventListener("click", () => closeModal("addItemModal"));
    $("closeAddPerson").addEventListener("click", () => closeModal("addPersonModal"));
    $("addItemFromManage").addEventListener("click", () => openModal("addItemModal"));
    $("addPersonFromManage").addEventListener("click", () => openModal("addPersonModal"));
    $("addItemModal").addEventListener("click", e => { if (e.target.id === "addItemModal") closeModal("addItemModal"); });
    $("itemsModal").addEventListener("click", e => { if (e.target.id === "itemsModal") closeModal("itemsModal"); });
    $("addPersonModal").addEventListener("click", e => { if (e.target.id === "addPersonModal") closeModal("addPersonModal"); });
    $("peopleModal").addEventListener("click", e => { if (e.target.id === "peopleModal") closeModal("peopleModal"); });
    sessionItems.addEventListener("click", handleCurrentClick);
    historyList.addEventListener("click", handleHistoryClick);
    $("historyPersonFilter").addEventListener("change", renderHistory);
    manageItemsList.addEventListener("click", handleItemManage);
    managePeopleList.addEventListener("click", handlePeopleManage);
    document.addEventListener("keydown", e => {
        if (e.key === "Escape") document.querySelectorAll(".modal-overlay.active").forEach(m => closeModal(m.id));
    });
}

function updateAddState() {
    const quantity = Number(quantityInput.value);
    addToSessionBtn.disabled = !(personSelect.value && itemSelect.value && Number.isSafeInteger(quantity) && quantity > 0);
}

function renderPersonSelect() {
    personSelect.innerHTML = `<option value="">Choose friend</option>` +
        people.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join("");
}

function renderItemSelect() {
    const groups = ["cigarette", "chai", "food", "other"];
    itemSelect.innerHTML = `<option value="">Choose item</option>` + groups.map(g => {
        const groupItems = items.filter(i => i.category === g);
        if (!groupItems.length) return "";
        return `<optgroup label="${categoryLabel(g)}">${groupItems.map(i =>
            `<option value="${esc(i.id)}">${esc(i.name)} — ${money(i.price)}</option>`
        ).join("")}</optgroup>`;
    }).join("");
}

function summarizeByPerson(entries) {
    const map = new Map();
    (entries || []).forEach(entry => {
        const personId = entry.personId || "unknown";
        const personName = personById(entry.personId)?.name || entry.purchaser || "Unknown";
        const total = Number(entry.quantity || 0) * (Number(entry.price) || 0);
        const value = map.get(personId) || {
            personId,
            personName,
            totalItems: 0,
            totalCost: 0,
            uniqueItems: new Set()
        };
        value.totalItems += Number(entry.quantity) || 0;
        value.totalCost += total;
        value.uniqueItems.add(String(entry.itemId));
        map.set(personId, value);
    });

    return Array.from(map.values()).map(item => ({
        personId: item.personId,
        personName: item.personName,
        totalItems: item.totalItems,
        totalCost: item.totalCost,
        uniqueItems: item.uniqueItems.size
    })).sort((a, b) => b.totalCost - a.totalCost);
}

function addCurrent() {
    if (!personSelect.value || !itemSelect.value) return;
    const quantity = Number(quantityInput.value);
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
        toast("Enter a whole quantity of 1 or more.");
        return;
    }

    const item = itemById(itemSelect.value);
    const person = personById(personSelect.value);
    if (!item || !person) return;

    const existing = Object.keys(current).find(k =>
        current[k].itemId === item.id && current[k].personId === person.id
    );

    if (existing) {
        current[existing].quantity += quantity;
    } else {
        const key = crypto.randomUUID();
        current[key] = {
            id: key,
            itemId: item.id,
            personId: person.id,
            name: item.name,
            price: Number(item.price),
            quantity
        };
    }

    current = Object.fromEntries(
        Object.entries(current).sort((a, b) => String(a[1].name).localeCompare(String(b[1].name)))
    );

    saveDraft();
    renderCurrent();
    updateSummaries();
    itemSelect.value = "";
    quantityInput.value = "1";
    updateAddState();
}

function renderCurrent() {
    const list = Object.values(current);

    if (!list.length) {
        sessionItems.innerHTML = `<div class="empty-state"><i data-lucide="shopping-bag"></i><p>Nothing added yet. Pick a friend and an item above.</p></div>`;
        iconRefresh();
        return;
    }

    const personSummary = summarizeByPerson(list);
    const summaryMarkup = personSummary.length ? `
        <div class="friend-summary">
            <div class="friend-summary-header">Friend summary</div>
            <div class="friend-summary-list">
                ${personSummary.map(person => `
                    <div class="friend-summary-pill">
                        <span class="friend-summary-name">${esc(person.personName)}</span>
                        <span class="friend-summary-meta">${person.totalItems} items · ${money(person.totalCost)}</span>
                    </div>
                `).join("")}
            </div>
        </div>
    ` : "";

    sessionItems.innerHTML = `${list.map(x => {
        const person = personById(x.personId)?.name || x.purchaser || "Unknown";
        return `<div class="session-item" data-id="${esc(x.id)}">
            <div class="session-item-info">
                <div class="session-item-name">${esc(x.name)}</div>
                <div class="session-item-meta"><span class="buyer-name">${esc(person)}</span><span class="buyer-dot"></span><span>${money(x.price)} each</span></div>
            </div>
            <div class="session-controls">
                <button class="quantity-btn" data-action="decrease" data-id="${esc(x.id)}" aria-label="Decrease"><i data-lucide="minus"></i></button>
                <span class="session-quantity">${x.quantity}</span>
                <button class="quantity-btn" data-action="increase" data-id="${esc(x.id)}" aria-label="Increase"><i data-lucide="plus"></i></button>
            </div>
            <div class="session-item-cost">${money(x.quantity * x.price)}</div>
        </div>`;
    }).join("")}${summaryMarkup}`;

    iconRefresh();
}

function handleCurrentClick(e) {
    const button = e.target.closest("[data-action]");
    if (!button) return;

    const x = current[button.dataset.id];
    if (!x) return;

    if (button.dataset.action === "increase") x.quantity++;
    else x.quantity--;

    if (x.quantity <= 0) delete current[button.dataset.id];

    saveDraft();
    renderCurrent();
    updateSummaries();
    animatePress(button);
}

function updateSummaries() {
    const values = Object.values(current);
    const total = values.reduce((s, x) => s + Number(x.quantity || 0), 0);
    const cost = values.reduce((s, x) => s + Number(x.quantity || 0) * Number(x.price || 0), 0);
    const friendCount = new Set(values.map(x => x.personId).filter(Boolean)).size;

    $("sessionTotalItems").textContent = total;
    $("sessionTotalCost").textContent = money(cost);
    $("sessionTotalPeople").textContent = friendCount;

    const todays = sessions.filter(s => today(s.date));
    const todayItems = todays.reduce((s, x) => s + Number(x.totalItems || 0), 0);
    const todayCost = todays.reduce((s, x) => s + Number(x.totalCost || 0), 0);
    const todayPeople = new Set(
        todays.flatMap(s => s.items || []).map(x => x.personId).filter(Boolean)
    ).size;

    $("todayItems").textContent = todayItems;
    $("todayCost").textContent = money(todayCost);
    $("todaySessions").textContent = todays.length;
    $("todayPeople").textContent = todayPeople;
}

async function saveSession() {
    const list = Object.values(current);
    if (!list.length) {
        toast("Add something to the session first.");
        return;
    }
    if (!group) return;

    saveSessionBtn.disabled = true;

    try {
        const totalItems = list.reduce((a, x) => a + Number(x.quantity || 0), 0);
        const totalCost = list.reduce((a, x) => a + Number(x.quantity || 0) * Number(x.price || 0), 0);
        const sessionName = currentSessionName.trim() || "Tapri session";

        const { data: session, error: sessionError } = await supabase
            .from("sessions")
            .insert({
                group_id: group.id,
                name: sessionName,
                session_date: new Date().toISOString(),
                total_items: totalItems,
                total_cost: totalCost
            })
            .select("id,name,session_date,total_items,total_cost")
            .single();

        if (sessionError) throw sessionError;

        const rows = list.map(x => ({
            session_id: session.id,
            item_id: x.itemId || null,
            person_id: x.personId || null,
            item_name: x.name,
            person_name: personById(x.personId)?.name || "Unknown",
            price: Number(x.price) || 0,
            quantity: Number(x.quantity) || 0
        }));

        const { error: itemError } = await supabase.from("session_items").insert(rows);
        if (itemError) {
            await supabase.from("sessions").delete().eq("id", session.id);
            throw itemError;
        }

        current = {};
        currentSessionName = "";
        sessionNameInput.value = "";
        clearDraft();

        await loadGroupData();
        renderAll();

        const old = saveSessionBtn.innerHTML;
        saveSessionBtn.innerHTML = `<i data-lucide="check"></i> Saved`;
        iconRefresh();
        setTimeout(() => {
            saveSessionBtn.innerHTML = old;
            saveSessionBtn.disabled = false;
            iconRefresh();
        }, 1100);
    } catch (error) {
        console.error(error);
        saveSessionBtn.disabled = false;
        toast(`Could not save: ${error.message}`);
    }
}

function historyPersonName(entry) {
    return personById(entry.personId)?.name || entry.purchaser || "Unknown";
}

function historyPersonKey(entry) {
    if (entry.personId) return `person:${entry.personId}`;
    const name = historyPersonName(entry);
    return `name:${name.toLowerCase()}`;
}

function renderHistoryFilter(list) {
    const filter = $("historyPersonFilter");
    const selected = filter.value;
    const names = new Map();

    list.forEach(session => (session.items || []).forEach(entry => {
        const key = historyPersonKey(entry);
        if (!names.has(key)) names.set(key, historyPersonName(entry));
    }));

    const options = Array.from(names, ([key, name]) => ({ key, name }))
        .sort((a, b) => a.name.localeCompare(b.name));

    filter.innerHTML = `<option value="">All friends</option>` +
        options.map(option => `<option value="${esc(option.key)}">${esc(option.name)}</option>`).join("");
    filter.hidden = options.length === 0;
    filter.value = names.has(selected) ? selected : "";
}

function renderHistory() {
    const list = sessions.filter(session => today(session.date));
    renderHistoryFilter(list);

    if (!list.length) {
        historyList.innerHTML = `<div class="empty-state"><i data-lucide="history"></i><p>No sessions saved today.</p></div>`;
        iconRefresh();
        return;
    }

    const selectedPerson = $("historyPersonFilter").value;
    const visibleSessions = list.map(session => ({
        session,
        entries: (session.items || []).filter(entry => !selectedPerson || historyPersonKey(entry) === selectedPerson)
    })).filter(session => session.entries.length);

    if (!visibleSessions.length) {
        historyList.innerHTML = `<div class="empty-state"><i data-lucide="filter"></i><p>No sessions for this friend today.</p></div>`;
        iconRefresh();
        return;
    }

    historyList.innerHTML = visibleSessions.map(({ session, entries }) => {
        const dateTime = new Date(session.date).toLocaleString([], {
            dateStyle: "long",
            timeStyle: "short"
        });

        const groups = new Map();
        entries.forEach(entry => {
            const key = historyPersonKey(entry);
            if (!groups.has(key)) groups.set(key, {
                name: historyPersonName(entry),
                entries: []
            });
            groups.get(key).entries.push(entry);
        });

        const groupMarkup = Array.from(groups.values())
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(groupData => {
                const itemCount = groupData.entries.reduce((total, entry) => total + (Number(entry.quantity) || 0), 0);
                const totalCost = groupData.entries.reduce((total, entry) =>
                    total + Number(entry.total ?? ((Number(entry.quantity) || 0) * (Number(entry.price) || 0))), 0
                );
                const initial = groupData.name.trim().charAt(0).toUpperCase() || "?";

                return `<section class="history-person-group">
                    <div class="history-person-heading">
                        <div class="history-person-title"><span class="history-person-avatar" aria-hidden="true">${esc(initial)}</span><strong>${esc(groupData.name)}</strong></div>
                        <span class="history-person-total">${itemCount} items · ${money(totalCost)}</span>
                    </div>
                    ${groupData.entries.map(entry => {
                        const lineTotal = Number(entry.total ?? ((Number(entry.quantity) || 0) * (Number(entry.price) || 0)));
                        return `<div class="history-cigarette"><div class="history-cigarette-info"><span>${esc(entry.name)} × ${Number(entry.quantity) || 0}</span></div><span>${money(lineTotal)}</span></div>`;
                    }).join("")}
                </section>`;
            }).join("");

        const itemCount = entries.reduce((total, entry) => total + (Number(entry.quantity) || 0), 0);
        const totalCost = entries.reduce((total, entry) =>
            total + Number(entry.total ?? ((Number(entry.quantity) || 0) * (Number(entry.price) || 0))), 0
        );

        return `<article class="history-card" data-session-id="${esc(session.id)}">
            <div class="history-head">
                <div><span class="history-session-name">${esc(session.name?.trim() || "Unnamed session")}</span><span class="history-time">${esc(dateTime)}</span></div>
                <button class="icon-btn danger-icon delete-session-btn" data-delete-session="${esc(session.id)}" aria-label="Delete session"><i data-lucide="trash-2"></i></button>
            </div>
            ${groupMarkup}
            <div class="history-total"><span>${selectedPerson ? "Friend total" : "Bill total"} · ${itemCount} items</span><strong>${money(totalCost)}</strong></div>
        </article>`;
    }).join("");

    iconRefresh();
}

async function handleHistoryClick(e) {
    const button = e.target.closest("[data-delete-session]");
    if (!button) return;

    const sessionId = button.dataset.deleteSession;
    if (!confirm("Delete this saved session? This cannot be undone.")) return;

    button.disabled = true;

    try {
        const { error } = await supabase.from("sessions").delete().eq("id", sessionId);
        if (error) throw error;
        sessions = sessions.filter(s => s.id !== sessionId);
        renderHistory();
        updateSummaries();
        toast("Session deleted");
    } catch (error) {
        console.error(error);
        button.disabled = false;
        toast(`Could not delete: ${error.message}`);
    }
}

async function addItem(e) {
    e.preventDefault();

    const name = $("itemName").value.trim();
    const category = $("itemCategory").value;
    const price = Number($("itemPrice").value);

    if (!name || !Number.isFinite(price) || price < 0) {
        toast("Enter a valid item name and price.");
        return;
    }

    if (items.some(x => x.name.toLowerCase() === name.toLowerCase())) {
        toast("That item already exists.");
        return;
    }

    try {
        const { data, error } = await supabase
            .from("items")
            .insert({
                group_id: group.id,
                name,
                category,
                price
            })
            .select("id,group_id,name,category,price,created_at,updated_at")
            .single();

        if (error) throw error;

        items.push(data);
        e.target.reset();
        closeModal("addItemModal");
        renderItemSelect();
        renderManageItems();
        toast("Item added");
    } catch (error) {
        console.error(error);
        toast(`Could not add item: ${error.message}`);
    }
}

function renderManageItems() {
    if (!items.length) {
        manageItemsList.innerHTML = `<div class="empty-state"><i data-lucide="package"></i><p>No items saved.</p></div>`;
        iconRefresh();
        return;
    }

    manageItemsList.innerHTML = items.map(x => `<div class="manage-cigarette" data-id="${esc(x.id)}">
        <div class="manage-cigarette-main"><div><div class="manage-cigarette-name">${esc(x.name)}</div><div class="manage-cigarette-price">${categoryLabel(x.category)} · ${money(x.price)}</div></div><button class="manage-expand-btn" data-toggle-settings="${esc(x.id)}" aria-expanded="false"><i data-lucide="chevron-down"></i></button></div>
        <div class="manage-settings"><label class="manage-settings-label">Item name</label><input class="manage-name" value="${esc(x.name)}" data-id="${esc(x.id)}">
        <label class="manage-settings-label">Category</label><select class="manage-category" data-id="${esc(x.id)}"><option value="cigarette" ${x.category === "cigarette" ? "selected" : ""}>Cigarette</option><option value="chai" ${x.category === "chai" ? "selected" : ""}>Chai</option><option value="food" ${x.category === "food" ? "selected" : ""}>Food</option><option value="other" ${x.category === "other" ? "selected" : ""}>Other</option></select>
        <label class="manage-settings-label">Default price</label><div class="price-field"><span>₹</span><input class="manage-price" type="number" min="0" step="0.01" value="${esc(x.price)}" data-id="${esc(x.id)}"></div>
        <div class="manage-settings-actions"><button class="manage-save-btn" data-save-item="${esc(x.id)}"><i data-lucide="check"></i> Save</button><button class="manage-delete-btn" data-delete-item="${esc(x.id)}"><i data-lucide="trash-2"></i> Delete</button></div></div>
    </div>`).join("");

    iconRefresh();
}

function handleItemManage(e) {
    const toggle = e.target.closest("[data-toggle-settings]");
    if (toggle) {
        const row = toggle.closest(".manage-cigarette");
        const open = row.classList.contains("open");
        document.querySelectorAll("#manageItemsList .manage-cigarette.open").forEach(r => {
            if (r !== row) animateAccordion(r, false);
        });
        toggle.setAttribute("aria-expanded", String(!open));
        animateAccordion(row, !open);
        return;
    }

    const saveButton = e.target.closest("[data-save-item]");
    if (saveButton) {
        saveItem(saveButton.dataset.saveItem);
        return;
    }

    const deleteButton = e.target.closest("[data-delete-item]");
    if (deleteButton) deleteItem(deleteButton.dataset.deleteItem);
}

async function saveItem(itemId) {
    const row = manageItemsList.querySelector(`[data-id="${CSS.escape(itemId)}"]`);
    const item = itemById(itemId);
    if (!row || !item) return;

    const name = row.querySelector(".manage-name").value.trim();
    const category = row.querySelector(".manage-category").value;
    const price = Number(row.querySelector(".manage-price").value);

    if (!name || !Number.isFinite(price) || price < 0) {
        toast("Enter valid item details.");
        return;
    }

    if (items.some(i => i.id !== itemId && i.name.toLowerCase() === name.toLowerCase())) {
        toast("That item name already exists.");
        return;
    }

    try {
        const { data, error } = await supabase
            .from("items")
            .update({ name, category, price })
            .eq("id", itemId)
            .select("id,group_id,name,category,price,created_at,updated_at")
            .single();

        if (error) throw error;

        Object.assign(item, data);
        Object.values(current).forEach(c => {
            if (c.itemId === itemId) {
                c.name = name;
                // Keep the current session's price as a snapshot.
            }
        });

        saveDraft();
        renderItemSelect();
        renderCurrent();
        renderManageItems();
        updateSummaries();
        toast("Item updated");
    } catch (error) {
        console.error(error);
        toast(`Could not update item: ${error.message}`);
    }
}

async function deleteItem(itemId) {
    const item = itemById(itemId);
    if (!item) return;
    if (!confirm(`Delete "${item.name}"?`)) return;

    try {
        const { error } = await supabase.from("items").delete().eq("id", itemId);
        if (error) throw error;

        items = items.filter(x => x.id !== itemId);
        Object.keys(current).forEach(key => {
            if (current[key].itemId === itemId) delete current[key];
        });

        saveDraft();
        renderItemSelect();
        renderCurrent();
        renderManageItems();
        updateSummaries();
        toast("Item deleted");
    } catch (error) {
        console.error(error);
        toast(`Could not delete item: ${error.message}`);
    }
}

async function addPerson(e) {
    e.preventDefault();

    const name = $("personName").value.trim();
    if (!name) {
        toast("Enter a name.");
        return;
    }

    if (people.some(p => p.name.toLowerCase() === name.toLowerCase())) {
        toast("That friend already exists.");
        return;
    }

    try {
        const { data, error } = await supabase
            .from("people")
            .insert({ group_id: group.id, name })
            .select("id,group_id,name,created_at")
            .single();

        if (error) throw error;

        people.push(data);
        people.sort((a, b) => a.name.localeCompare(b.name));
        e.target.reset();
        closeModal("addPersonModal");
        renderPersonSelect();
        renderManagePeople();
        toast("Friend added");
    } catch (error) {
        console.error(error);
        toast(`Could not add friend: ${error.message}`);
    }
}

function renderManagePeople() {
    if (!people.length) {
        managePeopleList.innerHTML = `<div class="empty-state"><i data-lucide="users"></i><p>No friends saved yet.</p></div>`;
        iconRefresh();
        return;
    }

    managePeopleList.innerHTML = people.map(p => `<div class="manage-cigarette" data-person-id="${esc(p.id)}">
        <div class="manage-cigarette-main"><div><div class="manage-cigarette-name">${esc(p.name)}</div><div class="manage-cigarette-price">Friend</div></div><button class="manage-expand-btn" data-toggle-person="${esc(p.id)}" aria-expanded="false"><i data-lucide="chevron-down"></i></button></div><div class="manage-settings"><label class="manage-settings-label">Name</label><input class="manage-name" value="${esc(p.name)}"><div class="manage-settings-actions"><button class="manage-save-btn" data-save-person="${esc(p.id)}"><i data-lucide="check"></i> Save</button><button class="manage-delete-btn" data-delete-person="${esc(p.id)}"><i data-lucide="trash-2"></i> Delete</button></div></div></div>`).join("");
    iconRefresh();
}

function handlePeopleManage(e) {
    const toggle = e.target.closest("[data-toggle-person]");
    if (toggle) {
        const row = toggle.closest(".manage-cigarette");
        const open = row.classList.contains("open");
        document.querySelectorAll("#managePeopleList .manage-cigarette.open").forEach(r => {
            if (r !== row) animateAccordion(r, false);
        });
        toggle.setAttribute("aria-expanded", String(!open));
        animateAccordion(row, !open);
        return;
    }

    const saveButton = e.target.closest("[data-save-person]");
    if (saveButton) {
        savePerson(saveButton.dataset.savePerson);
        return;
    }

    const deleteButton = e.target.closest("[data-delete-person]");
    if (deleteButton) deletePerson(deleteButton.dataset.deletePerson);
}

async function savePerson(personId) {
    const row = managePeopleList.querySelector(`[data-person-id="${CSS.escape(personId)}"]`);
    const person = personById(personId);
    if (!row || !person) return;

    const name = row.querySelector(".manage-name").value.trim();
    if (!name) {
        toast("Name cannot be empty.");
        return;
    }

    if (people.some(x => x.id !== personId && x.name.toLowerCase() === name.toLowerCase())) {
        toast("That friend already exists.");
        return;
    }

    try {
        const { data, error } = await supabase
            .from("people")
            .update({ name })
            .eq("id", personId)
            .select("id,group_id,name,created_at")
            .single();

        if (error) throw error;

        Object.assign(person, data);
        renderPersonSelect();
        renderManagePeople();
        renderCurrent();
        renderHistory();
        updateSummaries();
        toast("Friend updated");
    } catch (error) {
        console.error(error);
        toast(`Could not update friend: ${error.message}`);
    }
}

async function deletePerson(personId) {
    const person = personById(personId);
    if (!person) return;
    if (!confirm(`Delete "${person.name}"?`)) return;

    try {
        const { error } = await supabase.from("people").delete().eq("id", personId);
        if (error) throw error;

        people = people.filter(x => x.id !== personId);
        Object.keys(current).forEach(key => {
            if (current[key].personId === personId) delete current[key];
        });

        saveDraft();
        renderPersonSelect();
        renderCurrent();
        renderManagePeople();
        updateSummaries();
        toast("Friend deleted");
    } catch (error) {
        console.error(error);
        toast(`Could not delete friend: ${error.message}`);
    }
}

function renderGroupModal() {
    $("groupNameInput").value = group?.name || "";
    $("groupLinkInput").value = group ? groupLink() : "";
}

async function saveGroupName() {
    const name = $("groupNameInput").value.trim();
    if (!name) {
        toast("Enter a group name.");
        return;
    }

    try {
        const { data, error } = await supabase
            .from("groups")
            .update({ name })
            .eq("id", group.id)
            .select("id,name,created_by,created_at")
            .single();

        if (error) throw error;
        group = data;
        $("groupNameDisplay").textContent = group.name;
        renderGroupModal();
        toast("Group name updated");
    } catch (error) {
        console.error(error);
        toast(`Could not update group: ${error.message}`);
    }
}

async function copyGroupLink() {
    try {
        await navigator.clipboard.writeText(groupLink());
        toast("Group link copied");
    } catch {
        $("groupLinkInput").select();
        document.execCommand("copy");
        toast("Group link copied");
    }
}

function showFatalError(message) {
    const html = `<div class="empty-state" style="margin:24px 0"><i data-lucide="triangle-alert"></i><p>${esc(message)}</p><p style="margin-top:8px">Check Supabase Anonymous Sign-Ins, your Project URL, Publishable key, and RLS policies.</p></div>`;
    sessionItems.innerHTML = html;
    historyList.innerHTML = "";
    addToSessionBtn.disabled = true;
    saveSessionBtn.disabled = true;
    iconRefresh();
}

function openModal(id, render) {
    document.querySelectorAll(".modal-overlay.active").forEach(m => {
        if (m.id !== id) closeModal(m.id);
    });
    if (render) render();
    const modal = $(id);
    if (!modal) return;
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    const panel = modal.querySelector(".modal");
    panel?.focus?.();
}

function closeModal(id) {
    const modal = $(id);
    if (!modal) return;
    const panel = modal.querySelector(".modal");
    if (!modal.classList.contains("active")) return;
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    panel?.blur?.();
}

function animatePress(el) {
    if (!el) return;
    el.style.transform = "scale(0.96)";
    clearTimeout(el._tapTimer);
    el._tapTimer = setTimeout(() => { el.style.transform = ""; }, 120);
}

function animateAccordion(row, open) {
    const box = row.querySelector(".manage-settings");
    if (!box) return;
    row.classList.toggle("open", open);
    box.style.display = open ? "block" : "none";
}

function toast(message) {
    let t = document.querySelector(".toast");
    if (!t) {
        t = document.createElement("div");
        t.className = "toast";
        document.body.appendChild(t);
    }
    t.textContent = message;
    t.classList.add("show");
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove("show"), 1800);
}

init();
