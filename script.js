/* =========================================================
   CIGARETTE TRACKER
   Vanilla JavaScript
   ========================================================= */

/* =========================================================
   1. STORAGE
   ========================================================= */

const STORAGE_KEYS = {
    cigarettes: "cigaretteTracker_cigarettes",
    currentSession: "cigaretteTracker_currentSession",
    sessions: "cigaretteTracker_sessions",
    dataVersion: "cigaretteTracker_dataVersion"
};


/* =========================================================
   2. DEFAULT CIGARETTES
   ========================================================= */

const DEFAULT_CIGARETTES = [
    {
        id: "double-switch",
        name: "Double Switch",
        price: 28
    },
    {
        id: "connect",
        name: "Connect",
        price: 28
    },
    {
        id: "blue-advance",
        name: "Blue Advance",
        price: 28
    },
    {
        id: "advance",
        name: "Advance",
        price: 28
    },
    {
        id: "saunf-crush",
        name: "Saunf Crush",
        price: 15
    }
];

const OLD_DEFAULT_NAMES = [
    "classic",
    "gold flake",
    "marlboro",
    "other",
    "advance all"
];


/* =========================================================
   3. STATE
   ========================================================= */

let cigarettes = loadData(
    STORAGE_KEYS.cigarettes,
    []
);

let currentSession = loadData(
    STORAGE_KEYS.currentSession,
    {}
);

let completedSessions = loadData(
    STORAGE_KEYS.sessions,
    []
);


/* =========================================================
   4. DOM REFERENCES
   ========================================================= */

const cigaretteSelect = document.getElementById("cigaretteSelect");
const purchaserNameInput = document.getElementById("purchaserName");
const addToSessionBtn = document.getElementById("addToSessionBtn");
const sessionTotalPeople = document.getElementById("sessionTotalPeople");
const sessionItems = document.getElementById("sessionItems");

const sessionTotalCigarettes =
    document.getElementById("sessionTotalCigarettes");

const sessionTotalCost =
    document.getElementById("sessionTotalCost");

const todayCigarettes =
    document.getElementById("todayCigarettes");

const todayCost =
    document.getElementById("todayCost");

const todaySessions =
    document.getElementById("todaySessions");

const historyList =
    document.getElementById("historyList");

const saveSessionBtn =
    document.getElementById("saveSessionBtn");

const addCigaretteBtn =
    document.getElementById("addCigaretteBtn");

const manageCigarettesBtn =
    document.getElementById("manageCigarettesBtn");

const addModal =
    document.getElementById("addModal");

const manageModal =
    document.getElementById("manageModal");

const closeModalBtn =
    document.getElementById("closeModalBtn");

const closeManageModal =
    document.getElementById("closeManageModal");

const addCigaretteForm =
    document.getElementById("addCigaretteForm");

const cigaretteNameInput =
    document.getElementById("cigaretteName");

const cigarettePriceInput =
    document.getElementById("cigarettePrice");

const manageCigaretteList =
    document.getElementById("manageCigaretteList");


/* =========================================================
   5. INITIALIZATION
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {
        initialize();
    }
);

function initialize() {
    migrateData();
    renderCigaretteSelect();
    renderSessionItems();
    updateSessionTotals();
    renderHistory();
    updateTodaySummary();
    refreshIcons();
    updateAddButtonState();
}


/* =========================================================
   6. STORAGE HELPERS
   ========================================================= */

function loadData(key, fallback) {
    try {
        const stored = localStorage.getItem(key);

        if (stored === null) {
            return structuredCloneSafe(fallback);
        }

        return JSON.parse(stored);
    } catch (error) {
        console.error("Storage error:", error);
        return structuredCloneSafe(fallback);
    }
}

function saveData(key, data) {
    localStorage.setItem(
        key,
        JSON.stringify(data)
    );
}

function structuredCloneSafe(value) {
    return JSON.parse(
        JSON.stringify(value)
    );
}


/* =========================================================
   7. DATA MIGRATION
   ========================================================= */

