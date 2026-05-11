import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BarChart3, Bell, BookOpen, CheckCircle2, ClipboardList,
  LayoutDashboard, LogOut, MessageSquareText, Send, Settings,
  ShieldCheck, Sparkles, UsersRound, AlertCircle, Loader2
} from "lucide-react";
import "./styles.css";

const API = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

// ── API helper ────────────────────────────────────────────────────────────────
function getToken() { return localStorage.getItem("leadon_token"); }

async function api(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

// ── Auth context ──────────────────────────────────────────────────────────────
const AuthCtx = React.createContext(null);

function useAuth() { return React.useContext(AuthCtx); }

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("leadon_user")); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function login(email, password) {
    setLoading(true); setError("");
    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      localStorage.setItem("leadon_token", data.token);
      localStorage.setItem("leadon_user", JSON.stringify(data.user));
      setUser(data.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("leadon_token");
    localStorage.removeItem("leadon_user");
    setUser(null);
  }

  return (
    <AuthCtx.Provider value={{ user, login, logout, loading, error, setError }}>
      {children}
    </AuthCtx.Provider>
  );
}

// ── Hooks ─────────────────────────────────────────────────────────────────────
function useFetch(path, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await api(path)); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [path]);

  useEffect(() => { load(); }, deps);
  return { data, loading, error, reload: load };
}

// ── Small UI pieces ───────────────────────────────────────────────────────────
function Badge({ label }) { return <span className="badge">{label}</span>; }

function Spinner() {
  return <div className="flex items-center justify-center py-10"><Loader2 className="animate-spin text-spruce" size={28} /></div>;
}

function ErrorBox({ msg }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-coral/40 bg-coral/10 px-4 py-3 text-sm text-coral">
      <AlertCircle size={16} /> {msg}
    </div>
  );
}

function Metric({ title, value, detail, tone }) {
  return (
    <article className={`metric metric-${tone}`}>
      <p>{title}</p>
      <strong>{value ?? "—"}</strong>
      <span>{detail}</span>
    </article>
  );
}

// ── Login screen ──────────────────────────────────────────────────────────────
function LoginScreen() {
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState("admin@leadon.com");
  const [password, setPassword] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    login(email, password);
  }

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center">
      <section className="panel w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-spruce text-white">
            <Sparkles size={20} />
          </div>
          <div>
            <p className="text-lg font-semibold">LeadOn</p>
            <p className="text-sm text-quiet">Sign in to continue</p>
          </div>
        </div>
        {error && <ErrorBox msg={error} />}
        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" required />
          </label>
          <label className="field">
            <span>Password</span>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" required />
          </label>
          <button className="primary-button w-full justify-center" type="submit" disabled={loading}>
            {loading ? <Loader2 size={17} className="animate-spin" /> : <ShieldCheck size={17} />}
            <span>{loading ? "Signing in…" : "Sign in"}</span>
          </button>
        </form>
        <div className="mt-4 rounded-md bg-paper border border-line p-3 text-xs text-quiet space-y-1">
          <p className="font-medium text-ink">Demo accounts:</p>
          <p>admin@leadon.com / Admin@1234</p>
          <p>leader@leadon.com / Leader@1234</p>
          <p>employee@leadon.com / Employee@1234</p>
        </div>
      </section>
    </main>
  );
}

