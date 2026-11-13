/* TAPRI — vanilla JS + localStorage + GSAP */
const KEY = {
    items: "tapri_items_v1",
    people: "tapri_people_v1",
    current: "tapri_current_v1",
    sessions: "tapri_sessions_v1",
    migrated: "tapri_migrated_v1"
};

const DEFAULT_ITEMS = [
    { id: "double-switch", name: "Double Switch", category: "cigarette", price: 28 },
    { id: "connect", name: "Connect", category: "cigarette", price: 28 },
    { id: "blue-advance", name: "Blue Advance", category: "cigarette", price: 28 },
    { id: "advance", name: "Advance", category: "cigarette", price: 28 },
    { id: "saunf-crush", name: "Saunf Crush", category: "cigarette", price: 15 },
    { id: "chai", name: "Chai", category: "chai", price: 15 },
    { id: "maggi", name: "Maggi", category: "food", price: 50 }
];

let items = load(KEY.items, []);
let people = load(KEY.people, []);
let current = load(KEY.current, {});
let sessions = load(KEY.sessions, []);

const $ = id => document.getElementById(id);
const personSelect = $("personSelect");
const itemSelect = $("itemSelect");
const addToSessionBtn = $("addToSessionBtn");
const sessionItems = $("sessionItems");
const saveSessionBtn = $("saveSessionBtn");
const historyList = $("historyList");
const manageItemsList = $("manageItemsList");
const managePeopleList = $("managePeopleList");

const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const hasGSAP = typeof gsap !== "undefined" && !reduced;