function migrateData() {
    const VERSION = "5";
    const storedVersion =
        localStorage.getItem(
            STORAGE_KEYS.dataVersion
        );

    if (storedVersion !== VERSION) {

        /*
         * Remove the old default cigarette
         * names from previous versions.
         */
        cigarettes = cigarettes.filter(
            cigarette => {
                const normalized =
                    String(cigarette.name)
                        .trim()
                        .toLowerCase();

                return !OLD_DEFAULT_NAMES.includes(
                    normalized
                );
            }
        );

        /*
         * Add the corrected defaults if
         * they are missing.
         */
        DEFAULT_CIGARETTES.forEach(
            defaultCigarette => {
                const exists =
                    cigarettes.some(
                        cigarette =>
                            cigarette.id ===
                            defaultCigarette.id
                    );

                if (!exists) {
                    cigarettes.push(
                        structuredCloneSafe(
                            defaultCigarette
                        )
                    );
                }
            }
        );

        /*
         * Remove deleted/old cigarette
         * records from the unsaved session.
         *
         * Completed history is NOT changed.
         */
        const cleanedSession = {};

        Object.values(
            currentSession
        ).forEach(item => {
            if (
                cigarettes.some(
                    cigarette =>
                        cigarette.id === item.id
                )
            ) {
                cleanedSession[item.id] = item;
            }
        });

        currentSession = cleanedSession;

        saveData(
            STORAGE_KEYS.cigarettes,
            cigarettes
        );

        saveData(
            STORAGE_KEYS.currentSession,
            currentSession
        );

        localStorage.setItem(
            STORAGE_KEYS.dataVersion,
            VERSION
        );
    }

    Object.values(currentSession).forEach(item => {
        if (!item.cigaretteId) {
            item.cigaretteId = item.id;
        }
        if (typeof item.purchaser !== "string") {
            item.purchaser = "";
        }
    });

    saveData(
        STORAGE_KEYS.currentSession,
        currentSession
    );

    ensureDefaultCigarettes();
}

function ensureDefaultCigarettes() {
    DEFAULT_CIGARETTES.forEach(
        defaultCigarette => {

            const exists =
                cigarettes.some(
                    cigarette =>
                        cigarette.id ===
                        defaultCigarette.id
                );

            if (!exists) {
                cigarettes.push(
                    structuredCloneSafe(
                        defaultCigarette
                    )
                );
            }
        }
    );

    saveData(
        STORAGE_KEYS.cigarettes,
        cigarettes
    );
}


/* =========================================================
   8. GENERAL HELPERS
   ========================================================= */

function generateId() {
    return (
        Date.now().toString(36) +
        Math.random()
            .toString(36)
            .substring(2, 9)
    );
}

function formatCurrency(amount) {
    const value = Number(amount) || 0;

    return (
        "₹" +
        value.toLocaleString(
            "en-IN",
            {
                minimumFractionDigits:
                    value % 1 !== 0 ? 2 : 0,
                maximumFractionDigits: 2
            }
        )
    );
}

function getCigaretteById(id) {
    return cigarettes.find(
        cigarette =>
            cigarette.id === id
    );
}

function escapeHTML(value) {
    const element =
        document.createElement("div");

    element.textContent = value;

    return element.innerHTML;
}

function isToday(dateString) {
    const date = new Date(dateString);
    const today = new Date();

    return (
        date.getFullYear() ===
            today.getFullYear() &&
        date.getMonth() ===
            today.getMonth() &&
        date.getDate() ===
            today.getDate()
    );
}

function refreshIcons() {
    if (
        window.lucide &&
        typeof lucide.createIcons === "function"
    ) {
        lucide.createIcons();
    }
}


/* =========================================================
   9. CIGARETTE SELECT
   ========================================================= */

function renderCigaretteSelect() {
    const previousValue =
        cigaretteSelect.value;

    cigaretteSelect.innerHTML = `
        <option value="">
            Select cigarette
        </option>
    `;

    cigarettes.forEach(cigarette => {
        const option =
            document.createElement("option");

        option.value = cigarette.id;

        option.textContent =
            `${cigarette.name} — ${formatCurrency(
                cigarette.price
            )}`;

        cigaretteSelect.appendChild(
            option
        );
    });

    if (
        getCigaretteById(previousValue)
    ) {
        cigaretteSelect.value =
            previousValue;
    }
}


/* =========================================================
   10. ADD CIGARETTE TO CURRENT SESSION
   ========================================================= */

cigaretteSelect.addEventListener(
    "change",
    updateAddButtonState
);

purchaserNameInput.addEventListener(
    "input",
    updateAddButtonState
);

addToSessionBtn.addEventListener(
    "click",
    () => {
        const id =
            cigaretteSelect.value;

        if (!id) {
            return;
        }

        const purchaser =
            purchaserNameInput.value.trim();

        addCigaretteToSession(
            id,
            purchaser
        );

        purchaserNameInput.value = "";
        cigaretteSelect.value = "";
        updateAddButtonState();
    }
);

purchaserNameInput.addEventListener(
    "keydown",
    event => {
        if (
            event.key === "Enter" &&
            cigaretteSelect.value
        ) {
            event.preventDefault();
            addToSessionBtn.click();
        }
    }
);

function updateAddButtonState() {
    addToSessionBtn.disabled =
        !cigaretteSelect.value;
}