// ── Dashboard view ────────────────────────────────────────────────────────────
function DashboardView() {
  const { data, loading, error } = useFetch("/progress/dashboard");
  const { data: stagesData } = useFetch("/progress/hkm-stages");

  if (loading) return <Spinner />;
  if (error) return <ErrorBox msg={error} />;

  const d = data || {};
  const stages = stagesData?.stages || [];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title="Total users" value={d.totalUsers} detail="In your organization" tone="spruce" />
        <Metric title="Teams" value={d.totalTeams} detail="Active teams" tone="river" />
        <Metric title="Pending check-ins" value={d.pendingCheckins} detail="Awaiting response" tone="coral" />
        <Metric title="Unread notifications" value={d.pendingNotifications} detail="In your queue" tone="spruce" />
      </div>

      {d.recentMessages?.length > 0 && (
        <section className="panel">
          <div className="section-heading">
            <div><p className="eyebrow">Messages</p><h2>Recent activity</h2></div>
          </div>
          <div className="space-y-2">
            {d.recentMessages.map(m => (
              <div className="list-row" key={m.id}>
                <div>
                  <p className="font-medium">{m.sender?.firstName} {m.sender?.lastName}</p>
                  <p className="text-sm text-quiet">{m.body.slice(0, 80)}</p>
                </div>
                <Badge label={m.type} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="panel">
        <div className="section-heading">
          <div><p className="eyebrow">HKM</p><h2>Growth stages</h2></div>
        </div>
        <div className="stage-grid">
          {stages.map((stage) => (
            <div className="stage" key={stage.id}>
              <span>{stage.position}</span>
              <p>{stage.name}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ── Teams view ────────────────────────────────────────────────────────────────
function TeamsView() {
  const { data, loading, error, reload } = useFetch("/teams");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");

  async function createTeam(e) {
    e.preventDefault(); setSaving(true); setFormErr("");
    try {
      await api("/teams", { method: "POST", body: JSON.stringify({ name }) });
      setName(""); setShowForm(false); reload();
    } catch (err) { setFormErr(err.message); }
    finally { setSaving(false); }
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorBox msg={error} />;

  const teams = data?.teams || [];

  return (
    <section className="panel space-y-4">
      <div className="section-heading">
        <div><p className="eyebrow">Teams</p><h2>Leader groups</h2></div>
        <button className="primary-button" type="button" onClick={() => setShowForm(!showForm)}>
          <ShieldCheck size={17} /><span>Create team</span>
        </button>
      </div>

      {showForm && (
        <form onSubmit={createTeam} className="flex gap-2">
          <input
            className="flex-1 rounded-md border border-line bg-paper px-3 py-2 text-sm"
            placeholder="Team name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <span>Save</span>}
          </button>
        </form>
      )}
      {formErr && <ErrorBox msg={formErr} />}

      {teams.length === 0
        ? <p className="text-quiet text-sm">No teams yet. Create one above.</p>
        : teams.map(team => (
          <div className="list-row" key={team.id}>
            <div>
              <p className="font-medium">{team.name}</p>
              <p className="text-sm text-quiet">
                {team.leader ? `Led by ${team.leader.firstName} ${team.leader.lastName}` : "No leader assigned"}
                {" · "}{team._count?.members ?? 0} members
              </p>
            </div>
            <Badge label={team.leader ? "Active" : "Needs leader"} />
          </div>
        ))
      }
    </section>
  );
}

// ── Users view ────────────────────────────────────────────────────────────────
function UsersView() {
  const { data, loading, error } = useFetch("/organizations/me/users");

  if (loading) return <Spinner />;
  if (error) return <ErrorBox msg={error} />;

  const users = data?.users || [];

  return (
    <section className="panel">
      <div className="section-heading">
        <div><p className="eyebrow">Admin</p><h2>User management</h2></div>
      </div>
      {users.length === 0
        ? <p className="text-quiet text-sm">No users found.</p>
        : (
          <div className="responsive-table">
            <table>
              <thead>
                <tr><th>Name</th><th>Email</th><th>Role</th><th>Last login</th></tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td className="font-medium">{u.firstName} {u.lastName}</td>
                    <td className="text-quiet text-sm">{u.email}</td>
                    <td><Badge label={u.role} /></td>
                    <td className="text-sm text-quiet">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "Never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
    </section>
  );
}

// ── Check-ins view ────────────────────────────────────────────────────────────
function CheckinsView() {
  const { data, loading, error, reload } = useFetch("/checkins");
  const { data: usersData } = useFetch("/organizations/me/users");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employeeId: "", title: "", prompt: "" });
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");
  const { user } = useAuth();

  const employees = (usersData?.users || []).filter(u => u.role === "EMPLOYEE");

  async function sendCheckin(e) {
    e.preventDefault(); setSaving(true); setFormErr("");
    try {
      await api("/checkins", { method: "POST", body: JSON.stringify(form) });
      setForm({ employeeId: "", title: "", prompt: "" }); setShowForm(false); reload();
    } catch (err) { setFormErr(err.message); }
    finally { setSaving(false); }
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorBox msg={error} />;

  const checkins = data?.checkins || [];

  return (
    <section className="panel space-y-4">
      <div className="section-heading">
        <div><p className="eyebrow">Check-ins</p><h2>Weekly pulses</h2></div>
        {user?.role !== "EMPLOYEE" && (
          <button className="primary-button" type="button" onClick={() => setShowForm(!showForm)}>
            <Send size={17} /><span>Send check-in</span>
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={sendCheckin} className="space-y-3 rounded-md border border-line p-4">
          <select
            className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm"
            value={form.employeeId}
            onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}
            required
          >
            <option value="">Select employee…</option>
            {employees.map(u => (
              <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
            ))}
          </select>
          <input
            className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm"
            placeholder="Check-in title"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            required
          />
          <textarea
            className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm"
            placeholder="What would you like to ask?"
            rows={3}
            value={form.prompt}
            onChange={e => setForm(f => ({ ...f, prompt: e.target.value }))}
            required
          />
          {formErr && <ErrorBox msg={formErr} />}
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <span>Send</span>}
          </button>
        </form>
      )}

      {checkins.length === 0
        ? <p className="text-quiet text-sm">No check-ins yet.</p>
        : checkins.map(c => (
          <div className="list-row" key={c.id}>
            <div>
              <p className="font-medium">{c.title}</p>
              <p className="text-sm text-quiet">
                {c.employee?.firstName} {c.employee?.lastName}
                {" · "}{new Date(c.createdAt).toLocaleDateString()}
              </p>
            </div>
            <Badge label={c.status} />
          </div>
        ))
      }
    </section>
  );
}

// ── Messages view ─────────────────────────────────────────────────────────────
function MessagesView() {
  const { data, loading, error, reload } = useFetch("/messages");
  const { data: usersData } = useFetch("/organizations/me/users");
  const [form, setForm] = useState({ recipientId: "", body: "", type: "GENERAL" });
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");

  const orgUsers = (usersData?.users || []);

  async function send(e) {
    e.preventDefault(); setSaving(true); setFormErr("");
    try {
      await api("/messages", { method: "POST", body: JSON.stringify(form) });
      setForm(f => ({ ...f, body: "" })); reload();
    } catch (err) { setFormErr(err.message); }
    finally { setSaving(false); }
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorBox msg={error} />;

  const messages = data?.messages || [];

  return (
    <section className="panel space-y-4">
      <div className="section-heading">
        <div><p className="eyebrow">Messages</p><h2>Team conversations</h2></div>
      </div>

      <form onSubmit={send} className="space-y-3 rounded-md border border-line p-4">
        <div className="flex gap-2">
          <select
            className="flex-1 rounded-md border border-line bg-paper px-3 py-2 text-sm"
            value={form.recipientId}
            onChange={e => setForm(f => ({ ...f, recipientId: e.target.value }))}
            required
          >
            <option value="">To…</option>
            {orgUsers.map(u => (
              <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.role})</option>
            ))}
          </select>
          <select
            className="rounded-md border border-line bg-paper px-3 py-2 text-sm"
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
          >
            {["GENERAL", "FEEDBACK", "RECOGNITION", "SUPPORT"].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-md border border-line bg-paper px-3 py-2 text-sm"
            placeholder="Write a message…"
            value={form.body}
            onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
            required
          />
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
        {formErr && <ErrorBox msg={formErr} />}
      </form>

      <div className="space-y-2">
        {messages.length === 0
          ? <p className="text-quiet text-sm">No messages yet.</p>
          : messages.map(m => (
            <div className="list-row" key={m.id}>
              <div>
                <p className="font-medium text-sm">
                  {m.sender?.firstName} {m.sender?.lastName} → {m.recipient?.firstName} {m.recipient?.lastName}
                </p>
                <p className="text-sm text-quiet">{m.body.slice(0, 100)}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge label={m.type} />
                {!m.readAt && <span className="text-xs text-coral">Unread</span>}
              </div>
            </div>
          ))
        }
      </div>
    </section>
  );
}

// ── Notifications view ────────────────────────────────────────────────────────
function NotificationsView() {
  const { data, loading, error, reload } = useFetch("/notifications");
  const [marking, setMarking] = useState(false);

  async function markAll() {
    setMarking(true);
    try { await api("/notifications/read-all", { method: "PATCH" }); reload(); }
    catch {}
    finally { setMarking(false); }
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorBox msg={error} />;

  const notifs = data?.notifications || [];
  const unread = notifs.filter(n => n.status !== "READ").length;

  return (
    <section className="panel space-y-4">
      <div className="section-heading">
        <div><p className="eyebrow">Notifications</p><h2>{unread} unread</h2></div>
        {unread > 0 && (
          <button className="secondary-button" type="button" onClick={markAll} disabled={marking}>
            <CheckCircle2 size={16} /><span>Mark all read</span>
          </button>
        )}
      </div>
      {notifs.length === 0
        ? <p className="text-quiet text-sm">No notifications.</p>
        : notifs.map(n => (
          <div className={`list-row ${n.status === "READ" ? "opacity-50" : ""}`} key={n.id}>
            <div>
              <p className="font-medium text-sm">{n.title}</p>
              <p className="text-sm text-quiet">{n.body}</p>
            </div>
            <Badge label={n.status} />
          </div>
        ))
      }
    </section>
  );
}

// ── Learning view ─────────────────────────────────────────────────────────────
function LearningView() {
  const { data, loading, error, reload } = useFetch("/learning");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", contentUrl: "", estimatedMins: "" });
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");
  const { user } = useAuth();

  async function createItem(e) {
    e.preventDefault(); setSaving(true); setFormErr("");
    try {
      const payload = { ...form };
      if (payload.estimatedMins) payload.estimatedMins = Number(payload.estimatedMins);
      else delete payload.estimatedMins;
      if (!payload.contentUrl) delete payload.contentUrl;
      await api("/learning", { method: "POST", body: JSON.stringify(payload) });
      setForm({ title: "", description: "", contentUrl: "", estimatedMins: "" });
      setShowForm(false); reload();
    } catch (err) { setFormErr(err.message); }
    finally { setSaving(false); }
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorBox msg={error} />;

  const items = data?.items || [];

  return (
    <section className="panel space-y-4">
      <div className="section-heading">
        <div><p className="eyebrow">Learning</p><h2>Microlearning library</h2></div>
        {user?.role !== "EMPLOYEE" && (
          <button className="primary-button" type="button" onClick={() => setShowForm(!showForm)}>
            <BookOpen size={17} /><span>Add item</span>
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={createItem} className="space-y-3 rounded-md border border-line p-4">
          <input className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm"
            placeholder="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          <input className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm"
            placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <input className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm"
            placeholder="Content URL (optional)" value={form.contentUrl} onChange={e => setForm(f => ({ ...f, contentUrl: e.target.value }))} />
          <input className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm"
            placeholder="Estimated minutes" type="number" value={form.estimatedMins} onChange={e => setForm(f => ({ ...f, estimatedMins: e.target.value }))} />
          {formErr && <ErrorBox msg={formErr} />}
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <span>Save</span>}
          </button>
        </form>
      )}

      {items.length === 0
        ? <p className="text-quiet text-sm">No learning items yet.</p>
        : items.map(item => (
          <div className="list-row" key={item.id}>
            <div>
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-quiet">
                {item.description ? item.description.slice(0, 60) : "No description"}
                {item.estimatedMins ? ` · ${item.estimatedMins} min` : ""}
              </p>
            </div>
            <Badge label={item.hkmStage?.name || "General"} />
          </div>
        ))
      }
    </section>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
const NAV = [
  ["Dashboard", LayoutDashboard],
  ["Teams", ShieldCheck],
  ["Users", UsersRound],
  ["Check-ins", ClipboardList],
  ["Messages", MessageSquareText],
  ["Learning", BookOpen],
  ["Notifications", Bell],
  ["Reports", BarChart3],
];

function App() {
  const { user, logout } = useAuth();
  const [activeView, setActiveView] = useState("Dashboard");

  const view = useMemo(() => {
    switch (activeView) {
      case "Teams": return <TeamsView />;
      case "Users": return <UsersView />;
      case "Check-ins": return <CheckinsView />;
      case "Messages": return <MessagesView />;
      case "Learning": return <LearningView />;
      case "Notifications": return <NotificationsView />;
      case "Reports": return <ReportsView />;
      default: return <DashboardView />;
    }
  }, [activeView]);

  if (!user) return <LoginScreen />;

  return (
    <main className="min-h-screen bg-paper text-ink">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-white/90 px-4 py-5 lg:block">
        <div className="mb-7 flex items-center gap-3 px-2">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-spruce text-white">
            <Sparkles size={20} />
          </div>
          <div>
            <p className="text-lg font-semibold">LeadOn</p>
            <p className="text-sm text-quiet">Growth dashboard</p>
          </div>
        </div>
        <nav className="space-y-1">
          {NAV.map(([item, Icon]) => (
            <button key={item} className={`nav-button ${activeView === item ? "nav-button-active" : ""}`}
              onClick={() => setActiveView(item)} type="button">
              <Icon size={18} /><span>{item}</span>
            </button>
          ))}
        </nav>
        <div className="absolute bottom-5 left-4 right-4 rounded-md border border-line bg-paper p-3">
          <p className="text-sm font-medium truncate">{user.firstName} {user.lastName}</p>
          <p className="text-xs text-quiet truncate">{user.email}</p>
          <p className="mt-1 text-xs"><Badge label={user.role} /></p>
          <button className="mt-3 icon-button w-full justify-center gap-2 text-sm" onClick={logout} type="button">
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>

      <section className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur md:px-7">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-spruce">{user.role}</p>
              <h1 className="text-2xl font-semibold">{activeView}</h1>
            </div>
            <button className="icon-button lg:hidden" onClick={logout} title="Sign out"><LogOut size={18} /></button>
          </div>
        </header>
        <div className="px-4 py-5 md:px-7">{view}</div>
      </section>
    </main>
  );
}

function ReportsView() {
  const { data: orgData } = useFetch("/organizations/me");
  const { data: dashData } = useFetch("/progress/dashboard");
  const org = orgData?.organization;
  const d = dashData || {};
  return (
    <section className="panel">
      <div className="section-heading"><div><p className="eyebrow">Reports</p><h2>Organization pulse</h2></div></div>
      <div className="grid gap-4 md:grid-cols-2">
        <Metric title="Organization" value={org?.name || "—"} detail={`Slug: ${org?.slug || "—"}`} tone="river" />
        <Metric title="Total users" value={org?._count?.users} detail="All roles" tone="spruce" />
        <Metric title="Total teams" value={org?._count?.teams} detail="Active teams" tone="river" />
        <Metric title="Pending check-ins" value={d.pendingCheckins} detail="Needs response" tone="coral" />
      </div>
    </section>
  );
}

createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
