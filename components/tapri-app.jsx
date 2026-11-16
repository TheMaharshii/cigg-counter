"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChartNoAxesCombined,
  Check,
  CircleDot,
  Cloud,
  History,
  LogOut,
  Minus,
  Package,
  Pencil,
  Plus,
  Save,
  ShoppingBag,
  Trash2,
  TriangleAlert,
  Users,
  X,
} from "lucide-react";
import { getSupabaseClient } from "../lib/supabase";
import AppSelect from "./app-select";

const DEFAULT_ITEMS = [
  { name: "Double Switch", category: "cigarette", price: 28 },
  { name: "Connect", category: "cigarette", price: 28 },
  { name: "Blue Advance", category: "cigarette", price: 28 },
  { name: "Advance", category: "cigarette", price: 28 },
  { name: "Saunf Crush", category: "cigarette", price: 15 },
  { name: "Chai", category: "chai", price: 15 },
  { name: "Maggi", category: "food", price: 50 },
];

const CATEGORY_LABELS = {
  cigarette: "Cigarette",
  chai: "Chai",
  food: "Food",
  other: "Other",
};

const DRAFTS_TABLE = "session_drafts";

function money(value) {
  const amount = Number(value) || 0;
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: amount % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

function isToday(value) {
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

function getErrorMessage(error) {
  const code = String(error?.code || "").toLowerCase();
  const message = String(error?.message || "").toLowerCase();

  if (code === "email_not_confirmed" || message.includes("email not confirmed")) {
    return "Please confirm your email before signing in. Check your inbox and spam folder for the confirmation link.";
  }
  if (code === "over_email_send_rate_limit") {
    return "Too many confirmation emails have been requested. Please wait before trying again, and check your inbox if you already created an account.";
  }
  if (code === "email_address_invalid" || message.includes("email address") && message.includes("invalid")) {
    return "That email address looks invalid. Check it for typos and try again.";
  }
  if (["invalid_credentials", "user_not_found"].includes(code) || message.includes("invalid login credentials")) {
    return "Email or password is incorrect. Check your details and try again.";
  }
  if (["user_already_exists", "email_exists"].includes(code)) {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (code === "signup_disabled") {
    return "New account creation is currently unavailable. Try signing in or contact the app administrator.";
  }
  if (code === "anonymous_provider_disabled") {
    return "Guest access is turned off. Sign in or create an account to continue.";
  }
  if (["user_banned", "user_locked"].includes(code)) {
    return "This account is temporarily unavailable. Contact the app administrator for help.";
  }
  if (code === "weak_password") {
    return "Choose a stronger password with at least 8 characters, including a letter and a number.";
  }
  if (code === "42501" || message.includes("row-level security")) {
    return "You don't have permission to make that change. Check that you're signed into the correct account.";
  }
  if (code === "23503") {
    return "That record is no longer available. Refresh the page and try again.";
  }
  if (code === "23505") {
    return "That name is already in use. Choose a different name and try again.";
  }
  if (code === "pgrst116") {
    return "We couldn't find that record. Refresh the page and try again.";
  }
  if (code.startsWith("pgrst2") || message.includes("schema cache")) {
    return "Tapri's database setup is incomplete or out of date. Apply the per-user schema in Supabase, then refresh the page.";
  }
  if (error?.name === "TypeError" || message.includes("failed to fetch") || message.includes("network")) {
    return "Tapri couldn't connect right now. Check your internet connection and try again.";
  }

  return "We couldn't complete that request. Please try again.";
}

function Modal({ title, eyebrow, subtitle, onClose, children, className = "" }) {
  return (
    <div className="modal-overlay active" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className={`modal ${className}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2>{title}</h2>
            {subtitle && <p className="modal-subtitle">{subtitle}</p>}
          </div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Close">
            <X aria-hidden="true" />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function AuthForm({ mode, busy, message, onSubmit }) {
  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <div className="form-group">
        <label htmlFor="auth-email">Email</label>
        <input id="auth-email" name="email" type="email" autoComplete="email" maxLength={254} required placeholder="you@example.com" />
      </div>
      <div className="form-group">
        <label htmlFor="auth-password">Password</label>
        <input id="auth-password" name="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={mode === "signup" ? 8 : 6} required placeholder={mode === "signup" ? "At least 8 characters" : "Your password"} />
      </div>
      {mode === "signup" && <div className="form-group">
        <label htmlFor="auth-confirmation">Confirm password</label>
        <input id="auth-confirmation" name="confirmation" type="password" autoComplete="new-password" minLength={8} required placeholder="Enter the password again" />
      </div>}
      {message.text && <p className={`account-message ${message.error ? "error" : ""}`} role={message.error ? "alert" : "status"}>{message.text}</p>}
      <button className="primary-btn" type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}</button>
    </form>
  );
}

function AppNavigation({ page }) {
  return (
    <nav className="app-nav" aria-label="Main navigation">
      <Link href="/" className={page === "home" ? "active" : ""} aria-current={page === "home" ? "page" : undefined}>Bill</Link>
      <Link href="/summary" className={page === "summary" ? "active" : ""} aria-current={page === "summary" ? "page" : undefined}>Summary</Link>
      <Link href="/people" className={page === "people" ? "active" : ""} aria-current={page === "people" ? "page" : undefined}>Friends</Link>
      <Link href="/items" className={page === "items" ? "active" : ""} aria-current={page === "items" ? "page" : undefined}>Items</Link>
      <Link href="/account" className={page === "account" ? "active" : ""} aria-current={page === "account" ? "page" : undefined}>Account</Link>
    </nav>
  );
}

export default function TapriApp({ page = "home" }) {
  const [user, setUser] = useState(null);
  const [people, setPeople] = useState([]);
  const [items, setItems] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [draft, setDraft] = useState({});
  const [sessionName, setSessionName] = useState("");
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [fatalError, setFatalError] = useState("");
  const [toast, setToast] = useState({ text: "", error: false });
  const [authMode, setAuthMode] = useState("signin");
  const [authMessage, setAuthMessage] = useState({ text: "", error: false });
  const [modal, setModal] = useState("");
  const [selectedPerson, setSelectedPerson] = useState("");
  const [historyPersonFilter, setHistoryPersonFilter] = useState("");
  const [summaryPersonFilter, setSummaryPersonFilter] = useState("");
  const [summaryPeriod, setSummaryPeriod] = useState("30days");
  const [selectedItem, setSelectedItem] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("cigarette");
  const [formPrice, setFormPrice] = useState("");
  const [editing, setEditing] = useState(null);
  const draftWriteQueue = useRef(Promise.resolve());
  const draftVersion = useRef(0);

  useEffect(() => {
    localStorage.removeItem("tapri_current_draft_v2");
    localStorage.removeItem("tapri_current_name_v2");
    localStorage.removeItem("tapri_group_id_v2");
  }, []);

  useEffect(() => {
    let active = true;

    async function start() {
      try {
        const client = getSupabaseClient();
        const { data, error } = await client.auth.getSession();
        if (error) throw error;

        const nextUser = data.session?.user || null;
        if (!nextUser || nextUser.is_anonymous) {
          if (nextUser?.is_anonymous) {
            await client.auth.signOut({ scope: "local" });
          }
          if (active) {
            setUser(null);
            setAuthReady(true);
            setLoading(false);
          }
          return;
        }

        if (active) await loadUserWorkspace(nextUser, client, active);
      } catch (error) {
        if (active) {
          setFatalError(getErrorMessage(error));
          setAuthReady(true);
          setLoading(false);
        }
      }
    }

    start();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!toast.text) return undefined;
    const timer = window.setTimeout(() => setToast({ text: "", error: false }), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") setModal("");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!user?.id) return undefined;
    const client = getSupabaseClient();
    const userFilter = `user_id=eq.${user.id}`;

    async function syncDraft() {
      const versionAtRequest = draftVersion.current;
      const { data, error } = await client
        .from(DRAFTS_TABLE)
        .select("entries,session_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) {
        notify(getErrorMessage(error), true);
        return;
      }
      if (versionAtRequest !== draftVersion.current) return;
      setDraft(data?.entries || {});
      setSessionName(data?.session_name || "");
    }

    const channel = client.channel(`tapri-user-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "people", filter: userFilter }, () => {
        refreshData().catch(error => notify(getErrorMessage(error), true));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "items", filter: userFilter }, () => {
        refreshData().catch(error => notify(getErrorMessage(error), true));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions", filter: userFilter }, () => {
        refreshData().catch(error => notify(getErrorMessage(error), true));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "session_items", filter: userFilter }, () => {
        refreshData().catch(error => notify(getErrorMessage(error), true));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: DRAFTS_TABLE, filter: userFilter }, syncDraft)
      .subscribe(status => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          notify("Live sync is unavailable. Refresh the page to get the latest data.", true);
        }
      });

    return () => {
      void client.removeChannel(channel);
    };
  }, [user?.id]);

  async function loadUserWorkspace(nextUser, client = getSupabaseClient(), active = true) {
    setLoading(true);
    setFatalError("");
    setDraftLoaded(false);
    const [peopleResult, itemsResult, sessionsResult, draftResult] = await Promise.all([
      client.from("people").select("id,user_id,name,created_at").eq("user_id", nextUser.id).order("name"),
      client.from("items").select("id,user_id,name,category,price,created_at,updated_at").eq("user_id", nextUser.id).order("name"),
      client.from("sessions").select("id,user_id,name,session_date,total_items,total_cost,created_at,session_items(id,user_id,item_id,person_id,item_name,person_name,price,quantity,total,created_at)").eq("user_id", nextUser.id).order("session_date", { ascending: false }),
      client.from(DRAFTS_TABLE).select("entries,session_name").eq("user_id", nextUser.id).maybeSingle(),
    ]);
    if (peopleResult.error) throw peopleResult.error;
    if (itemsResult.error) throw itemsResult.error;
    if (sessionsResult.error) throw sessionsResult.error;
    if (draftResult.error) throw draftResult.error;

    let loadedItems = itemsResult.data || [];
    if (loadedItems.length === 0) {
      const { data, error } = await client.from("items").insert(DEFAULT_ITEMS.map(item => ({
        ...item,
        user_id: nextUser.id,
      }))).select("id,user_id,name,category,price,created_at,updated_at");
      if (error && error.code !== "23505") throw error;
      if (error) {
        const { data: currentItems, error: reloadError } = await client
          .from("items")
          .select("id,user_id,name,category,price,created_at,updated_at")
          .eq("user_id", nextUser.id)
          .order("name");
        if (reloadError) throw reloadError;
        loadedItems = currentItems || [];
      } else {
        loadedItems = data || [];
      }
    }

    if (!active) return;
    setUser(nextUser);
    setPeople(peopleResult.data || []);
    setItems(loadedItems);
    setSessions((sessionsResult.data || []).map(session => ({
      id: session.id,
      name: session.name,
      date: session.session_date,
      totalItems: Number(session.total_items) || 0,
      totalCost: Number(session.total_cost) || 0,
      items: (session.session_items || []).map(entry => ({
        id: entry.id,
        itemId: entry.item_id,
        personId: entry.person_id,
        name: entry.item_name,
        purchaser: entry.person_name,
        price: Number(entry.price) || 0,
        quantity: Number(entry.quantity) || 0,
        total: Number(entry.total) || 0,
      })),
    })));
    setDraft(draftResult.data?.entries || {});
    setSessionName(draftResult.data?.session_name || "");
    draftVersion.current += 1;
    setDraftLoaded(true);
    setAuthReady(true);
    setLoading(false);
  }

  function persistDraft(nextDraft, nextSessionName = sessionName) {
    setDraft(nextDraft);
    draftVersion.current += 1;
    if (!user || !draftLoaded) return Promise.resolve();
    const snapshot = {
      user_id: user.id,
      entries: nextDraft,
      session_name: nextSessionName,
      updated_at: new Date().toISOString(),
    };
    draftWriteQueue.current = draftWriteQueue.current
      .catch(() => undefined)
      .then(async () => {
        const { error } = await getSupabaseClient().from(DRAFTS_TABLE).upsert(snapshot, { onConflict: "user_id" });
        if (error) notify(getErrorMessage(error), true);
      });
    return draftWriteQueue.current;
  }

  function updateSessionName(value) {
    setSessionName(value);
    void persistDraft(draft, value);
  }

  function notify(message, error = false) {
    setToast({ text: message, error });
  }

  async function submitAuth(event, requestedMode = authMode) {
    event.preventDefault();
    setAuthMessage({ text: "", error: false });
    const form = event.currentTarget;
    const email = String(new FormData(form).get("email") || "").trim().toLowerCase();
    const password = String(new FormData(form).get("password") || "");
    const confirmation = String(new FormData(form).get("confirmation") || "");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
      setAuthMessage({ text: "Enter a valid email address.", error: true });
      return;
    }
    if (requestedMode === "signup" && password.length < 8) {
      setAuthMessage({ text: "Use a password with at least 8 characters.", error: true });
      return;
    }
    if (requestedMode === "signin" && password.length < 6) {
      setAuthMessage({ text: "Enter your password (at least 6 characters).", error: true });
      return;
    }
    if (requestedMode === "signup" && !/(?=.*[A-Za-z])(?=.*\d)/.test(password)) {
      setAuthMessage({ text: "Include at least one letter and one number in your password.", error: true });
      return;
    }
    if (requestedMode === "signup" && password !== confirmation) {
      setAuthMessage({ text: "The passwords do not match.", error: true });
      return;
    }

    setBusy(true);
    try {
      const client = getSupabaseClient();
      if (requestedMode === "signin") {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await loadUserWorkspace(data.user, client);
        notify("Signed in");
      } else {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session) {
          await loadUserWorkspace(data.user, client);
          notify("Account created");
        } else {
          setAuthMessage({ text: "Account created. Check your email to confirm it, then sign in.", error: false });
          setAuthMode("signin");
        }
      }
    } catch (error) {
      setAuthMessage({ text: getErrorMessage(error), error: true });
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    try {
      await draftWriteQueue.current;
      const { error } = await getSupabaseClient().auth.signOut();
      if (error) throw error;
      setUser(null);
      setPeople([]);
      setItems([]);
      setSessions([]);
      setDraft({});
      setSessionName("");
      setDraftLoaded(false);
      setAuthReady(true);
      setAuthMode("signin");
    } catch (error) {
      notify(getErrorMessage(error), true);
    } finally {
      setBusy(false);
    }
  }

  function addToDraft() {
    const count = Number(quantity);
    const item = items.find(value => value.id === selectedItem);
    const person = people.find(value => value.id === selectedPerson);
    if (!item || !person || !Number.isSafeInteger(count) || count < 1) return;
    const existing = Object.entries(draft).find(([, entry]) => entry.itemId === item.id && entry.personId === person.id);
    const nextDraft = { ...draft };
    if (existing) {
      nextDraft[existing[0]] = { ...existing[1], quantity: existing[1].quantity + count };
    } else {
      const id = crypto.randomUUID();
      nextDraft[id] = { id, itemId: item.id, personId: person.id, name: item.name, price: Number(item.price), quantity: count };
    }
    persistDraft(nextDraft);
    setSelectedItem("");
    setQuantity("1");
  }

  function changeQuantity(id, amount) {
    const nextDraft = { ...draft };
    const entry = nextDraft[id];
    if (!entry) return;
    const nextQuantity = entry.quantity + amount;
    if (nextQuantity <= 0) delete nextDraft[id];
    else nextDraft[id] = { ...entry, quantity: nextQuantity };
    persistDraft(nextDraft);
  }

  async function refreshData() {
    if (!user) return;
    const client = getSupabaseClient();
    const [peopleResult, itemsResult, sessionsResult] = await Promise.all([
      client.from("people").select("id,user_id,name,created_at").eq("user_id", user.id).order("name"),
      client.from("items").select("id,user_id,name,category,price,created_at,updated_at").eq("user_id", user.id).order("name"),
      client.from("sessions").select("id,user_id,name,session_date,total_items,total_cost,created_at,session_items(id,user_id,item_id,person_id,item_name,person_name,price,quantity,total,created_at)").eq("user_id", user.id).order("session_date", { ascending: false }),
    ]);
    if (peopleResult.error) throw peopleResult.error;
    if (itemsResult.error) throw itemsResult.error;
    if (sessionsResult.error) throw sessionsResult.error;
    setPeople(peopleResult.data || []);
    setItems(itemsResult.data || []);
    setSessions((sessionsResult.data || []).map(session => ({
      id: session.id,
      name: session.name,
      date: session.session_date,
      totalItems: Number(session.total_items) || 0,
      totalCost: Number(session.total_cost) || 0,
      items: (session.session_items || []).map(entry => ({
        id: entry.id,
        itemId: entry.item_id,
        personId: entry.person_id,
        name: entry.item_name,
        purchaser: entry.person_name,
        price: Number(entry.price) || 0,
        quantity: Number(entry.quantity) || 0,
        total: Number(entry.total) || 0,
      })),
    })));
  }

  async function saveSession() {
    const entries = Object.values(draft);
    if (!entries.length) {
      notify("Add something to the bill before saving.", true);
      return;
    }
    setBusy(true);
    try {
      const client = getSupabaseClient();
      const totalItems = entries.reduce((sum, entry) => sum + entry.quantity, 0);
      const totalCost = entries.reduce((sum, entry) => sum + entry.quantity * entry.price, 0);
      const { data: saved, error } = await client.from("sessions").insert({
        user_id: user.id,
        name: sessionName.trim() || "Tapri session",
        session_date: new Date().toISOString(),
        total_items: totalItems,
        total_cost: totalCost,
      }).select("id").single();
      if (error) throw error;

      const rows = entries.map(entry => ({
        user_id: user.id,
        session_id: saved.id,
        item_id: entry.itemId || null,
        person_id: entry.personId || null,
        item_name: entry.name,
        person_name: people.find(person => person.id === entry.personId)?.name || "Unknown",
        price: entry.price,
        quantity: entry.quantity,
      }));
      const { error: entriesError } = await client.from("session_items").insert(rows);
      if (entriesError) {
        await client.from("sessions").delete().eq("id", saved.id);
        throw entriesError;
      }

      await persistDraft({}, "");
      await refreshData();
      notify("Session saved");
    } catch (error) {
      notify(getErrorMessage(error), true);
    } finally {
      setBusy(false);
    }
  }

  async function submitManagedForm(event) {
    event.preventDefault();
    const name = formName.trim();
    if (!name) return;
    if (modal.includes("item") && (!Number.isFinite(Number(formPrice)) || Number(formPrice) < 0)) {
      notify("Enter a price of zero or more.", true);
      return;
    }

    const collection = modal.includes("item") ? items : people;
    if (collection.some(entry => entry.id !== editing?.id && entry.name.toLowerCase() === name.toLowerCase())) {
      notify(`That ${modal.includes("item") ? "item" : "friend"} already exists.`, true);
      return;
    }

    setBusy(true);
    try {
      const client = getSupabaseClient();
      const isItem = modal.includes("item");
      const table = isItem ? "items" : "people";
      const payload = isItem
        ? { name, category: formCategory, price: Number(formPrice) }
        : { name };
      let request = editing
        ? client.from(table).update(payload).eq("id", editing.id)
        : client.from(table).insert({ ...payload, user_id: user.id });
      const { error } = await request;
      if (error) throw error;
      await refreshData();
      if (isItem && editing) {
        const nextDraft = Object.fromEntries(Object.entries(draft).map(([id, entry]) => [
          id,
          entry.itemId === editing.id ? { ...entry, name } : entry,
        ]));
        await persistDraft(nextDraft);
      }
      setModal(isItem ? "items" : "people");
      setEditing(null);
      notify(`${isItem ? "Item" : "Friend"} ${editing ? "updated" : "added"}`);
    } catch (error) {
      notify(getErrorMessage(error), true);
    } finally {
      setBusy(false);
    }
  }

  function openEditor(type, entry = null) {
    setEditing(entry);
    setFormName(entry?.name || "");
    setFormCategory(entry?.category || "cigarette");
    setFormPrice(entry ? String(entry.price) : "");
    setModal(`${type}-form`);
  }

  async function deleteEntry(type, entry) {
    if (!window.confirm(`Delete “${entry.name}”?`)) return;
    try {
      const { error } = await getSupabaseClient().from(type === "item" ? "items" : "people").delete().eq("id", entry.id);
      if (error) throw error;
      const nextDraft = Object.fromEntries(Object.entries(draft).filter(([, value]) => (
        type === "item" ? value.itemId !== entry.id : value.personId !== entry.id
      )));
      await persistDraft(nextDraft);
      await refreshData();
      notify(`${type === "item" ? "Item" : "Friend"} deleted`);
    } catch (error) {
      notify(getErrorMessage(error), true);
    }
  }

  async function deleteSession(sessionId) {
    if (!window.confirm("Delete this saved session? This cannot be undone.")) return;
    try {
      const { error } = await getSupabaseClient().from("sessions").delete().eq("id", sessionId);
      if (error) throw error;
      setSessions(current => current.filter(session => session.id !== sessionId));
      notify("Session deleted");
    } catch (error) {
      notify(getErrorMessage(error), true);
    }
  }

  const draftEntries = Object.values(draft);
  const draftItems = draftEntries.reduce((sum, entry) => sum + entry.quantity, 0);
  const draftTotal = draftEntries.reduce((sum, entry) => sum + entry.quantity * entry.price, 0);
  const todaySessions = sessions.filter(session => isToday(session.date));
  const todayHistory = todaySessions.map(session => ({
    ...session,
    items: historyPersonFilter ? session.items.filter(entry => entry.personId === historyPersonFilter) : session.items,
  })).filter(session => session.items.length);
  const summarySessions = sessions.filter(session => {
    if (summaryPeriod === "all") return true;
    if (summaryPeriod === "today") return isToday(session.date);
    const ageDays = (Date.now() - new Date(session.date).getTime()) / 86400000;
    return ageDays <= Number(summaryPeriod.replace("days", "")) && ageDays >= 0;
  });
  const friendSummaries = new Map();
  summarySessions.forEach(session => session.items.forEach(entry => {
    const personName = people.find(person => person.id === entry.personId)?.name || entry.purchaser || "Unknown";
    const personKey = entry.personId || `name:${personName.toLowerCase()}`;
    if (!friendSummaries.has(personKey)) {
      friendSummaries.set(personKey, {
        id: personKey,
        name: personName,
        totalItems: 0,
        totalCost: 0,
        sessions: new Set(),
        items: new Map(),
      });
    }
    const summary = friendSummaries.get(personKey);
    summary.totalItems += entry.quantity;
    summary.totalCost += entry.quantity * entry.price;
    summary.sessions.add(session.id);
    const itemKey = `${entry.name.toLowerCase()}|${entry.price}`;
    const itemSummary = summary.items.get(itemKey) || { name: entry.name, price: entry.price, quantity: 0, total: 0 };
    itemSummary.quantity += entry.quantity;
    itemSummary.total += entry.quantity * entry.price;
    summary.items.set(itemKey, itemSummary);
  }));
  const summaryRows = [...friendSummaries.values()]
    .filter(summary => !summaryPersonFilter || summary.id === summaryPersonFilter)
    .map(summary => ({ ...summary, items: [...summary.items.values()].sort((a, b) => b.total - a.total) }))
    .sort((a, b) => b.totalCost - a.totalCost);
  const summaryItemsCount = summaryRows.reduce((total, summary) => total + summary.totalItems, 0);
  const summarySpend = summaryRows.reduce((total, summary) => total + summary.totalCost, 0);
  const summaryTotalBill = summarySessions.reduce((total, session) => total + session.totalCost, 0);
  const summarySessionCount = summarySessions.filter(session => (
    !summaryPersonFilter || session.items.some(entry => entry.personId === summaryPersonFilter)
  )).length;
  const draftByPerson = people.map(person => {
    const entries = draftEntries.filter(entry => entry.personId === person.id);
    return {
      person,
      entries,
      totalItems: entries.reduce((total, entry) => total + entry.quantity, 0),
      totalCost: entries.reduce((total, entry) => total + entry.quantity * entry.price, 0),
    };
  }).filter(summary => summary.entries.length).sort((a, b) => b.totalCost - a.totalCost);

  if (!authReady && loading) {
    return <main className="app boot-screen"><div className="loading-mark"><ShoppingBag aria-hidden="true" /></div><p className="eyebrow">TAPRI</p><h1>Loading your account</h1><p className="subtitle">Syncing your bill book…</p></main>;
  }

  if (!user) {
    return (
      <main className="app auth-screen">
        <header className="app-header auth-brand"><div><p className="eyebrow">TAPRI</p><h1>One bill. Your whole gang.</h1><p className="subtitle">Keep the chai, snacks, and shared spends in one place.</p></div><ShoppingBag aria-hidden="true" /></header>
        <section className="auth-panel">
          <p className="eyebrow">YOUR PERSONAL BILL BOOK</p>
          <h2>{authMode === "signup" ? "Create your account" : "Welcome back"}</h2>
          <p className={`auth-copy ${fatalError ? "auth-copy-error" : ""}`} role={fatalError ? "alert" : undefined}>{fatalError || "Sign in to sync your account on any device."}</p>
          <div className="account-modes" role="group" aria-label="Account action">
            <button type="button" className={`account-mode ${authMode === "signin" ? "active" : ""}`} aria-pressed={authMode === "signin"} onClick={() => { setAuthMode("signin"); setAuthMessage({ text: "", error: false }); }}>Sign in</button>
            <button type="button" className={`account-mode ${authMode === "signup" ? "active" : ""}`} aria-pressed={authMode === "signup"} onClick={() => { setAuthMode("signup"); setAuthMessage({ text: "", error: false }); }}>Create account</button>
          </div>
          <AuthForm mode={authMode} busy={busy} message={authMessage} onSubmit={event => submitAuth(event, authMode)} />
          <p className="auth-footnote">{authMode === "signup" ? "Use 8 or more characters, including a letter and a number." : "New to Tapri? Create an account to get started."}</p>
        </section>
          <p className="auth-privacy">Your account data is protected by Supabase row-level security.</p>
      </main>
    );
  }

  if (page === "account") {
    return (
      <main className="app">
        <header className="app-header page-header">
          <div><p className="eyebrow">TAPRI</p><h1>Account</h1><p className="subtitle">Your sign-in and synced data.</p></div>
        </header>
        <AppNavigation page={page} />
        <section className="section route-section">
          <div className="account-identity"><span className="eyebrow">SIGNED IN AS</span><strong>{user.email}</strong></div>
          <div className="account-details"><h2>Personal data</h2><p>Your friends, items, saved sessions, and current bill are owned by this account and sync across your signed-in devices.</p><button className="secondary-btn account-signout" type="button" disabled={busy} onClick={signOut}><LogOut aria-hidden="true" /><span>Sign out</span></button></div>
        </section>
        {toast.text && <div className={`toast show ${toast.error ? "toast-error" : ""}`} role={toast.error ? "alert" : "status"}>{toast.text}</div>}
      </main>
    );
  }

  if (page === "summary") {
    return (
      <main className="app">
        <header className="app-header page-header">
          <div><p className="eyebrow">TAPRI</p><h1>Friend summary</h1><p className="subtitle">See what each friend bought and how much they spent.</p></div>
        </header>
        <AppNavigation page={page} />
        <section className="section route-section">
          <div className="summary-total-bill"><span className="summary-label">TOTAL BILL</span><strong>{money(summaryTotalBill)}</strong></div>
          <div className="summary-overview">
            <div><span className="summary-label">FRIEND SPEND</span><strong>{money(summarySpend)}</strong></div>
            <div><span className="summary-label">ITEMS</span><strong>{summaryItemsCount}</strong></div>
            <div><span className="summary-label">SESSIONS</span><strong>{summarySessionCount}</strong></div>
            <div><span className="summary-label">FRIENDS</span><strong>{summaryRows.length}</strong></div>
          </div>
          <div className="summary-filters">
            <div className="quick-field"><label htmlFor="summary-period">Date range</label><AppSelect id="summary-period" ariaLabel="Filter summary by date range" value={summaryPeriod} onValueChange={setSummaryPeriod} options={[{ value: "today", label: "Today" }, { value: "7days", label: "Last 7 days" }, { value: "30days", label: "Last 30 days" }, { value: "all", label: "All time" }]} /></div>
            <div className="quick-field"><label htmlFor="summary-person">Friend</label><AppSelect id="summary-person" ariaLabel="Filter summary by friend" value={summaryPersonFilter} onValueChange={setSummaryPersonFilter} placeholder="All friends" disabled={!people.length} options={people.map(person => ({ value: person.id, label: person.name }))} /></div>
          </div>
          <div className="summary-friend-list">
            {summaryRows.length === 0 ? <div className="empty-state"><Users aria-hidden="true" /><p>No purchases found for these filters.</p></div> : summaryRows.map(summary => (
              <article className="summary-friend" key={summary.id}>
                <header className="summary-friend-header">
                  <div className="history-person-title"><span className="history-person-avatar" aria-hidden="true">{summary.name.trim().charAt(0).toUpperCase()}</span><div><strong>{summary.name}</strong><p>{summary.totalItems} items · {summary.sessions.size} sessions</p></div></div>
                  <strong className="summary-friend-total">{money(summary.totalCost)}</strong>
                </header>
                <div className="summary-purchase-list">
                  {summary.items.map(item => <div className="summary-purchase-row" key={`${summary.id}-${item.name}-${item.price}`}><span>{item.name}<small>{item.quantity} × {money(item.price)}</small></span><strong>{money(item.total)}</strong></div>)}
                </div>
              </article>
            ))}
          </div>
        </section>
        {toast.text && <div className={`toast show ${toast.error ? "toast-error" : ""}`} role={toast.error ? "alert" : "status"}>{toast.text}</div>}
      </main>
    );
  }

  if (page === "people" || page === "items") {
    const isItemsPage = page === "items";
    const editorIsOpen = modal === (isItemsPage ? "item-form" : "person-form");
    const records = isItemsPage ? items : people;
    return (
      <main className="app">
        <header className="app-header page-header">
          <div><p className="eyebrow">TAPRI</p><h1>{isItemsPage ? "Items" : "Friends"}</h1><p className="subtitle">{isItemsPage ? "Manage your saved items and default prices." : "Manage the people available on your bills."}</p></div>
        </header>
        <AppNavigation page={page} />
        <section className="section route-section">
          <div className="section-heading"><div><p className="eyebrow">YOUR ACCOUNT</p><h2>{isItemsPage ? "Saved items" : "Your friends"}</h2></div><button className="icon-btn" type="button" aria-label={isItemsPage ? "Add item" : "Add friend"} onClick={() => openEditor(isItemsPage ? "item" : "person")}><Plus aria-hidden="true" /></button></div>
          <div className="manage-toolbar"><span>{records.length} {isItemsPage ? "items" : "friends"}</span><span>Synced to your account</span></div>
          <div className="manage-cigarette-list">
            {records.length === 0 ? <div className="empty-state"><Package aria-hidden="true" /><p>{isItemsPage ? "No items yet." : "No friends yet."}</p></div> : records.map(entry => <article className="manage-cigarette" key={entry.id}><div className="manage-cigarette-main"><div><strong className="manage-cigarette-name">{entry.name}</strong><p className="manage-cigarette-price">{isItemsPage ? `${CATEGORY_LABELS[entry.category] || "Other"} · ${money(entry.price)}` : "Friend"}</p></div><div className="manage-row-actions"><button className="manage-expand-btn" type="button" aria-label={`Edit ${entry.name}`} onClick={() => openEditor(isItemsPage ? "item" : "person", entry)}><Pencil aria-hidden="true" /></button><button className="manage-expand-btn danger-icon" type="button" aria-label={`Delete ${entry.name}`} onClick={() => deleteEntry(isItemsPage ? "item" : "person", entry)}><Trash2 aria-hidden="true" /></button></div></div></article>)}
          </div>
        </section>
        {editorIsOpen && <Modal title={`${editing ? "Edit" : "Add"} ${isItemsPage ? "item" : "friend"}`} eyebrow={isItemsPage ? "ITEM DETAILS" : "FRIEND DETAILS"} onClose={() => { setModal(""); setEditing(null); }}><form onSubmit={submitManagedForm} noValidate><div className="form-group"><label htmlFor="managed-name">{isItemsPage ? "Item name" : "Friend name"}</label><input id="managed-name" value={formName} maxLength={60} onChange={event => setFormName(event.target.value)} required autoFocus /></div>{isItemsPage && <><div className="form-group"><label htmlFor="managed-category">Category</label><AppSelect id="managed-category" value={formCategory} onValueChange={setFormCategory} ariaLabel="Item category" options={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))} /></div><div className="form-group"><label htmlFor="managed-price">Default price</label><div className="price-input"><span>₹</span><input id="managed-price" type="number" min="0" step="0.01" value={formPrice} onChange={event => setFormPrice(event.target.value)} required /></div></div></> }<button className="primary-btn" type="submit" disabled={busy}><Check aria-hidden="true" />{busy ? "Saving…" : editing ? "Save changes" : `Add ${isItemsPage ? "item" : "friend"}`}</button></form></Modal>}
        {toast.text && <div className={`toast show ${toast.error ? "toast-error" : ""}`} role={toast.error ? "alert" : "status"}>{toast.text}</div>}
      </main>
    );
  }

  return (
    <main className="app">
      <header className="app-header">
        <div><p className="eyebrow">TAPRI</p><h1>Tapri</h1><p className="subtitle">Track what the gang bought, who bought it, and how much.</p></div>
        <div className="header-actions">
          <Link className="icon-btn summary-trigger" href="/summary" title="Friend spending summary" aria-label="Friend spending summary"><ChartNoAxesCombined aria-hidden="true" /></Link>
        </div>
      </header>
      <AppNavigation page={page} />

      <div className="group-bar"><div><span className="eyebrow">SIGNED IN</span><strong>{user.email}</strong></div><span className="summary-status"><Cloud aria-hidden="true" /> Synced to your account</span></div>

      {fatalError && <p className="inline-error" role="alert"><TriangleAlert aria-hidden="true" />{fatalError}</p>}

      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">CURRENT SESSION</p><h2>Tapri Bill</h2></div></div>
        <div className="session-name-field"><label htmlFor="session-name">Place / session name</label><input id="session-name" maxLength={60} value={sessionName} onChange={event => updateSessionName(event.target.value)} placeholder="e.g. College canteen" /></div>
        <div className="quick-add-card"><div className="quick-add-title"><div><p className="eyebrow">QUICK ADD</p><h3>Who bought what?</h3></div><ShoppingBag aria-hidden="true" /></div><div className="quick-add-fields"><div className="quick-field"><label htmlFor="person-select">Friend</label><AppSelect id="person-select" value={selectedPerson} onValueChange={setSelectedPerson} placeholder="Choose friend" ariaLabel="Friend" disabled={!people.length} options={people.map(person => ({ value: person.id, label: person.name }))} /></div><div className="quick-field"><label htmlFor="item-select">Item</label><AppSelect id="item-select" value={selectedItem} onValueChange={setSelectedItem} placeholder="Choose item" ariaLabel="Item" disabled={!items.length} options={Object.keys(CATEGORY_LABELS).map(category => {
            const categoryItems = items.filter(item => item.category === category);
            return categoryItems.length ? { label: CATEGORY_LABELS[category], options: categoryItems.map(item => ({ value: item.id, label: `${item.name} — ${money(item.price)}` })) } : null;
          }).filter(Boolean)} /></div><div className="quick-field"><label htmlFor="quantity">Quantity</label><input id="quantity" type="number" min="1" step="1" inputMode="numeric" value={quantity} onChange={event => setQuantity(event.target.value)} /></div></div><button className="add-session-btn" type="button" disabled={!selectedPerson || !selectedItem || !Number.isSafeInteger(Number(quantity)) || Number(quantity) < 1} onClick={addToDraft}><Plus aria-hidden="true" />Add to session</button></div>

        <div className="session-items">
          {draftEntries.length === 0 ? <div className="empty-state"><ShoppingBag aria-hidden="true" /><p>Nothing added yet. Choose a friend and an item above.</p></div> : draftEntries.map(entry => <article className="session-item" key={entry.id}><div className="session-item-info"><div className="session-item-name">{entry.name}</div><div className="session-item-meta"><span className="buyer-name">{people.find(person => person.id === entry.personId)?.name || "Unknown"}</span><span className="buyer-dot" /><span>{money(entry.price)} each</span></div></div><div className="session-controls"><button className="quantity-btn" type="button" aria-label={`Decrease ${entry.name}`} onClick={() => changeQuantity(entry.id, -1)}><Minus aria-hidden="true" /></button><span className="session-quantity">{entry.quantity}</span><button className="quantity-btn" type="button" aria-label={`Increase ${entry.name}`} onClick={() => changeQuantity(entry.id, 1)}><Plus aria-hidden="true" /></button></div><strong className="session-item-cost">{money(entry.quantity * entry.price)}</strong></article>)}
        </div>
        {draftByPerson.length > 0 && <section className="current-friend-summary" aria-labelledby="current-friend-summary-title"><div className="section-heading"><div><p className="eyebrow">CURRENT BILL</p><h2 id="current-friend-summary-title">By friend</h2></div></div><div className="current-friend-list">{draftByPerson.map(summary => <article className="current-friend-row" key={summary.person.id}><div className="current-friend-heading"><strong>{summary.person.name}</strong><span>{summary.totalItems} items · {money(summary.totalCost)}</span></div><div className="current-friend-items">{summary.entries.map(entry => <div key={entry.id}><span>{entry.name} × {entry.quantity}</span><span>{money(entry.price * entry.quantity)}</span></div>)}</div></article>)}</div><div className="current-friend-total"><span>Total bill · {draftItems} items</span><strong>{money(draftTotal)}</strong></div></section>}
        <button className="primary-btn save-session-btn" type="button" disabled={busy || draftEntries.length === 0} onClick={saveSession}><Save aria-hidden="true" />Save session</button>
      </section>

      <section className="section history-section"><div className="section-heading"><div><p className="eyebrow">HISTORY</p><h2>Today’s Sessions</h2></div><div className="history-tools"><AppSelect className="history-filter" ariaLabel="Filter history by friend" value={historyPersonFilter} onValueChange={setHistoryPersonFilter} placeholder="All friends" disabled={!people.length} options={people.map(person => ({ value: person.id, label: person.name }))} /><History aria-hidden="true" /></div></div>
        <div className="history-list">{todayHistory.length === 0 ? <div className="empty-state"><History aria-hidden="true" /><p>No sessions saved today.</p></div> : todayHistory.map(session => {
          const itemCount = session.items.reduce((sum, entry) => sum + entry.quantity, 0);
          const total = session.items.reduce((sum, entry) => sum + entry.quantity * entry.price, 0);
          const grouped = people.map(person => ({ person, entries: session.items.filter(entry => entry.personId === person.id) })).filter(entry => entry.entries.length);
          const unassigned = session.items.filter(entry => !people.some(person => person.id === entry.personId));
          if (unassigned.length) grouped.push({ person: { id: "unknown", name: unassigned[0].purchaser || "Unknown" }, entries: unassigned });
          return <article className="history-card" key={session.id}><div className="history-head"><div><strong className="history-session-name">{session.name || "Unnamed session"}</strong><time className="history-time" dateTime={session.date}>{new Date(session.date).toLocaleString([], { dateStyle: "long", timeStyle: "short" })}</time></div><button className="icon-btn danger-icon" type="button" aria-label={`Delete ${session.name || "session"}`} onClick={() => deleteSession(session.id)}><Trash2 aria-hidden="true" /></button></div>{grouped.map(({ person, entries }) => <section className="history-person-group" key={person.id}><div className="history-person-heading"><div className="history-person-title"><span className="history-person-avatar" aria-hidden="true">{person.name.trim().charAt(0).toUpperCase()}</span><strong>{person.name}</strong></div><span className="history-person-total">{entries.reduce((sum, entry) => sum + entry.quantity, 0)} items · {money(entries.reduce((sum, entry) => sum + entry.quantity * entry.price, 0))}</span></div>{entries.map(entry => <div className="history-cigarette" key={entry.id}><span>{entry.name} × {entry.quantity}</span><strong>{money(entry.quantity * entry.price)}</strong></div>)}</section>)}<div className="history-total"><span>{historyPersonFilter ? "Friend total" : "Bill total"} · {itemCount} items</span><strong>{money(total)}</strong></div></article>;
        })}</div>
      </section>

      {toast.text && <div className={`toast show ${toast.error ? "toast-error" : ""}`} role={toast.error ? "alert" : "status"}>{toast.text}</div>}
    </main>
  );
}