function addCigaretteToSession(
    id,
    purchaser = ""
) {
    const cigarette =
        getCigaretteById(id);

    if (!cigarette) {
        return;
    }

    const normalizedPurchaser =
        purchaser.trim();

    /*
     * Same cigarette + same buyer = same line.
     * Same cigarette + different buyer = separate line.
     */
    const existingKey =
        Object.keys(currentSession).find(
            key => {
                const item =
                    currentSession[key];

                return (
                    (item.cigaretteId || item.id) === id &&
                    String(item.purchaser || "")
                        .trim()
                        .toLowerCase() ===
                        normalizedPurchaser.toLowerCase()
                );
            }
        );

    if (existingKey) {
        currentSession[existingKey].quantity += 1;
    } else {
        const sessionItemId =
            generateId();

        currentSession[sessionItemId] = {
            id: sessionItemId,
            cigaretteId: id,
            name: cigarette.name,
            purchaser: normalizedPurchaser,
            price: Number(cigarette.price),
            quantity: 1
        };
    }

    saveCurrentSession();
    renderSessionItems();
    updateSessionTotals();
}

/* =========================================================
   11. CURRENT SESSION STORAGE
   ========================================================= */

function saveCurrentSession() {
    saveData(
        STORAGE_KEYS.currentSession,
        currentSession
    );
}


/* =========================================================
   12. RENDER CURRENT SESSION
   ========================================================= */

function renderSessionItems() {
    sessionItems.innerHTML = "";

    const items =
        Object.values(
            currentSession
        );

    if (items.length === 0) {
        sessionItems.innerHTML = `
            <div class="empty-state">
                <i data-lucide="cigarette"></i>
                <p>No cigarettes consumed yet.</p>
            </div>
        `;

        refreshIcons();
        return;
    }

    items.forEach(item => {

        const element =
            document.createElement("div");

        element.className =
            "session-item";

        const total =
            item.quantity *
            item.price;

        element.innerHTML = `
            <div class="session-item-info">
                <div class="session-item-name">
                    ${escapeHTML(item.name)}
                </div>

                <div class="session-item-meta">
                    ${
                        item.purchaser
                            ? `
                                <span class="buyer-name">
                                    ${escapeHTML(item.purchaser)}
                                </span>
                                <span class="buyer-dot"></span>
                            `
                            : ""
                    }
                    <span>
                        ${formatCurrency(item.price)}
                        per cigarette
                    </span>
                </div>

                <button
                    type="button"
                    class="session-item-price"
                    data-price-id="${item.id}"
                    aria-label="Edit price for ${escapeHTML(item.name)}"
                >
                    Edit price
                </button>
            </div>

            <div class="session-controls">
                <button
                    type="button"
                    class="quantity-btn"
                    data-action="decrease"
                    data-id="${item.id}"
                    aria-label="Decrease ${escapeHTML(item.name)}"
                >
                    <i data-lucide="minus"></i>
                </button>

                <span class="session-quantity">
                    ${item.quantity}
                </span>

                <button
                    type="button"
                    class="quantity-btn"
                    data-action="increase"
                    data-id="${item.id}"
                    aria-label="Increase ${escapeHTML(item.name)}"
                >
                    <i data-lucide="plus"></i>
                </button>
            </div>

            <div class="session-item-cost">
                ${formatCurrency(total)}
            </div>
        `;

        sessionItems.appendChild(
            element
        );
    });

    refreshIcons();
}


/* =========================================================
   13. CURRENT SESSION CONTROLS
   ========================================================= */

sessionItems.addEventListener(
    "click",
    event => {

        const quantityButton =
            event.target.closest(
                "[data-action]"
            );

        if (quantityButton) {
            changeSessionQuantity(
                quantityButton.dataset.id,
                quantityButton.dataset.action
            );

            return;
        }

        const priceButton =
            event.target.closest(
                "[data-price-id]"
            );

        if (priceButton) {
            editSessionPrice(
                priceButton.dataset.priceId
            );
        }
    }
);

function changeSessionQuantity(
    id,
    action
) {
    if (!currentSession[id]) {
        return;
    }

    if (action === "increase") {
        currentSession[id].quantity += 1;
    }

    if (action === "decrease") {
        currentSession[id].quantity -= 1;
    }

    /*
     * Quantity cannot stay at zero
     * in the session list.
     * Remove the cigarette instead.
     */
    if (
        currentSession[id].quantity <= 0
    ) {
        delete currentSession[id];
    }

    saveCurrentSession();
    renderSessionItems();
    updateSessionTotals();
}


/* =========================================================
   14. CURRENT SESSION PRICE
   ========================================================= */