function load(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? structuredClone(fallback); }
    catch { return structuredClone(fallback); }
}
function save(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function id() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function money(n) { const v = Number(n) || 0; return "₹" + v.toLocaleString("en-IN", { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }); }
function esc(v) { const d = document.createElement("div"); d.textContent = String(v ?? ""); return d.innerHTML; }
function today(date) { const d = new Date(date), n = new Date(); return d.getFullYear()===n.getFullYear() && d.getMonth()===n.getMonth() && d.getDate()===n.getDate(); }
function iconRefresh() { window.lucide?.createIcons?.(); }
function itemById(x) { return items.find(i => i.id === x); }
function personById(x) { return people.find(p => p.id === x); }
function categoryLabel(c) { return ({ cigarette:"Cigarette", chai:"Chai", food:"Food", other:"Other" })[c] || "Other"; }

function migrate() {
    // Import old cigarette tracker data once.
    const oldItems = load("cigaretteTracker_cigarettes", []);
    if (!items.length && oldItems.length) {
        items = oldItems.map(x => ({ ...x, category: "cigarette" }));
    }
    DEFAULT_ITEMS.forEach(d => {
        if (!items.some(x => x.id === d.id)) items.push(structuredClone(d));
    });

    const oldCurrent = load("cigaretteTracker_currentSession", {});
    if (!Object.keys(current).length && Object.keys(oldCurrent).length) {
        Object.values(oldCurrent).forEach(x => {
            const itemId = x.cigaretteId || x.id;
            const personName = String(x.purchaser || "").trim();
            let person = people.find(p => p.name.toLowerCase() === personName.toLowerCase());
            if (personName && !person) { person = { id: id(), name: personName }; people.push(person); }
            const key = id();
            current[key] = { id:key, itemId, personId:person?.id || "", name:x.name, price:Number(x.price)||0, quantity:Number(x.quantity)||0 };
        });
    }
    const oldSessions = load("cigaretteTracker_sessions", []);
    if (!sessions.length && oldSessions.length) {
        sessions = oldSessions.map(s => ({
            ...s,
            items: (s.cigarettes || []).map(c => {
                let person = people.find(p => p.name.toLowerCase() === String(c.purchaser||"").toLowerCase());
                if (c.purchaser && !person) { person = { id:id(), name:c.purchaser }; people.push(person); }
                return { id:id(), itemId:c.id, name:c.name, personId:person?.id||"", purchaser:c.purchaser||"", price:c.price, quantity:c.quantity, total:c.total };
            })
        }));
    }
    save(KEY.items, items); save(KEY.people, people); save(KEY.current, current); save(KEY.sessions, sessions);
    localStorage.setItem(KEY.migrated, "1");
}

function init() {
    migrate();
    renderPersonSelect(); renderItemSelect(); renderCurrent(); renderHistory(); updateSummaries(); renderManageItems(); renderManagePeople(); iconRefresh();
    bindEvents();
    if (hasGSAP) gsap.from(".app-header, .today-card, .section", { y:14, opacity:0, duration:.35, stagger:.07, ease:"power2.out", clearProps:"transform" });
}

function bindEvents() {
    personSelect.addEventListener("change", updateAddState);
    itemSelect.addEventListener("change", updateAddState);
    addToSessionBtn.addEventListener("click", addCurrent);
    saveSessionBtn.addEventListener("click", saveSession);
    $("addItemForm").addEventListener("submit", addItem);
    $("addPersonForm").addEventListener("submit", addPerson);
    $("manageItemsBtn").addEventListener("click", () => openModal("itemsModal", renderManageItems));
    $("managePeopleBtn").addEventListener("click", () => openModal("peopleModal", renderManagePeople));
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
    manageItemsList.addEventListener("click", handleItemManage);
    managePeopleList.addEventListener("click", handlePeopleManage);
    $("addItemModal").querySelector("form").addEventListener("submit", () => setTimeout(() => { renderItemSelect(); renderManageItems(); }, 0));
    document.addEventListener("keydown", e => { if (e.key === "Escape") document.querySelectorAll(".modal-overlay.active").forEach(m => closeModal(m.id)); });
}

function updateAddState() { addToSessionBtn.disabled = !(personSelect.value && itemSelect.value); }

function renderPersonSelect() {
    personSelect.innerHTML = `<option value="">Choose friend</option>` + people.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join("");
}
function renderItemSelect() {
    const groups = ["cigarette","chai","food","other"];
    itemSelect.innerHTML = `<option value="">Choose item</option>` + groups.map(g => {
        const group = items.filter(i => i.category === g);
        if (!group.length) return "";
        return `<optgroup label="${categoryLabel(g)}">${group.map(i => `<option value="${esc(i.id)}">${esc(i.name)} — ${money(i.price)}</option>`).join("")}</optgroup>`;
    }).join("");
}

function addCurrent() {
    if (!personSelect.value || !itemSelect.value) return;
    const item = itemById(itemSelect.value), person = personById(personSelect.value);
    const existing = Object.keys(current).find(k => current[k].itemId === item.id && current[k].personId === person.id);
    if (existing) current[existing].quantity++;
    else { const k=id(); current[k]={ id:k, itemId:item.id, personId:person.id, name:item.name, price:Number(item.price), quantity:1 }; }
    save(KEY.current,current); renderCurrent(); updateSummaries();
    itemSelect.value=""; updateAddState();
}

function renderCurrent() {
    const list = Object.values(current);
    if (!list.length) {
        sessionItems.innerHTML = `<div class="empty-state"><i data-lucide="shopping-bag"></i><p>Nothing added yet. Pick a friend and an item above.</p></div>`;
        iconRefresh(); return;
    }
    sessionItems.innerHTML = list.map(x => {
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
            <div class="session-item-cost">${money(x.quantity*x.price)}</div>
        </div>`;
    }).join("");
    iconRefresh(); animateList(sessionItems,".session-item");
}

function handleCurrentClick(e) {
    const b=e.target.closest("[data-action]"); if(!b)return;
    const x=current[b.dataset.id]; if(!x)return;
    if(b.dataset.action==="increase") x.quantity++;
    else x.quantity--;
    if(x.quantity<=0) delete current[b.dataset.id];
    save(KEY.current,current); renderCurrent(); updateSummaries(); animatePress(b);
}

function updateSummaries() {
    const values=Object.values(current);
    const total=values.reduce((s,x)=>s+x.quantity,0);
    const cost=values.reduce((s,x)=>s+x.quantity*x.price,0);
    const friendCount=new Set(values.map(x=>x.personId).filter(Boolean)).size;
    $("sessionTotalItems").textContent=total;
    $("sessionTotalCost").textContent=money(cost);
    $("sessionTotalPeople").textContent=friendCount;
    const todays=sessions.filter(s=>today(s.date));
    const todayItems=todays.reduce((s,x)=>s+x.totalItems,0);
    const todayCost=todays.reduce((s,x)=>s+x.totalCost,0);
    const todayPeople=new Set(todays.flatMap(s=>s.items.map(x=>x.personId)).filter(Boolean)).size;
    $("todayItems").textContent=todayItems;
    $("todayCost").textContent=money(todayCost);
    $("todaySessions").textContent=todays.length;
    $("todayPeople").textContent=todayPeople;
    ["sessionTotalItems","sessionTotalCost","sessionTotalPeople","todayItems","todayCost","todaySessions","todayPeople"].forEach(k=>animateValue($(k)));
}

function saveSession() {
    const list=Object.values(current); if(!list.length){ toast("Add something to the session first."); return; }
    const s={ id:id(), date:new Date().toISOString(), items:list.map(x=>({id:id(),itemId:x.itemId,name:x.name,personId:x.personId,purchaser:personById(x.personId)?.name||"",price:x.price,quantity:x.quantity,total:x.quantity*x.price})), totalItems:list.reduce((a,x)=>a+x.quantity,0), totalCost:list.reduce((a,x)=>a+x.quantity*x.price,0) };
    sessions.unshift(s); current={}; save(KEY.sessions,sessions); save(KEY.current,current); renderCurrent(); renderHistory(); updateSummaries();
    const old=saveSessionBtn.innerHTML; saveSessionBtn.innerHTML=`<i data-lucide="check"></i> Saved`; saveSessionBtn.disabled=true; iconRefresh(); setTimeout(()=>{saveSessionBtn.innerHTML=old;saveSessionBtn.disabled=false;iconRefresh()},1100);
}

function renderHistory() {
    const list=sessions.filter(s=>today(s.date));
    if(!list.length){ historyList.innerHTML=`<div class="empty-state"><i data-lucide="history"></i><p>No sessions saved today.</p></div>`; iconRefresh(); return; }
    historyList.innerHTML=list.map(s=>{
        const time=new Date(s.date).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
        return `<article class="history-card" data-session-id="${esc(s.id)}">
            <div class="history-head"><div><span class="history-time">${time}</span><span class="history-count">${s.totalItems} items · ${money(s.totalCost)}</span></div>
            <button class="icon-btn danger-icon delete-session-btn" data-delete-session="${esc(s.id)}" aria-label="Delete session"><i data-lucide="trash-2"></i></button></div>
            <div class="history-lines">${s.items.map(x=>`<div class="history-cigarette"><div class="history-cigarette-info"><span>${esc(x.name)} × ${x.quantity}</span><div class="history-buyer">${esc(x.purchaser || personById(x.personId)?.name || "Unknown")}</div></div><span>${money(x.total)}</span></div>`).join("")}</div>
            <div class="history-total"><span>${s.items.length} different items</span><strong>${money(s.totalCost)}</strong></div>
        </article>`;
    }).join(""); iconRefresh(); animateList(historyList,".history-card");
}

function handleHistoryClick(e) {
    const b=e.target.closest("[data-delete-session]"); if(!b)return;
    const sessionId=b.dataset.deleteSession;
    if(!confirm("Delete this saved session? This cannot be undone.")) return;
    sessions=sessions.filter(s=>s.id!==sessionId); save(KEY.sessions,sessions); renderHistory(); updateSummaries();
}

function addItem(e) {
    e.preventDefault(); const name=$("itemName").value.trim(); const category=$("itemCategory").value; const price=Number($("itemPrice").value);
    if(!name || !Number.isFinite(price) || price<0){toast("Enter a valid item name and price.");return;}
    if(items.some(x=>x.name.toLowerCase()===name.toLowerCase())){toast("That item already exists.");return;}
    items.push({id:id(),name,category,price}); save(KEY.items,items); e.target.reset(); closeModal("addItemModal"); renderItemSelect(); renderManageItems(); toast("Item added");
}

function renderManageItems() {
    if(!items.length){manageItemsList.innerHTML=`<div class="empty-state"><i data-lucide="package"></i><p>No items saved.</p></div>`;iconRefresh();return;}
    manageItemsList.innerHTML=items.map(x=>`<div class="manage-cigarette" data-id="${esc(x.id)}">
        <div class="manage-cigarette-main"><div><div class="manage-cigarette-name">${esc(x.name)}</div><div class="manage-cigarette-price">${categoryLabel(x.category)} · ${money(x.price)}</div></div><button class="manage-expand-btn" data-toggle-settings="${esc(x.id)}" aria-expanded="false"><i data-lucide="chevron-down"></i></button></div>
        <div class="manage-settings"><label class="manage-settings-label">Item name</label><input class="manage-name" value="${esc(x.name)}" data-id="${esc(x.id)}">
        <label class="manage-settings-label">Category</label><select class="manage-category" data-id="${esc(x.id)}"><option value="cigarette" ${x.category==="cigarette"?"selected":""}>Cigarette</option><option value="chai" ${x.category==="chai"?"selected":""}>Chai</option><option value="food" ${x.category==="food"?"selected":""}>Food</option><option value="other" ${x.category==="other"?"selected":""}>Other</option></select>
        <label class="manage-settings-label">Default price</label><div class="price-field"><span>₹</span><input class="manage-price" type="number" min="0" step="0.01" value="${x.price}" data-id="${esc(x.id)}"></div>
        <div class="manage-settings-actions"><button class="manage-save-btn" data-save-item="${esc(x.id)}"><i data-lucide="check"></i> Save</button><button class="manage-delete-btn" data-delete-item="${esc(x.id)}"><i data-lucide="trash-2"></i> Delete</button></div></div>
    </div>`).join(""); iconRefresh();
}
function handleItemManage(e){
    const t=e.target.closest("[data-toggle-settings]");
    if(t){const row=t.closest(".manage-cigarette"), open=row.classList.contains("open"); document.querySelectorAll("#manageItemsList .manage-cigarette.open").forEach(r=>{if(r!==row)animateAccordion(r,false)}); t.setAttribute("aria-expanded",String(!open)); animateAccordion(row,!open); return;}
    const s=e.target.closest("[data-save-item]"); if(s){saveItem(s.dataset.saveItem);return;}
    const d=e.target.closest("[data-delete-item]"); if(d){deleteItem(d.dataset.deleteItem);}
}
function saveItem(itemId){const row=manageItemsList.querySelector(`[data-id="${CSS.escape(itemId)}"]`), x=itemById(itemId);if(!row||!x)return;const name=row.querySelector(".manage-name").value.trim(),category=row.querySelector(".manage-category").value,price=Number(row.querySelector(".manage-price").value);if(!name||!Number.isFinite(price)||price<0){toast("Enter valid item details.");return;}if(items.some(i=>i.id!==itemId&&i.name.toLowerCase()===name.toLowerCase())){toast("That item name already exists.");return;}x.name=name;x.category=category;x.price=price;Object.values(current).forEach(c=>{if(c.itemId===itemId)c.name=name;});save(KEY.items,items);save(KEY.current,current);renderItemSelect();renderCurrent();renderManageItems();updateSummaries();toast("Item updated");}
function deleteItem(itemId){const x=itemById(itemId);if(!x)return;if(!confirm(`Delete "${x.name}"?`))return;items=items.filter(i=>i.id!==itemId);Object.keys(current).forEach(k=>{if(current[k].itemId===itemId)delete current[k]});save(KEY.items,items);save(KEY.current,current);renderItemSelect();renderCurrent();renderManageItems();updateSummaries();toast("Item deleted");}

function addPerson(e){e.preventDefault();const name=$("personName").value.trim();if(!name){toast("Enter a name.");return;}if(people.some(p=>p.name.toLowerCase()===name.toLowerCase())){toast("That friend already exists.");return;}people.push({id:id(),name});save(KEY.people,people);e.target.reset();closeModal("addPersonModal");renderPersonSelect();renderManagePeople();toast("Friend added");}
function renderManagePeople(){if(!people.length){managePeopleList.innerHTML=`<div class="empty-state"><i data-lucide="users"></i><p>No friends saved yet.</p></div>`;iconRefresh();return;}managePeopleList.innerHTML=people.map(p=>`<div class="manage-cigarette" data-person-id="${esc(p.id)}"><div class="manage-cigarette-main"><div><div class="manage-cigarette-name">${esc(p.name)}</div><div class="manage-cigarette-price">Friend</div></div><button class="manage-expand-btn" data-toggle-person="${esc(p.id)}" aria-expanded="false"><i data-lucide="chevron-down"></i></button></div><div class="manage-settings"><label class="manage-settings-label">Name</label><input class="manage-name" value="${esc(p.name)}"><div class="manage-settings-actions"><button class="manage-save-btn" data-save-person="${esc(p.id)}"><i data-lucide="check"></i> Save</button><button class="manage-delete-btn" data-delete-person="${esc(p.id)}"><i data-lucide="trash-2"></i> Delete</button></div></div></div>`).join("");iconRefresh();}
function handlePeopleManage(e){const t=e.target.closest("[data-toggle-person]");if(t){const row=t.closest(".manage-cigarette"),open=row.classList.contains("open");document.querySelectorAll("#managePeopleList .manage-cigarette.open").forEach(r=>{if(r!==row)animateAccordion(r,false)});t.setAttribute("aria-expanded",String(!open));animateAccordion(row,!open);return;}const s=e.target.closest("[data-save-person]");if(s){savePerson(s.dataset.savePerson);return;}const d=e.target.closest("[data-delete-person]");if(d){deletePerson(d.dataset.deletePerson);}}
function savePerson(personId){const row=managePeopleList.querySelector(`[data-person-id="${CSS.escape(personId)}"]`),p=personById(personId);if(!row||!p)return;const name=row.querySelector(".manage-name").value.trim();if(!name){toast("Name cannot be empty.");return;}if(people.some(x=>x.id!==personId&&x.name.toLowerCase()===name.toLowerCase())){toast("That friend already exists.");return;}p.name=name;save(KEY.people,people);renderPersonSelect();renderManagePeople();renderHistory();toast("Friend updated");}
function deletePerson(personId){const p=personById(personId);if(!p)return;if(!confirm(`Delete "${p.name}"?`))return;people=people.filter(x=>x.id!==personId);Object.keys(current).forEach(k=>{if(current[k].personId===personId)delete current[k]});save(KEY.people,people);save(KEY.current,current);renderPersonSelect();renderCurrent();renderManagePeople();updateSummaries();toast("Friend deleted");}

function openModal(id, render){if(render)render();const m=$(id);m.classList.add("active");m.setAttribute("aria-hidden","false");const panel=m.querySelector(".modal");if(hasGSAP){gsap.fromTo(m,{opacity:0},{opacity:1,duration:.16});gsap.fromTo(panel,{y:24,opacity:0,scale:.99},{y:0,opacity:1,scale:1,duration:.25,ease:"power2.out"});}else panel.focus?.();}
function closeModal(id){const m=$(id),panel=m.querySelector(".modal");if(!m.classList.contains("active"))return;if(hasGSAP){gsap.to(panel,{y:16,opacity:0,duration:.16,ease:"power2.in"});gsap.to(m,{opacity:0,duration:.18,onComplete:()=>{m.classList.remove("active");m.setAttribute("aria-hidden","true");}});}else{m.classList.remove("active");m.setAttribute("aria-hidden","true");}}
function animateList(container, selector){if(!hasGSAP)return;gsap.fromTo(container.querySelectorAll(selector),{y:8,opacity:0},{y:0,opacity:1,duration:.22,stagger:.025,ease:"power2.out",clearProps:"transform"});}
function animateValue(el){if(hasGSAP)gsap.fromTo(el,{y:-3,opacity:.55},{y:0,opacity:1,duration:.18,ease:"power2.out"});}
function animatePress(el){if(hasGSAP)gsap.timeline().to(el,{scale:.94,duration:.06}).to(el,{scale:1,duration:.14,ease:"back.out(2)"});}
function animateAccordion(row,open){const box=row.querySelector(".manage-settings");if(!box)return;if(!hasGSAP){row.classList.toggle("open",open);return;}if(open){row.classList.add("open");gsap.fromTo(box,{height:0,opacity:0},{height:"auto",opacity:1,duration:.22,ease:"power2.out",clearProps:"height"});}else{gsap.to(box,{height:0,opacity:0,duration:.17,ease:"power2.in",onComplete:()=>{row.classList.remove("open");gsap.set(box,{clearProps:"height,opacity"})}});}}
function toast(message){let t=document.querySelector(".toast");if(!t){t=document.createElement("div");t.className="toast";document.body.appendChild(t);}t.textContent=message;t.classList.add("show");if(hasGSAP){gsap.fromTo(t,{y:10,opacity:0},{y:0,opacity:1,duration:.18});}clearTimeout(t._timer);t._timer=setTimeout(()=>{if(hasGSAP)gsap.to(t,{y:6,opacity:0,duration:.16,onComplete:()=>t.classList.remove("show")});else t.classList.remove("show")},1300);}

init();
