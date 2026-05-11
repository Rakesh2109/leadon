import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertCircle, BarChart3, Bell, BookOpen, CheckCircle2, ChevronDown,
  ChevronUp, ClipboardList, LayoutDashboard, Loader2, LogOut,
  MessageSquareText, Plus, Send, Settings, ShieldCheck, Sparkles,
  UserCircle, UserPlus, UsersRound, X, TrendingUp, Clock, Star,
  CheckCheck, Mail, Link2
} from "lucide-react";
import "./styles.css";

const API = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

// ── In-memory token store (never touches localStorage/sessionStorage) ──────────
let _accessToken = null;
let _refreshPromise = null; // deduplicate parallel refresh calls

function getToken() { return _accessToken; }
function setToken(t) { _accessToken = t; }

async function silentRefresh() {
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = fetch(`${API}/auth/refresh`, { method: "POST", credentials: "include" })
    .then(r => r.ok ? r.json() : null)
    .finally(() => { _refreshPromise = null; });
  return _refreshPromise;
}

async function apiRequest(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  if (res.status === 401 && !options._retry) {
    try {
      const refreshData = await silentRefresh();
      if (refreshData?.accessToken) {
        setToken(refreshData.accessToken);
        return apiRequest(path, { ...options, _retry: true });
      }
    } catch (_) { /* fall through */ }
    setToken(null);
    window.dispatchEvent(new Event("leadon:logout"));
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

// ── GET request cache (30s TTL, in-flight deduplication) ──────────────────────
const _cache = new Map();   // path → { data, expires }
const _inflight = new Map(); // path → Promise

function invalidateCache(prefix) {
  for (const key of _cache.keys()) {
    if (key.startsWith(prefix)) _cache.delete(key);
  }
}

function api(path, options = {}) {
  const isGet = !options.method || options.method === "GET";
  if (!isGet) {
    // Bust cache for the affected resource on mutations
    const segment = "/" + path.split("/")[1];
    invalidateCache(segment);
    return apiRequest(path, options);
  }
  const cached = _cache.get(path);
  if (cached && Date.now() < cached.expires) return Promise.resolve(cached.data);
  if (_inflight.has(path)) return _inflight.get(path);

  const req = apiRequest(path, options).then((data) => {
    _cache.set(path, { data, expires: Date.now() + 30_000 });
    _inflight.delete(path);
    return data;
  }).catch((err) => {
    _inflight.delete(path);
    throw err;
  });
  _inflight.set(path, req);
  return req;
}

// ── Auth context ──────────────────────────────────────────────────────────────
const AuthCtx = React.createContext(null);
function useAuth() { return React.useContext(AuthCtx); }

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Attempt silent restore via refresh token cookie on first load
  useEffect(() => {
    fetch(`${API}/auth/refresh`, { method: "POST", credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.accessToken) { setToken(data.accessToken); setUser(data.user); }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    const handleLogout = () => { setToken(null); setUser(null); };
    window.addEventListener("leadon:logout", handleLogout);
    return () => window.removeEventListener("leadon:logout", handleLogout);
  }, []);

  async function login(email, password) {
    setLoading(true); setError("");
    try {
      const data = await api("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      setToken(data.accessToken);
      setUser(data.user);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function logout() {
    try { await api("/auth/logout", { method: "POST" }); } catch (_) {}
    setToken(null);
    setUser(null);
  }

  return <AuthCtx.Provider value={{ user, login, logout, loading, error }}>{children}</AuthCtx.Provider>;
}

// ── Fetch hook ────────────────────────────────────────────────────────────────
function useFetch(path) {
  const cached = path ? _cache.get(path) : null;
  const [data, setData] = useState(cached?.data ?? null);
  const [loading, setLoading] = useState(!!path && !cached);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!path) return;
    setLoading(true); setError(null);
    try { setData(await api(path)); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [path]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load };
}

// ── Shared org data context (avoids duplicate /organizations/me/users calls) ──
// Only fetches once user is authenticated — prevents unauthenticated 401s
const OrgCtx = React.createContext({ users: [], reload: () => {} });
function useOrgUsers() { return React.useContext(OrgCtx); }

function OrgProvider({ children }) {
  const { user } = useAuth();
  const { data, reload } = useFetch(user ? "/organizations/me/users" : null);
  const users = useMemo(() => data?.users || [], [data]);
  return <OrgCtx.Provider value={{ users, reload }}>{children}</OrgCtx.Provider>;
}

// ── UI primitives ─────────────────────────────────────────────────────────────
function Spinner() {
  return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-spruce" size={32} /></div>;
}

function ErrorBox({ msg }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <AlertCircle size={16} className="shrink-0" /> {msg}
    </div>
  );
}

function Empty({ icon: Icon, text }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-quiet">
      <Icon size={36} strokeWidth={1.2} />
      <p className="text-sm">{text}</p>
    </div>
  );
}

const ROLE_COLORS = {
  ADMIN: "bg-purple-100 text-purple-700",
  LEADER: "bg-blue-100 text-blue-700",
  EMPLOYEE: "bg-green-100 text-green-700",
  MEMBER: "bg-gray-100 text-gray-600",
};

const STATUS_COLORS = {
  SENT: "bg-yellow-100 text-yellow-700",
  RESPONDED: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
  CLOSED: "bg-gray-100 text-gray-500",
  DRAFT: "bg-gray-100 text-gray-500",
  PENDING: "bg-yellow-100 text-yellow-700",
  READ: "bg-gray-100 text-gray-500",
  FEEDBACK: "bg-blue-100 text-blue-700",
  RECOGNITION: "bg-yellow-100 text-yellow-700",
  SUPPORT: "bg-red-100 text-red-700",
  GENERAL: "bg-gray-100 text-gray-600",
  ASSIGNED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-green-100 text-green-700",
};

function Badge({ label }) {
  const cls = STATUS_COLORS[label] || ROLE_COLORS[label] || "bg-gray-100 text-gray-600";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

function Avatar({ name, size = "md" }) {
  const initials = name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  const sz = size === "sm" ? "h-7 w-7 text-xs" : size === "lg" ? "h-11 w-11 text-base" : "h-9 w-9 text-sm";
  const colors = ["bg-spruce", "bg-river", "bg-purple-500", "bg-orange-400", "bg-pink-500"];
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length];
  return <div className={`${sz} ${color} flex shrink-0 items-center justify-center rounded-full font-semibold text-white`}>{initials}</div>;
}

function MetricCard({ title, value, detail, icon: Icon, color = "spruce" }) {
  const colors = {
    spruce: "bg-emerald-50 text-emerald-700 border-emerald-100",
    river: "bg-blue-50 text-blue-700 border-blue-100",
    coral: "bg-red-50 text-red-700 border-red-100",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
  };
  return (
    <article className={`rounded-xl border p-5 ${colors[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="mt-1 text-3xl font-bold">{value ?? "—"}</p>
          <p className="mt-1 text-xs opacity-70">{detail}</p>
        </div>
        {Icon && <div className="rounded-lg bg-white/60 p-2"><Icon size={20} /></div>}
      </div>
    </article>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h3 className="font-semibold text-lg">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}

function Input({ ...props }) {
  return <input className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm focus:border-spruce focus:outline-none focus:ring-1 focus:ring-spruce" {...props} />;
}

function Select({ children, ...props }) {
  return (
    <select className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm focus:border-spruce focus:outline-none focus:ring-1 focus:ring-spruce" {...props}>
      {children}
    </select>
  );
}

function Textarea({ ...props }) {
  return <textarea className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm focus:border-spruce focus:outline-none focus:ring-1 focus:ring-spruce" rows={3} {...props} />;
}

function Btn({ children, variant = "primary", loading, className = "", ...props }) {
  const base = "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-60";
  const variants = {
    primary: "bg-spruce text-white hover:bg-emerald-700",
    secondary: "border border-line bg-white text-ink hover:bg-gray-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "text-quiet hover:bg-gray-100",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} disabled={loading} {...props}>
      {loading && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  );
}

// ── Login screen ──────────────────────────────────────────────────────────────
function LoginScreen() {
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState("admin@leadon.com");
  const [password, setPassword] = useState("");

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-spruce text-white shadow-lg">
            <Sparkles size={26} />
          </div>
          <h1 className="text-2xl font-bold">LeadOn</h1>
          <p className="text-quiet text-sm">Leadership growth platform</p>
        </div>

        <div className="rounded-2xl border border-line bg-white p-8 shadow-sm">
          {error && <div className="mb-4"><ErrorBox msg={error} /></div>}
          <form className="space-y-4" onSubmit={e => { e.preventDefault(); login(email, password); }}>
            <Field label="Email">
              <Input value={email} onChange={e => setEmail(e.target.value)} type="email" required placeholder="you@company.com" />
            </Field>
            <Field label="Password">
              <Input value={password} onChange={e => setPassword(e.target.value)} type="password" required placeholder="••••••••" />
            </Field>
            <Btn variant="primary" loading={loading} className="w-full justify-center py-2.5" type="submit">
              Sign in
            </Btn>
          </form>

          <div className="mt-6 rounded-xl bg-gray-50 p-4 text-xs text-quiet space-y-1.5">
            <p className="font-semibold text-ink text-sm mb-2">Demo accounts</p>
            {[
              ["Admin", "admin@leadon.com", "Admin@1234"],
              ["Leader", "leader@leadon.com", "Leader@1234"],
              ["Employee", "employee@leadon.com", "Employee@1234"],
            ].map(([role, em, pw]) => (
              <button key={role} onClick={() => { setEmail(em); setPassword(pw); }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 hover:bg-white transition">
                <span className="font-medium text-ink">{role}</span>
                <span>{em}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function DashboardView() {
  const { data, loading, error } = useFetch("/progress/dashboard");
  const { data: stagesData } = useFetch("/progress/hkm-stages");

  if (loading) return <Spinner />;
  if (error) return <ErrorBox msg={error} />;

  const d = data || {};
  const stages = stagesData?.stages || [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Users" value={d.totalUsers} detail="In your organization" icon={UsersRound} color="spruce" />
        <MetricCard title="Active Teams" value={d.totalTeams} detail="Running teams" icon={ShieldCheck} color="river" />
        <MetricCard title="Pending Check-ins" value={d.pendingCheckins} detail="Awaiting response" icon={ClipboardList} color="coral" />
        <MetricCard title="Notifications" value={d.pendingNotifications} detail="Unread alerts" icon={Bell} color="purple" />
      </div>

      {d.recentMessages?.length > 0 && (
        <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-lg flex items-center gap-2"><MessageSquareText size={18} className="text-spruce" /> Recent Messages</h2>
          <div className="space-y-3">
            {d.recentMessages.map(m => (
              <div key={m.id} className="flex items-start gap-3 rounded-xl bg-gray-50 p-3">
                <Avatar name={`${m.sender?.firstName} ${m.sender?.lastName}`} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{m.sender?.firstName} {m.sender?.lastName}</p>
                  <p className="text-sm text-quiet truncate">{m.body}</p>
                </div>
                <Badge label={m.type} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-lg flex items-center gap-2"><TrendingUp size={18} className="text-spruce" /> HKM Growth Stages</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {stages.map(stage => (
            <div key={stage.id} className="rounded-xl border border-line bg-gradient-to-b from-emerald-50 to-white p-4 text-center">
              <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-spruce text-white text-sm font-bold">
                {stage.position}
              </div>
              <p className="text-xs font-medium leading-tight">{stage.name}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ── Teams ─────────────────────────────────────────────────────────────────────
function TeamsView() {
  const { data, loading, error, reload } = useFetch("/teams");
  const { users: orgUsers } = useOrgUsers();
  const [expandedId, setExpandedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddMember, setShowAddMember] = useState(null);
  const [createForm, setCreateForm] = useState({ name: "", leaderId: "" });
  const [addMemberForm, setAddMemberForm] = useState({ userId: "", role: "MEMBER" });
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");
  const { user } = useAuth();

  const leaders = orgUsers.filter(u => u.role === "LEADER" || u.role === "ADMIN");

  function toggleTeam(id) { setExpandedId(prev => prev === id ? null : id); }

  async function createTeam(e) {
    e.preventDefault(); setSaving(true); setFormErr("");
    try {
      await api("/teams", { method: "POST", body: JSON.stringify({
        name: createForm.name,
        ...(createForm.leaderId ? { leaderId: createForm.leaderId } : {})
      })});
      setCreateForm({ name: "", leaderId: "" });
      setShowCreate(false);
      reload();
    } catch (err) { setFormErr(err.message); }
    finally { setSaving(false); }
  }

  async function addMember(e) {
    e.preventDefault(); setSaving(true); setFormErr("");
    try {
      await api(`/teams/${showAddMember}/members`, { method: "POST", body: JSON.stringify(addMemberForm) });
      setShowAddMember(null);
      setAddMemberForm({ userId: "", role: "MEMBER" });
      reload();
    } catch (err) { setFormErr(err.message); }
    finally { setSaving(false); }
  }

  async function removeMember(teamId, userId) {
    try {
      await api(`/teams/${teamId}/members/${userId}`, { method: "DELETE" });
      reload();
    } catch {}
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorBox msg={error} />;

  const teams = data?.teams || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Teams</h2>
          <p className="text-sm text-quiet">{teams.length} team{teams.length !== 1 ? "s" : ""} in your organization</p>
        </div>
        {(user?.role === "ADMIN" || user?.role === "LEADER") && (
          <Btn onClick={() => setShowCreate(true)}><Plus size={16} /> Create Team</Btn>
        )}
      </div>

      {teams.length === 0
        ? <Empty icon={UsersRound} text="No teams yet. Create one to get started." />
        : teams.map(team => {
          const isOpen = expandedId === team.id;
          const members = team.members || [];

          return (
            <div key={team.id} className="rounded-2xl border border-line bg-white shadow-sm overflow-hidden">
              {/* Team header row */}
              <button
                className="flex w-full items-center gap-4 p-5 text-left hover:bg-gray-50 transition"
                onClick={() => toggleTeam(team.id)}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-spruce font-bold text-lg">
                  {team.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-base">{team.name}</p>
                  <p className="text-sm text-quiet">
                    {team.leader
                      ? <>Led by <span className="font-medium text-ink">{team.leader.firstName} {team.leader.lastName}</span></>
                      : <span className="text-amber-600">No leader assigned</span>
                    }
                    {" · "}
                    <span>{team._count?.members ?? 0} member{team._count?.members !== 1 ? "s" : ""}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {team.leader
                    ? <Badge label="Active" />
                    : <Badge label="Needs Leader" />
                  }
                  {isOpen ? <ChevronUp size={18} className="text-quiet" /> : <ChevronDown size={18} className="text-quiet" />}
                </div>
              </button>

              {/* Expanded team detail */}
              {isOpen && (
                <div className="border-t border-line px-5 pb-5 pt-4">
                  {/* Leader card */}
                  {team.leader && (
                    <div className="mb-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-quiet">Team Leader</p>
                      <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-3">
                        <Avatar name={`${team.leader.firstName} ${team.leader.lastName}`} size="md" />
                        <div>
                          <p className="font-semibold">{team.leader.firstName} {team.leader.lastName}</p>
                          <p className="text-sm text-quiet flex items-center gap-1"><Mail size={12} />{team.leader.email}</p>
                        </div>
                        <Badge label="LEADER" />
                      </div>
                    </div>
                  )}

                  {/* Members */}
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-quiet">
                      Members ({members.length})
                    </p>
                    {(user?.role === "ADMIN" || user?.role === "LEADER") && (
                      <Btn variant="secondary" className="text-xs py-1 px-3"
                        onClick={() => { setShowAddMember(team.id); setFormErr(""); }}>
                        <UserPlus size={13} /> Add Member
                      </Btn>
                    )}
                  </div>

                  {members.length === 0
                    ? <p className="text-sm text-quiet py-2">No members yet. Add someone above.</p>
                    : (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {members.map(m => (
                            <div key={m.id} className="flex items-center gap-3 rounded-xl border border-line bg-gray-50 p-3">
                              <Avatar name={`${m.user.firstName} ${m.user.lastName}`} size="sm" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{m.user.firstName} {m.user.lastName}</p>
                                <p className="text-xs text-quiet truncate">{m.user.email}</p>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Badge label={m.user.role} />
                                {(user?.role === "ADMIN") && (
                                  <button
                                    onClick={() => removeMember(team.id, m.user.id)}
                                    className="rounded p-0.5 text-quiet hover:text-red-600 hover:bg-red-50 transition"
                                    title="Remove member"
                                  >
                                    <X size={13} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                  }
                </div>
              )}
            </div>
          );
        })
      }

      {/* Create Team Modal */}
      {showCreate && (
        <Modal title="Create New Team" onClose={() => { setShowCreate(false); setFormErr(""); }}>
          <form onSubmit={createTeam} className="space-y-4">
            <Field label="Team Name">
              <Input value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Engineering Team" required />
            </Field>
            <Field label="Assign Leader (optional)">
              <Select value={createForm.leaderId} onChange={e => setCreateForm(f => ({ ...f, leaderId: e.target.value }))}>
                <option value="">No leader yet</option>
                {leaders.map(l => <option key={l.id} value={l.id}>{l.firstName} {l.lastName}</option>)}
              </Select>
            </Field>
            {formErr && <ErrorBox msg={formErr} />}
            <div className="flex gap-2 justify-end">
              <Btn variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Btn>
              <Btn loading={saving} type="submit">Create Team</Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <Modal title="Add Team Member" onClose={() => { setShowAddMember(null); setFormErr(""); }}>
          <form onSubmit={addMember} className="space-y-4">
            <Field label="Select User">
              <Select value={addMemberForm.userId} onChange={e => setAddMemberForm(f => ({ ...f, userId: e.target.value }))} required>
                <option value="">Choose a user…</option>
                {orgUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName} — {u.role}</option>
                ))}
              </Select>
            </Field>
            <Field label="Role in Team">
              <Select value={addMemberForm.role} onChange={e => setAddMemberForm(f => ({ ...f, role: e.target.value }))}>
                <option value="MEMBER">Member</option>
                <option value="LEADER">Leader</option>
              </Select>
            </Field>
            {formErr && <ErrorBox msg={formErr} />}
            <div className="flex gap-2 justify-end">
              <Btn variant="secondary" type="button" onClick={() => setShowAddMember(null)}>Cancel</Btn>
              <Btn loading={saving} type="submit">Add Member</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── Users ─────────────────────────────────────────────────────────────────────
function UsersView() {
  const { users: all, reload } = useOrgUsers();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const filtered = all.filter(u => {
    const matchSearch = `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase());
    const matchRole = filter === "ALL" || u.role === filter;
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Users</h2>
          <p className="text-sm text-quiet">{all.length} total members</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input className="w-56" placeholder="Search name or email…" value={search} onChange={e => setSearch(e.target.value)} />
        <div className="flex gap-1 rounded-lg border border-line bg-white p-1">
          {["ALL", "ADMIN", "LEADER", "EMPLOYEE"].map(r => (
            <button key={r} onClick={() => setFilter(r)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${filter === r ? "bg-spruce text-white" : "text-quiet hover:bg-gray-100"}`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0
        ? <Empty icon={UserCircle} text="No users match your search." />
        : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(u => (
              <div key={u.id} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm">
                <Avatar name={`${u.firstName} ${u.lastName}`} size="lg" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{u.firstName} {u.lastName}</p>
                  <p className="text-xs text-quiet truncate flex items-center gap-1"><Mail size={11} />{u.email}</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <Badge label={u.role} />
                    {u.lastLoginAt && (
                      <span className="text-xs text-quiet flex items-center gap-1">
                        <Clock size={10} /> {new Date(u.lastLoginAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}

// ── Check-ins ─────────────────────────────────────────────────────────────────
function CheckinsView() {
  const { data, loading, error, reload } = useFetch("/checkins");
  const { users: orgUsers } = useOrgUsers();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employeeId: "", title: "", prompt: "" });
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");
  const { user } = useAuth();

  const employees = orgUsers.filter(u => u.role === "EMPLOYEE");

  async function sendCheckin(e) {
    e.preventDefault(); setSaving(true); setFormErr("");
    try {
      await api("/checkins", { method: "POST", body: JSON.stringify(form) });
      setForm({ employeeId: "", title: "", prompt: "" });
      setShowForm(false); reload();
    } catch (err) { setFormErr(err.message); }
    finally { setSaving(false); }
  }

  const checkins = data?.checkins || [];
  const byStatus = {
    SENT: checkins.filter(c => c.status === "SENT"),
    RESPONDED: checkins.filter(c => c.status === "RESPONDED"),
    OVERDUE: checkins.filter(c => c.status === "OVERDUE"),
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorBox msg={error} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Check-ins</h2>
          <p className="text-sm text-quiet">{checkins.length} total · {byStatus.SENT.length} pending</p>
        </div>
        {user?.role !== "EMPLOYEE" && (
          <Btn onClick={() => setShowForm(true)}><Send size={15} /> Send Check-in</Btn>
        )}
      </div>

      {checkins.length === 0
        ? <Empty icon={ClipboardList} text="No check-ins yet. Send one to get started." />
        : (
          <div className="space-y-3">
            {checkins.map(c => (
              <div key={c.id} className="flex items-start gap-4 rounded-2xl border border-line bg-white p-4 shadow-sm">
                <Avatar name={`${c.employee?.firstName} ${c.employee?.lastName}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{c.title}</p>
                      <p className="text-sm text-quiet">
                        To: <span className="font-medium text-ink">{c.employee?.firstName} {c.employee?.lastName}</span>
                        {c.leader && <> · From: {c.leader.firstName} {c.leader.lastName}</>}
                      </p>
                    </div>
                    <Badge label={c.status} />
                  </div>
                  {c.response && (
                    <div className="mt-2 rounded-lg bg-emerald-50 border border-emerald-100 p-3">
                      <p className="text-xs font-semibold text-emerald-700 mb-1 flex items-center gap-1"><CheckCheck size={12} /> Response</p>
                      <p className="text-sm">{c.response.response}</p>
                      {c.response.mood && <Badge label={c.response.mood} />}
                      {c.response.needsHelp && <span className="ml-2 text-xs font-medium text-red-600">⚠ Needs Help</span>}
                    </div>
                  )}
                  <p className="mt-1 text-xs text-quiet flex items-center gap-1"><Clock size={10} />{new Date(c.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )
      }

      {showForm && (
        <Modal title="Send Check-in" onClose={() => { setShowForm(false); setFormErr(""); }}>
          <form onSubmit={sendCheckin} className="space-y-4">
            <Field label="Employee">
              <Select value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))} required>
                <option value="">Select employee…</option>
                {employees.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
              </Select>
            </Field>
            <Field label="Title">
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Weekly Pulse" required />
            </Field>
            <Field label="Question / Prompt">
              <Textarea value={form.prompt} onChange={e => setForm(f => ({ ...f, prompt: e.target.value }))} placeholder="How are things going this week?" required />
            </Field>
            {formErr && <ErrorBox msg={formErr} />}
            <div className="flex gap-2 justify-end">
              <Btn variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</Btn>
              <Btn loading={saving} type="submit"><Send size={14} /> Send</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── Messages ──────────────────────────────────────────────────────────────────
function MessagesView() {
  const { data, loading, error, reload } = useFetch("/messages");
  const { users: allUsers } = useOrgUsers();
  const [form, setForm] = useState({ recipientId: "", body: "", type: "GENERAL" });
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");
  const { user } = useAuth();

  async function send(e) {
    e.preventDefault(); setSaving(true); setFormErr("");
    try {
      await api("/messages", { method: "POST", body: JSON.stringify(form) });
      setForm(f => ({ ...f, body: "" })); reload();
    } catch (err) { setFormErr(err.message); }
    finally { setSaving(false); }
  }

  const messages = data?.messages || [];
  const orgUsers = allUsers.filter(u => u.id !== user?.id);

  if (loading) return <Spinner />;
  if (error) return <ErrorBox msg={error} />;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Messages</h2>
        <p className="text-sm text-quiet">{messages.length} message{messages.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
        <p className="mb-3 font-medium text-sm">New Message</p>
        <form onSubmit={send} className="space-y-3">
          <div className="flex gap-2">
            <Select value={form.recipientId} onChange={e => setForm(f => ({ ...f, recipientId: e.target.value }))} required>
              <option value="">To…</option>
              {orgUsers.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.role})</option>)}
            </Select>
            <Select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-40">
              {["GENERAL","FEEDBACK","RECOGNITION","SUPPORT"].map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
          </div>
          <div className="flex gap-2">
            <Input value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Write your message…" required className="flex-1" />
            <Btn loading={saving} type="submit"><Send size={15} /></Btn>
          </div>
          {formErr && <ErrorBox msg={formErr} />}
        </form>
      </div>

      {messages.length === 0
        ? <Empty icon={MessageSquareText} text="No messages yet." />
        : (
          <div className="space-y-2">
            {[...messages].reverse().map(m => {
              const isMine = m.senderId === user?.id;
              return (
                <div key={m.id} className={`flex items-start gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm ${isMine ? "border-l-4 border-l-spruce" : ""}`}>
                  <Avatar name={`${m.sender?.firstName} ${m.sender?.lastName}`} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{m.sender?.firstName} {m.sender?.lastName}</span>
                      <span className="text-xs text-quiet">→</span>
                      <span className="text-sm text-quiet">{m.recipient?.firstName} {m.recipient?.lastName}</span>
                      <Badge label={m.type} />
                      {!m.readAt && !isMine && <span className="text-xs font-medium text-emerald-600">● New</span>}
                    </div>
                    <p className="mt-1 text-sm">{m.body}</p>
                    <p className="mt-1 text-xs text-quiet">{new Date(m.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )
      }
    </div>
  );
}

// ── Learning ──────────────────────────────────────────────────────────────────
function LearningView() {
  const { data, loading, error, reload } = useFetch("/learning");
  const myAssignmentsData = useFetch("/learning/my-assignments");
  const { users: orgUsers } = useOrgUsers();
  const [showCreate, setShowCreate] = useState(false);
  const [showAssign, setShowAssign] = useState(null);
  const [createForm, setCreateForm] = useState({ title: "", description: "", contentUrl: "", estimatedMins: "" });
  const [assignForm, setAssignForm] = useState({ employeeId: "" });
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");
  const { user } = useAuth();

  const employees = orgUsers.filter(u => u.role === "EMPLOYEE");

  async function createItem(e) {
    e.preventDefault(); setSaving(true); setFormErr("");
    try {
      const payload = { ...createForm };
      if (payload.estimatedMins) payload.estimatedMins = Number(payload.estimatedMins); else delete payload.estimatedMins;
      if (!payload.contentUrl) delete payload.contentUrl;
      if (!payload.description) delete payload.description;
      await api("/learning", { method: "POST", body: JSON.stringify(payload) });
      setCreateForm({ title: "", description: "", contentUrl: "", estimatedMins: "" });
      setShowCreate(false); reload();
    } catch (err) { setFormErr(err.message); }
    finally { setSaving(false); }
  }

  async function assignItem(e) {
    e.preventDefault(); setSaving(true); setFormErr("");
    try {
      await api(`/learning/${showAssign}/assign`, { method: "POST", body: JSON.stringify(assignForm) });
      setShowAssign(null); setAssignForm({ employeeId: "" });
      myAssignmentsData.reload();
    } catch (err) { setFormErr(err.message); }
    finally { setSaving(false); }
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorBox msg={error} />;

  const items = data?.items || [];
  const myAssignments = myAssignmentsData.data?.assignments || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Learning Library</h2>
          <p className="text-sm text-quiet">{items.length} item{items.length !== 1 ? "s" : ""}</p>
        </div>
        {user?.role !== "EMPLOYEE" && (
          <Btn onClick={() => setShowCreate(true)}><Plus size={15} /> Add Item</Btn>
        )}
      </div>

      {user?.role === "EMPLOYEE" && myAssignments.length > 0 && (
        <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold flex items-center gap-2"><Star size={16} className="text-amber-500" /> My Assignments</h3>
          <div className="space-y-2">
            {myAssignments.map(a => (
              <div key={a.id} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                <BookOpen size={16} className="text-spruce shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.learningItem?.title}</p>
                  {a.dueAt && <p className="text-xs text-quiet">Due {new Date(a.dueAt).toLocaleDateString()}</p>}
                </div>
                <Badge label={a.status} />
              </div>
            ))}
          </div>
        </section>
      )}

      {items.length === 0
        ? <Empty icon={BookOpen} text="No learning items yet." />
        : (
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map(item => (
              <div key={item.id} className="rounded-2xl border border-line bg-white p-5 shadow-sm flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                    <BookOpen size={18} />
                  </div>
                  {item.hkmStage && <Badge label={item.hkmStage.name} />}
                </div>
                <p className="font-semibold">{item.title}</p>
                {item.description && <p className="text-sm text-quiet">{item.description}</p>}
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-3 text-xs text-quiet">
                    {item.estimatedMins && <span className="flex items-center gap-1"><Clock size={11} />{item.estimatedMins} min</span>}
                    {item.contentUrl && <a href={item.contentUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-spruce hover:underline"><Link2 size={11} />Open</a>}
                  </div>
                  {user?.role !== "EMPLOYEE" && (
                    <Btn variant="secondary" className="text-xs py-1 px-3" onClick={() => { setShowAssign(item.id); setFormErr(""); }}>
                      Assign
                    </Btn>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      }

      {showCreate && (
        <Modal title="Add Learning Item" onClose={() => { setShowCreate(false); setFormErr(""); }}>
          <form onSubmit={createItem} className="space-y-4">
            <Field label="Title"><Input value={createForm.title} onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Active Listening" required /></Field>
            <Field label="Description"><Textarea value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} placeholder="What will learners gain?" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Estimated Minutes"><Input type="number" value={createForm.estimatedMins} onChange={e => setCreateForm(f => ({ ...f, estimatedMins: e.target.value }))} placeholder="15" /></Field>
              <Field label="Content URL"><Input value={createForm.contentUrl} onChange={e => setCreateForm(f => ({ ...f, contentUrl: e.target.value }))} placeholder="https://…" /></Field>
            </div>
            {formErr && <ErrorBox msg={formErr} />}
            <div className="flex gap-2 justify-end">
              <Btn variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Btn>
              <Btn loading={saving} type="submit">Save Item</Btn>
            </div>
          </form>
        </Modal>
      )}

      {showAssign && (
        <Modal title="Assign to Employee" onClose={() => { setShowAssign(null); setFormErr(""); }}>
          <form onSubmit={assignItem} className="space-y-4">
            <Field label="Employee">
              <Select value={assignForm.employeeId} onChange={e => setAssignForm(f => ({ ...f, employeeId: e.target.value }))} required>
                <option value="">Select employee…</option>
                {employees.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
              </Select>
            </Field>
            {formErr && <ErrorBox msg={formErr} />}
            <div className="flex gap-2 justify-end">
              <Btn variant="secondary" type="button" onClick={() => setShowAssign(null)}>Cancel</Btn>
              <Btn loading={saving} type="submit">Assign</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── Notifications ─────────────────────────────────────────────────────────────
function NotificationsView() {
  const { data, loading, error, reload } = useFetch("/notifications");

  async function markAll() {
    try { await api("/notifications/read-all", { method: "PATCH" }); reload(); } catch {}
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorBox msg={error} />;

  const notifs = data?.notifications || [];
  const unread = notifs.filter(n => n.status !== "READ").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Notifications</h2>
          <p className="text-sm text-quiet">{unread} unread</p>
        </div>
        {unread > 0 && <Btn variant="secondary" onClick={markAll}><CheckCheck size={15} /> Mark all read</Btn>}
      </div>

      {notifs.length === 0
        ? <Empty icon={Bell} text="No notifications yet." />
        : notifs.map(n => (
          <div key={n.id} className={`flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-sm transition ${n.status !== "READ" ? "border-spruce/30 bg-emerald-50/30" : "border-line opacity-60"}`}>
            <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${n.status !== "READ" ? "bg-spruce" : "bg-gray-300"}`} />
            <div className="flex-1">
              <p className="text-sm font-semibold">{n.title}</p>
              <p className="text-sm text-quiet">{n.body}</p>
              <p className="mt-1 text-xs text-quiet">{new Date(n.createdAt).toLocaleString()}</p>
            </div>
            <Badge label={n.type} />
          </div>
        ))
      }
    </div>
  );
}

// ── Reports ───────────────────────────────────────────────────────────────────
function ReportsView() {
  const { data: orgData } = useFetch("/organizations/me");
  const { data: dashData } = useFetch("/progress/dashboard");
  const org = orgData?.organization;
  const d = dashData || {};

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Reports</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard title="Organization" value={org?.name || "—"} detail={`Slug: ${org?.slug || "—"}`} icon={Settings} color="river" />
        <MetricCard title="Total Users" value={org?._count?.users} detail="All roles combined" icon={UsersRound} color="spruce" />
        <MetricCard title="Active Teams" value={org?._count?.teams} detail="Running teams" icon={ShieldCheck} color="river" />
        <MetricCard title="Pending Check-ins" value={d.pendingCheckins} detail="Need a response" icon={ClipboardList} color="coral" />
      </div>
    </div>
  );
}

// ── App shell ─────────────────────────────────────────────────────────────────
const NAV = [
  ["Dashboard", LayoutDashboard],
  ["Teams", UsersRound],
  ["Users", UserCircle],
  ["Check-ins", ClipboardList],
  ["Messages", MessageSquareText],
  ["Learning", BookOpen],
  ["Notifications", Bell],
  ["Reports", BarChart3],
];

function App() {
  const { user, logout } = useAuth();
  const [active, setActive] = useState("Dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);

  const view = useMemo(() => {
    switch (active) {
      case "Teams": return <TeamsView />;
      case "Users": return <UsersView />;
      case "Check-ins": return <CheckinsView />;
      case "Messages": return <MessagesView />;
      case "Learning": return <LearningView />;
      case "Notifications": return <NotificationsView />;
      case "Reports": return <ReportsView />;
      default: return <DashboardView />;
    }
  }, [active]);

  const { loading: authLoading } = useAuth();
  if (authLoading) return <Spinner />;
  if (!user) return <LoginScreen />;

  function navigate(item) { setActive(item); setMobileOpen(false); }

  return (
    <main className="min-h-screen bg-gray-50 text-ink">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-line bg-white transition-transform lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 border-b border-line px-5 py-5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-spruce text-white"><Sparkles size={18} /></div>
            <div><p className="font-bold">LeadOn</p><p className="text-xs text-quiet">Growth platform</p></div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
            {NAV.map(([item, Icon]) => (
              <button key={item} onClick={() => navigate(item)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active === item ? "bg-spruce text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"}`}>
                <Icon size={17} /> {item}
              </button>
            ))}
          </nav>

          <div className="border-t border-line p-4">
            <div className="flex items-center gap-3 mb-3">
              <Avatar name={`${user.firstName} ${user.lastName}`} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-quiet truncate">{user.email}</p>
              </div>
            </div>
            <Badge label={user.role} />
            <button onClick={logout}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-line py-1.5 text-xs text-quiet hover:bg-gray-50 hover:text-red-600 transition">
              <LogOut size={13} /> Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Main content */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-line bg-white/90 px-5 py-3.5 backdrop-blur flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="rounded-lg p-1.5 hover:bg-gray-100 lg:hidden" onClick={() => setMobileOpen(true)}>
              <div className="space-y-1"><div className="h-0.5 w-4 bg-gray-600"/><div className="h-0.5 w-4 bg-gray-600"/><div className="h-0.5 w-4 bg-gray-600"/></div>
            </button>
            <h1 className="text-lg font-bold">{active}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Avatar name={`${user.firstName} ${user.lastName}`} size="sm" />
            <span className="hidden text-sm font-medium sm:block">{user.firstName}</span>
            <Badge label={user.role} />
          </div>
        </header>
        <div className="p-5 md:p-7">{view}</div>
      </div>
    </main>
  );
}

// Guard against HMR re-executing createRoot on the same container
const container = document.getElementById("root");
const root = container._reactRoot ?? (container._reactRoot = createRoot(container));
root.render(
  <AuthProvider><OrgProvider><App /></OrgProvider></AuthProvider>
);
window.dispatchEvent(new Event("react-ready"));