function editSessionPrice(id) {
    const item =
        currentSession[id];

    if (!item) {
        return;
    }

    const entered =
        prompt(
            `Price per cigarette for ${item.name}:`,
            item.price
        );

    if (entered === null) {
        return;
    }

    const price =
        Number(entered);

    if (
        !Number.isFinite(price) ||
        price < 0
    ) {
        alert("Enter a valid price.");
        return;
    }

    /*
     * This changes the price ONLY
     * for the current session.
     *
     * Example:
     * Default price = ₹28
     * Café price = ₹30
     *
     * The saved default remains ₹28.
     */
    item.price = price;

    saveCurrentSession();
    renderSessionItems();
    updateSessionTotals();
}


/* =========================================================
   15. SESSION TOTALS
   ========================================================= */

function getTotalCigarettes() {
    return Object.values(
        currentSession
    ).reduce(
        (total, item) =>
            total + item.quantity,
        0
    );
}

function getTotalCost() {
    return Object.values(
        currentSession
    ).reduce(
        (total, item) =>
            total +
            (
                item.quantity *
                item.price
            ),
        0
    );
}

function updateSessionTotals() {
    const items =
        Object.values(currentSession);

    sessionTotalCigarettes.textContent =
        getTotalCigarettes();

    sessionTotalCost.textContent =
        formatCurrency(
            getTotalCost()
        );

    const people =
        new Set(
            items
                .map(item =>
                    String(
                        item.purchaser || ""
                    ).trim()
                )
                .filter(Boolean)
        ).size;

    sessionTotalPeople.textContent =
        people;

    updateAddButtonState();
}


/* =========================================================
   16. SAVE SESSION
   ========================================================= */

saveSessionBtn.addEventListener(
    "click",
    saveSession
);

function saveSession() {
    const items =
        Object.values(
            currentSession
        );

    if (items.length === 0) {
        alert(
            "There are no cigarettes in the current session."
        );
        return;
    }

    const session = {
        id: generateId(),
        date: new Date().toISOString(),

        cigarettes:
            items.map(item => ({
                id: item.cigaretteId || item.id,
                name: item.name,
                purchaser: item.purchaser || "",
                price: item.price,
                quantity: item.quantity,
                total:
                    item.quantity *
                    item.price
            })),

        totalCigarettes:
            getTotalCigarettes(),

        totalCost:
            getTotalCost()
    };

    completedSessions.unshift(
        session
    );

    saveData(
        STORAGE_KEYS.sessions,
        completedSessions
    );

    currentSession = {};

    saveCurrentSession();

    renderSessionItems();
    updateSessionTotals();
    renderHistory();
    updateTodaySummary();

    showSaveFeedback();
}


function showSaveFeedback() {
    const originalHTML =
        saveSessionBtn.innerHTML;

    saveSessionBtn.innerHTML = `
        <i data-lucide="check"></i>
        Session saved
    `;

    saveSessionBtn.disabled = true;
    refreshIcons();

    setTimeout(() => {
        saveSessionBtn.innerHTML =
            originalHTML;
        saveSessionBtn.disabled = false;
        refreshIcons();
    }, 1200);
}


/* =========================================================
   17. TODAY SUMMARY
   ========================================================= */

function updateTodaySummary() {
    const sessions =
        completedSessions.filter(
            session =>
                isToday(session.date)
        );

    let cigarettes = 0;
    let cost = 0;

    sessions.forEach(session => {
        cigarettes +=
            session.totalCigarettes;

        cost +=
            session.totalCost;
    });

    todayCigarettes.textContent =
        cigarettes;

    todayCost.textContent =
        formatCurrency(cost);

    todaySessions.textContent =
        sessions.length;
}


/* =========================================================
   18. HISTORY
   ========================================================= */

function renderHistory() {
    historyList.innerHTML = "";

    const sessions =
        completedSessions.filter(
            session =>
                isToday(session.date)
        );

    if (sessions.length === 0) {
        historyList.innerHTML = `
            <div class="empty-state">
                <i data-lucide="history"></i>
                <p>No saved sessions today.</p>
            </div>
        `;

        refreshIcons();
        return;
    }

    sessions.forEach(session => {

        const card =
            document.createElement("div");

        card.className =
            "history-card";

        const time =
            new Date(
                session.date
            ).toLocaleTimeString(
                [],
                {
                    hour: "numeric",
                    minute: "2-digit"
                }
            );

        let cigaretteHTML = "";

        session.cigarettes.forEach(
            cigarette => {

                cigaretteHTML += `
                    <div class="history-cigarette">
                        <div class="history-cigarette-info">
                            <span>
                                ${escapeHTML(
                                    cigarette.name
                                )}
                                ×
                                ${cigarette.quantity}
                            </span>

                            ${
                                cigarette.purchaser
                                    ? `
                                        <div class="history-buyer">
                                            Bought by ${escapeHTML(
                                                cigarette.purchaser
                                            )}
                                        </div>
                                    `
                                    : ""
                            }
                        </div>

                        <span>
                            ${formatCurrency(
                                cigarette.total
                            )}
                        </span>
                    </div>
                `;
            }
        );

        card.innerHTML = `
            <div class="history-time">
                ${time}
            </div>

            ${cigaretteHTML}

            <div class="history-total">
                <span>
                    ${session.totalCigarettes}
                    cigarettes ·
                    ${formatCurrency(
                        session.totalCost
                    )}
                </span>

                <strong>Total</strong>
            </div>
        `;

        historyList.appendChild(
            card
        );
    });
}


/* =========================================================
   19. ADD CIGARETTE MODAL
   ========================================================= */

addCigaretteBtn.addEventListener(
    "click",
    openAddModal
);

closeModalBtn.addEventListener(
    "click",
    closeAddModal
);

addModal.addEventListener(
    "click",
    event => {
        if (
            event.target === addModal
        ) {
            closeAddModal();
        }
    }
);

function openAddModal() {
    addModal.classList.add(
        "active"
    );

    addModal.setAttribute(
        "aria-hidden",
        "false"
    );

    setTimeout(
        () =>
            cigaretteNameInput.focus(),
        50
    );
}

function closeAddModal() {
    addModal.classList.remove(
        "active"
    );

    addModal.setAttribute(
        "aria-hidden",
        "true"
    );

    addCigaretteForm.reset();
}


/* =========================================================
   20. ADD NEW CIGARETTE
   ========================================================= */

addCigaretteForm.addEventListener(
    "submit",
    event => {

        event.preventDefault();

        const name =
            cigaretteNameInput
                .value
                .trim();

        const price =
            Number(
                cigarettePriceInput
                    .value
            );

        if (!name) {
            alert(
                "Enter a cigarette name."
            );
            return;
        }

        if (
            !Number.isFinite(price) ||
            price < 0
        ) {
            alert(
                "Enter a valid price."
            );
            return;
        }

        const exists =
            cigarettes.some(
                cigarette =>
                    cigarette.name
                        .trim()
                        .toLowerCase() ===
                    name.toLowerCase()
            );

        if (exists) {
            alert(
                "This cigarette already exists."
            );
            return;
        }

        cigarettes.push({
            id: generateId(),
            name: name,
            price: price
        });

        saveData(
            STORAGE_KEYS.cigarettes,
            cigarettes
        );

        renderCigaretteSelect();
        closeAddModal();
    }
);


/* =========================================================
   21. MANAGE CIGARETTES MODAL
   ========================================================= */

manageCigarettesBtn.addEventListener(
    "click",
    openManageModal
);

closeManageModal.addEventListener(
    "click",
    closeManageModalWindow
);

manageModal.addEventListener(
    "click",
    event => {
        if (
            event.target === manageModal
        ) {
            closeManageModalWindow();
        }
    }
);

function openManageModal() {
    renderManageCigarettes();

    manageModal.classList.add(
        "active"
    );

    manageModal.setAttribute(
        "aria-hidden",
        "false"
    );
}

function closeManageModalWindow() {
    manageModal.classList.remove(
        "active"
    );

    manageModal.setAttribute(
        "aria-hidden",
        "true"
    );
}


/* =========================================================
   22. RENDER MANAGE LIST
   ========================================================= */

function renderManageCigarettes() {
    manageCigaretteList.innerHTML = "";

    if (cigarettes.length === 0) {
        manageCigaretteList.innerHTML = `
            <div class="empty-state">
                <i data-lucide="cigarette"></i>
                <p>No cigarettes saved.</p>
            </div>
        `;

        refreshIcons();
        return;
    }

    cigarettes.forEach(cigarette => {
        const row = document.createElement("div");
        row.className = "manage-cigarette";
        row.dataset.id = cigarette.id;

        row.innerHTML = `
            <div class="manage-cigarette-main">
                <div class="manage-cigarette-name">
                    ${escapeHTML(cigarette.name)}
                </div>

                <div class="manage-cigarette-price">
                    ${formatCurrency(cigarette.price)}
                </div>

                <button
                    type="button"
                    class="manage-expand-btn"
                    data-toggle-settings="${cigarette.id}"
                    aria-expanded="false"
                    aria-label="Open edit settings for ${escapeHTML(cigarette.name)}"
                >
                    <i data-lucide="chevron-down"></i>
                </button>
            </div>

            <div class="manage-settings">
                <label class="manage-settings-label">
                    Cigarette Name
                </label>

                <input
                    type="text"
                    class="manage-name"
                    data-id="${cigarette.id}"
                    value="${escapeHTML(cigarette.name)}"
                    aria-label="Cigarette name"
                >

                <label class="manage-settings-label">
                    Price per cigarette
                </label>

                <div class="price-field">
                    <span>₹</span>
                    <input
                        type="number"
                        class="manage-price"
                        data-id="${cigarette.id}"
                        value="${cigarette.price}"
                        min="0"
                        step="0.01"
                        inputmode="decimal"
                        aria-label="Cigarette price"
                    >
                </div>

                <div class="manage-settings-actions">
                    <button
                        type="button"
                        class="manage-save-btn"
                        data-save-id="${cigarette.id}"
                    >
                        <i data-lucide="check"></i>
                        <span>Save</span>
                    </button>

                    <button
                        type="button"
                        class="manage-delete-btn"
                        data-delete-id="${cigarette.id}"
                    >
                        <i data-lucide="trash-2"></i>
                        <span>Delete</span>
                    </button>
                </div>
            </div>
        `;

        manageCigaretteList.appendChild(row);
    });

    refreshIcons();
}

/* =========================================================
   23. MANAGE CIGARETTE ACTIONS
   ========================================================= */

manageCigaretteList.addEventListener(
    "click",
    event => {

        const toggleButton =
            event.target.closest(
                "[data-toggle-settings]"
            );

        if (toggleButton) {
            const id =
                toggleButton.dataset.toggleSettings;

            const row =
                manageCigaretteList.querySelector(
                    `.manage-cigarette[data-id="${CSS.escape(id)}"]`
                );

            if (!row) {
                return;
            }

            const isOpen =
                row.classList.contains("open");

            /*
             * Keep the settings panel tidy by
             * closing any other open cigarette.
             */
            manageCigaretteList
                .querySelectorAll(
                    ".manage-cigarette.open"
                )
                .forEach(openRow => {
                    if (openRow !== row) {
                        const openButton =
                            openRow.querySelector(
                                "[data-toggle-settings]"
                            );

                        if (openButton) {
                            openButton.setAttribute(
                                "aria-expanded",
                                "false"
                            );
                        }

                        animateAccordion(
                            openRow,
                            false
                        );
                    }
                });

            toggleButton.setAttribute(
                "aria-expanded",
                String(!isOpen)
            );

            animateAccordion(
                row,
                !isOpen
            );

            animatePress(
                toggleButton
            );

            return;
        }

        const saveButton =
            event.target.closest(
                "[data-save-id]"
            );

        if (saveButton) {
            saveEditedCigarette(
                saveButton.dataset.saveId
            );
            return;
        }

        const deleteButton =
            event.target.closest(
                "[data-delete-id]"
            );

        if (deleteButton) {
            deleteCigarette(
                deleteButton.dataset.deleteId
            );
        }
    }
);

/* =========================================================
   24. SAVE EDITED CIGARETTE
   ========================================================= */

function saveEditedCigarette(id) {
    const row =
        manageCigaretteList.querySelector(
            `.manage-cigarette[data-id="${CSS.escape(id)}"]`
        );

    if (!row) {
        return;
    }

    const nameInput =
        row.querySelector(
            ".manage-name"
        );

    const priceInput =
        row.querySelector(
            ".manage-price"
        );

    const newName =
        nameInput.value.trim();

    const newPrice =
        Number(
            priceInput.value
        );

    if (!newName) {
        alert(
            "Cigarette name cannot be empty."
        );
        return;
    }

    if (
        !Number.isFinite(newPrice) ||
        newPrice < 0
    ) {
        alert(
            "Enter a valid price."
        );
        return;
    }

    const duplicate =
        cigarettes.some(
            cigarette =>
                cigarette.id !== id &&
                cigarette.name
                    .trim()
                    .toLowerCase() ===
                newName.toLowerCase()
        );

    if (duplicate) {
        alert(
            "Another cigarette already has this name."
        );
        return;
    }

    const cigarette =
        getCigaretteById(id);

    if (!cigarette) {
        return;
    }

    /*
     * Update the saved/default
     * cigarette information.
     */
    cigarette.name =
        newName;

    cigarette.price =
        newPrice;

    saveData(
        STORAGE_KEYS.cigarettes,
        cigarettes
    );

    /*
     * If the cigarette is already
     * in the current session,
     * update only its name.
     *
     * The current session price
     * is intentionally preserved.
     */
    Object.values(currentSession).forEach(
        item => {
            if (
                (item.cigaretteId || item.id) === id
            ) {
                item.name = newName;
            }
        }
    );

    saveCurrentSession();

    renderSessionItems();
    updateSessionTotals();

    renderCigaretteSelect();
    renderManageCigarettes();
}


/* =========================================================
   25. DELETE CIGARETTE
   ========================================================= */

function deleteCigarette(id) {
    const cigarette =
        getCigaretteById(id);

    if (!cigarette) {
        return;
    }

    const confirmed =
        confirm(
            `Delete "${cigarette.name}"?\n\nIt will be removed from your saved cigarette list.`
        );

    if (!confirmed) {
        return;
    }

    /*
     * Delete from saved cigarette list.
     */
    cigarettes =
        cigarettes.filter(
            item =>
                item.id !== id
        );

    /*
     * If it exists in the current
     * unsaved session, remove it too.
     */
    Object.keys(currentSession).forEach(
        sessionItemId => {
            const item =
                currentSession[sessionItemId];

            if (
                (item.cigaretteId || item.id) === id
            ) {
                delete currentSession[
                    sessionItemId
                ];
            }
        }
    );

    saveCurrentSession();

    renderSessionItems();
    updateSessionTotals();

    saveData(
        STORAGE_KEYS.cigarettes,
        cigarettes
    );

    renderCigaretteSelect();
    renderManageCigarettes();
}


/* =========================================================
   26. KEYBOARD / ESCAPE
   ========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
        ) {
            closeAddModal();
            closeManageModalWindow();
        }
    }
);


/* =========================================================
   27. GSAP MOTION / UX
   ========================================================= */

const prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

const motionEase = "power2.out";
const quickEase = "power2.out";

function animateElement(
    element,
    vars = {},
    duration = 0.22
) {
    if (!element) {
        return;
    }

    if (
        prefersReducedMotion ||
        typeof gsap === "undefined"
    ) {
        return;
    }

    gsap.to(
        element,
        {
            duration,
            ease: motionEase,
            ...vars
        }
    );
}

function animateList(
    container,
    selector,
    delay = 0
) {
    if (
        !container ||
        prefersReducedMotion ||
        typeof gsap === "undefined"
    ) {
        return;
    }

    const elements =
        container.querySelectorAll(selector);

    if (!elements.length) {
        return;
    }

    gsap.fromTo(
        elements,
        {
            y: 8,
            opacity: 0
        },
        {
            y: 0,
            opacity: 1,
            duration: 0.24,
            stagger: 0.035,
            delay,
            ease: motionEase,
            clearProps: "transform"
        }
    );
}

function animatePress(
    element
) {
    if (
        !element ||
        prefersReducedMotion ||
        typeof gsap === "undefined"
    ) {
        return;
    }

    gsap.timeline()
        .to(element, {
            scale: 0.94,
            duration: 0.07,
            ease: "power2.out"
        })
        .to(element, {
            scale: 1,
            duration: 0.16,
            ease: "back.out(2)"
        });
}

function animateValueChange(
    element
) {
    if (
        !element ||
        prefersReducedMotion ||
        typeof gsap === "undefined"
    ) {
        return;
    }

    gsap.fromTo(
        element,
        {
            y: -3,
            opacity: 0.45
        },
        {
            y: 0,
            opacity: 1,
            duration: 0.18,
            ease: quickEase
        }
    );
}

function animateModalOpen(
    modal
) {
    if (!modal) {
        return;
    }

    modal.classList.add("active");
    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    if (
        prefersReducedMotion ||
        typeof gsap === "undefined"
    ) {
        return;
    }

    const panel =
        modal.querySelector(".modal");

    gsap.killTweensOf([
        modal,
        panel
    ]);

    gsap.set(modal, {
        opacity: 0
    });

    gsap.set(panel, {
        y: 28,
        opacity: 0,
        scale: 0.985
    });

    gsap.timeline()
        .to(modal, {
            opacity: 1,
            duration: 0.18,
            ease: "power1.out"
        })
        .to(
            panel,
            {
                y: 0,
                opacity: 1,
                scale: 1,
                duration: 0.28,
                ease: "power2.out"
            },
            "-=0.12"
        );
}

function animateModalClose(
    modal,
    callback
) {
    if (!modal) {
        return;
    }

    if (
        prefersReducedMotion ||
        typeof gsap === "undefined"
    ) {
        modal.classList.remove("active");
        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        if (callback) {
            callback();
        }

        return;
    }

    const panel =
        modal.querySelector(".modal");

    gsap.killTweensOf([
        modal,
        panel
    ]);

    gsap.timeline({
        onComplete: () => {
            modal.classList.remove(
                "active"
            );

            modal.setAttribute(
                "aria-hidden",
                "true"
            );

            gsap.set(
                [modal, panel],
                {
                    clearProps:
                        "all"
                }
            );

            if (callback) {
                callback();
            }
        }
    })
        .to(panel, {
            y: 18,
            opacity: 0,
            scale: 0.99,
            duration: 0.18,
            ease: "power2.in"
        })
        .to(
            modal,
            {
                opacity: 0,
                duration: 0.14,
                ease: "power1.in"
            },
            "-=0.08"
        );
}


/* Initial page entrance */
function animateInitialPage() {
    if (
        prefersReducedMotion ||
        typeof gsap === "undefined"
    ) {
        return;
    }

    const blocks =
        document.querySelectorAll(
            ".app-header, .today-card, .section, .quick-add-card, .session-summary"
        );

    gsap.fromTo(
        blocks,
        {
            y: 12,
            opacity: 0
        },
        {
            y: 0,
            opacity: 1,
            duration: 0.35,
            stagger: 0.07,
            ease: motionEase,
            clearProps: "transform"
        }
    );
}


/* Initial entrance */
const originalInitialize =
    initialize;

initialize = function () {
    originalInitialize();

    requestAnimationFrame(
        animateInitialPage
    );
};


/* Re-animate session items after rendering */
const originalRenderSessionItems =
    renderSessionItems;

renderSessionItems = function () {
    originalRenderSessionItems();

    animateList(
        sessionItems,
        ".session-item, .empty-state"
    );
};


/* Re-animate history cards */
const originalRenderHistory =
    renderHistory;

renderHistory = function () {
    originalRenderHistory();

    animateList(
        historyList,
        ".history-card, .empty-state"
    );
};


/* Animate summary number updates */
const originalUpdateSessionTotals =
    updateSessionTotals;

updateSessionTotals = function () {
    originalUpdateSessionTotals();

    animateValueChange(
        sessionTotalCigarettes
    );

    animateValueChange(
        sessionTotalCost
    );
};


/* Animate today's summary */
const originalUpdateTodaySummary =
    updateTodaySummary;

updateTodaySummary = function () {
    originalUpdateTodaySummary();

    animateValueChange(
        todayCigarettes
    );

    animateValueChange(
        todayCost
    );

    animateValueChange(
        todaySessions
    );
};


/* Animate modal open/close */
const originalOpenAddModal =
    openAddModal;

openAddModal = function () {
    animateModalOpen(addModal);

    setTimeout(
        () => cigaretteNameInput.focus(),
        120
    );
};

const originalCloseAddModal =
    closeAddModal;

closeAddModal = function () {
    if (!addModal.classList.contains("active")) {
        return;
    }

    animateModalClose(
        addModal,
        () => addCigaretteForm.reset()
    );
};

const originalOpenManageModal =
    openManageModal;

openManageModal = function () {
    renderManageCigarettes();
    animateModalOpen(manageModal);
};

const originalCloseManageModalWindow =
    closeManageModalWindow;

closeManageModalWindow = function () {
    if (!manageModal.classList.contains("active")) {
        return;
    }

    animateModalClose(
        manageModal
    );
};


/* Smooth accordion */
function animateAccordion(
    row,
    open
) {
    const settings =
        row.querySelector(
            ".manage-settings"
        );

    if (!settings) {
        return;
    }

    if (
        prefersReducedMotion ||
        typeof gsap === "undefined"
    ) {
        return;
    }

    gsap.killTweensOf(settings);

    if (open) {
        row.classList.add("open");

        gsap.fromTo(
            settings,
            {
                height: 0,
                opacity: 0
            },
            {
                height: "auto",
                opacity: 1,
                duration: 0.24,
                ease: motionEase,
                clearProps: "height"
            }
        );
    } else {
        gsap.to(
            settings,
            {
                height: 0,
                opacity: 0,
                duration: 0.19,
                ease: "power2.in",
                onComplete: () => {
                    row.classList.remove(
                        "open"
                    );

                    gsap.set(
                        settings,
                        {
                            clearProps:
                                "height,opacity"
                        }
                    );
                }
            }
        );
    }
}




/* Animate all button presses without interfering with click logic. */
document.addEventListener(
    "pointerdown",
    event => {
        const button =
            event.target.closest(
                "button"
            );

        if (button) {
            animatePress(button);
        }
    },
    {
        passive: true
    }
);


/* Smooth select interaction */
cigaretteSelect.addEventListener(
    "focus",
    () => {
        animateElement(
            cigaretteSelect,
            {
                scale: 1.005
            },
            0.16
        );
    }
);

cigaretteSelect.addEventListener(
    "blur",
    () => {
        animateElement(
            cigaretteSelect,
            {
                scale: 1
            },
            0.16
        );
    }
);


/* Smooth scroll to the current session after adding a cigarette. */
const originalAddCigaretteToSession =
    addCigaretteToSession;

addCigaretteToSession = function (
    id,
    purchaser = ""
) {
    originalAddCigaretteToSession(
        id,
        purchaser
    );

    if (
        prefersReducedMotion
    ) {
        return;
    }

    const firstItem =
        sessionItems.querySelector(
            ".session-item"
        );

    if (firstItem) {
        gsap.fromTo(
            firstItem,
            {
                x: -6
            },
            {
                x: 0,
                duration: 0.2,
                ease: quickEase,
                clearProps: "transform"
            }
        );
    }
};
