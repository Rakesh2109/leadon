import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform,
  SafeAreaView, ScrollView, StatusBar, StyleSheet, Text,
  TextInput, TouchableOpacity, View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

// ── Config ────────────────────────────────────────────────────────────────────
const API_BASE = "https://ahnupha.store/api/v1";

// ── API helpers ───────────────────────────────────────────────────────────────
let _accessToken = null;
let _refreshing = null;

async function silentRefresh() {
  if (_refreshing) return _refreshing;
  _refreshing = fetch(`${API_BASE}/auth/refresh`, { method: "POST", credentials: "include" })
    .then(r => r.ok ? r.json() : null)
    .finally(() => { _refreshing = null; });
  return _refreshing;
}

async function apiFetch(path, opts = {}) {
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (_accessToken) headers["Authorization"] = `Bearer ${_accessToken}`;

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers, credentials: "include" });

  if (res.status === 401 && !opts._retry) {
    const refreshed = await silentRefresh();
    if (refreshed?.accessToken) {
      _accessToken = refreshed.accessToken;
      return apiFetch(path, { ...opts, _retry: true });
    }
    _accessToken = null;
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

// ── Auth context ──────────────────────────────────────────────────────────────
const AuthCtx = createContext(null);
function useAuth() { return useContext(AuthCtx); }

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Try silent refresh on boot
    silentRefresh().then(d => {
      if (d?.accessToken) {
        _accessToken = d.accessToken;
        return apiFetch("/users/me");
      }
    }).then(d => {
      if (d?.user) setUser(d.user);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    setError(""); setLoading(true);
    try {
      const d = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      _accessToken = d.accessToken;
      setUser(d.user);
      registerPush(d.user);
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  }

  async function logout() {
    try { await apiFetch("/auth/logout", { method: "POST" }); } catch {}
    _accessToken = null;
    setUser(null);
  }

  return <AuthCtx.Provider value={{ user, login, logout, loading, error }}>{children}</AuthCtx.Provider>;
}

// ── FCM push registration ─────────────────────────────────────────────────────
async function registerPush(user) {
  if (!Device.isDevice) return;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let perm = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      perm = status;
    }
    if (perm !== "granted") return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : {})).data;
    if (token) {
      await apiFetch("/users/fcm-token", { method: "POST", body: JSON.stringify({ token }) });
    }
  } catch (e) {
    // Non-critical — continue without push
  }
}

// ── Screens ───────────────────────────────────────────────────────────────────
function LoginScreen() {
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState("employee@leadon.com");
  const [password, setPassword] = useState("Employee@1234");

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={s.loginContainer}>
        <View style={s.loginBrand}>
          <View style={s.loginLogo}><Ionicons name="sparkles" size={28} color="#fff" /></View>
          <Text style={s.loginTitle}>LeadOn</Text>
          <Text style={s.loginSub}>Leadership growth platform</Text>
        </View>

        <View style={s.card}>
          {!!error && <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View>}

          <Text style={s.fieldLabel}>Email</Text>
          <TextInput style={s.input} value={email} onChangeText={setEmail}
            autoCapitalize="none" keyboardType="email-address" placeholderTextColor="#8a9694" />

          <Text style={[s.fieldLabel, { marginTop: 12 }]}>Password</Text>
          <TextInput style={s.input} value={password} onChangeText={setPassword}
            secureTextEntry placeholderTextColor="#8a9694" />

          <TouchableOpacity style={[s.primaryButton, { marginTop: 20 }]} onPress={() => login(email, password)} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryButtonText}>Sign in</Text>}
          </TouchableOpacity>

          <View style={s.demoBox}>
            <Text style={s.eyebrow}>Demo accounts</Text>
            {[["Admin","admin@leadon.com","Admin@1234"],["Leader","leader@leadon.com","Leader@1234"],["Employee","employee@leadon.com","Employee@1234"]].map(([role, em, pw]) => (
              <TouchableOpacity key={role} style={s.demoRow} onPress={() => { setEmail(em); setPassword(pw); }}>
                <Text style={s.demoRole}>{role}</Text><Text style={s.demoEmail}>{em}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function HomeScreen() {
  const { user } = useAuth();
  const [dash, setDash] = useState(null);
  const [stages, setStages] = useState([]);
  const [progress, setProgress] = useState([]);

  useEffect(() => {
    apiFetch("/progress/dashboard").then(setDash).catch(() => {});
    apiFetch("/progress/hkm-stages").then(d => setStages(d.stages || [])).catch(() => {});
    apiFetch("/progress/my-progress").then(d => setProgress(d.progress || [])).catch(() => {});
  }, []);

  const latest = progress[0];

  return (
    <ScrollView contentContainerStyle={s.content}>
      <Text style={s.screenTitle}>Hello, {user?.firstName} 👋</Text>
      <Text style={s.muted}>{user?.role} · {user?.email}</Text>

      <View style={[s.row, { marginTop: 16 }]}>
        <View style={s.metricCard}><Text style={s.metricValue}>{dash?.totalUsers ?? "—"}</Text><Text style={s.muted}>Users</Text></View>
        <View style={s.metricCard}><Text style={s.metricValue}>{dash?.totalTeams ?? "—"}</Text><Text style={s.muted}>Teams</Text></View>
        <View style={s.metricCard}><Text style={s.metricValue}>{dash?.pendingCheckins ?? "—"}</Text><Text style={s.muted}>Pending</Text></View>
      </View>

      {latest && (
        <View style={[s.card, { marginTop: 16 }]}>
          <Text style={s.eyebrow}>Your HKM Stage</Text>
          <View style={s.row}>
            <View style={s.stageBadge}><Text style={s.stageBadgeNum}>{latest.hkmStage?.position}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>{latest.hkmStage?.name}</Text>
              {latest.nextStep ? <Text style={s.muted}>Next: {latest.nextStep}</Text> : null}
            </View>
          </View>
        </View>
      )}

      {user?.role !== "EMPLOYEE" && dash?.pendingCheckins > 0 && (
        <View style={[s.nudgeCard, { marginTop: 16 }]}>
          <Ionicons name="alert-circle-outline" size={20} color="#d97706" />
          <Text style={s.nudgeText}>{dash.pendingCheckins} check-in{dash.pendingCheckins > 1 ? "s" : ""} waiting for a response</Text>
        </View>
      )}

      <Text style={[s.sectionTitle, { marginTop: 24 }]}>HKM Growth Journey</Text>
      <View style={s.stageList}>
        {stages.map(stage => (
          <View key={stage.id} style={[s.stageItem, latest?.hkmStage?.id === stage.id && s.stageItemActive]}>
            <View style={[s.stageNum, latest?.hkmStage?.id === stage.id && s.stageNumActive]}>
              <Text style={[s.stageNumText, latest?.hkmStage?.id === stage.id && { color: "#fff" }]}>{stage.position}</Text>
            </View>
            <Text style={[s.stageLabel, latest?.hkmStage?.id === stage.id && { color: "#1f6f61", fontWeight: "700" }]}>{stage.name}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function CheckinsScreen() {
  const { user } = useAuth();
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(null);
  const [respondText, setRespondText] = useState("");
  const [mood, setMood] = useState("");

  function load() {
    setLoading(true);
    apiFetch("/checkins").then(d => setCheckins(d.checkins || [])).catch(() => {}).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function submitRespond() {
    if (!respondText.trim()) return;
    try {
      const body = { response: respondText };
      if (mood) body.mood = mood;
      await apiFetch(`/checkins/${responding.id}/respond`, { method: "POST", body: JSON.stringify(body) });
      setResponding(null); setRespondText(""); setMood("");
      load();
    } catch (e) { Alert.alert("Error", e.message); }
  }

  if (loading) return <View style={s.center}><ActivityIndicator color="#1f6f61" /></View>;

  if (responding) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.content}>
          <TouchableOpacity onPress={() => setResponding(null)} style={s.backBtn}>
            <Ionicons name="arrow-back" size={18} color="#1f6f61" /><Text style={s.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={s.screenTitle}>{responding.title}</Text>
          <Text style={s.cardBody}>"{responding.prompt}"</Text>

          <Text style={[s.fieldLabel, { marginTop: 16 }]}>How are you feeling?</Text>
          <View style={[s.row, { flexWrap: "wrap", gap: 8, marginBottom: 16 }]}>
            {[["GREAT","😊"],["GOOD","🙂"],["OKAY","😐"],["LOW","😔"],["STUCK","😣"]].map(([val, emoji]) => (
              <TouchableOpacity key={val} onPress={() => setMood(m => m === val ? "" : val)}
                style={[s.moodBtn, mood === val && s.moodBtnActive]}>
                <Text style={s.moodEmoji}>{emoji}</Text>
                <Text style={[s.moodLabel, mood === val && { color: "#1f6f61" }]}>{val}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.fieldLabel}>Your response</Text>
          <TextInput style={[s.input, s.textArea]} multiline value={respondText}
            onChangeText={setRespondText} placeholder="Share how things are going…" placeholderTextColor="#8a9694" />

          <TouchableOpacity style={[s.primaryButton, { marginTop: 16 }]} onPress={submitRespond}>
            <Ionicons name="send" size={16} color="#fff" />
            <Text style={s.primaryButtonText}>Submit Response</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.content}>
      <Text style={s.screenTitle}>Check-ins</Text>
      {checkins.length === 0
        ? <Text style={s.muted}>No check-ins yet.</Text>
        : checkins.map(c => (
          <View key={c.id} style={[s.card, { marginBottom: 10 }]}>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{c.title}</Text>
                <Text style={s.muted}>
                  {user?.role === "EMPLOYEE" ? `From: ${c.leader?.firstName}` : `To: ${c.employee?.firstName} ${c.employee?.lastName}`}
                </Text>
              </View>
              <View style={[s.statusBadge, c.status === "RESPONDED" && s.statusGreen, c.status === "OVERDUE" && s.statusRed]}>
                <Text style={s.statusText}>{c.status}</Text>
              </View>
            </View>
            <Text style={s.cardBody} numberOfLines={2}>"{c.prompt}"</Text>
            {c.response && (
              <View style={s.responsePill}>
                <Text style={s.responseText}>{c.response.mood && `${c.response.mood} · `}{c.response.response}</Text>
              </View>
            )}
            {user?.role === "EMPLOYEE" && c.status === "SENT" && (
              <TouchableOpacity style={[s.secondaryButton, { marginTop: 10 }]} onPress={() => { setResponding(c); setRespondText(""); setMood(""); }}>
                <Text style={s.secondaryButtonText}>Respond</Text>
              </TouchableOpacity>
            )}
          </View>
        ))
      }
    </ScrollView>
  );
}

function MessagesScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [body, setBody] = useState("");
  const [recipientId, setRecipientId] = useState("");

  function load() {
    apiFetch("/messages").then(d => setMessages(d.messages || [])).catch(() => {});
  }

  useEffect(() => {
    load();
    apiFetch("/organizations/me/users").then(d => setUsers((d.users || []).filter(u => u.id !== user?.id))).catch(() => {});
  }, []);

  async function send() {
    if (!body.trim() || !recipientId) return;
    try {
      await apiFetch("/messages", { method: "POST", body: JSON.stringify({ recipientId, body, type: "GENERAL" }) });
      setBody(""); load();
    } catch (e) { Alert.alert("Error", e.message); }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.screenTitle}>Messages</Text>

        <View style={s.card}>
          <Text style={s.eyebrow}>New Message</Text>
          <View style={s.pickerWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {users.map(u => (
                <TouchableOpacity key={u.id} onPress={() => setRecipientId(u.id)}
                  style={[s.recipientChip, recipientId === u.id && s.recipientChipActive]}>
                  <Text style={[s.recipientText, recipientId === u.id && { color: "#fff" }]}>{u.firstName}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={[s.row, { gap: 8, marginTop: 8 }]}>
            <TextInput style={[s.input, { flex: 1 }]} value={body} onChangeText={setBody}
              placeholder="Write a message…" placeholderTextColor="#8a9694" />
            <TouchableOpacity style={s.sendButton} onPress={send}>
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {[...messages].reverse().map(m => {
          const mine = m.senderId === user?.id;
          return (
            <View key={m.id} style={[s.bubble, mine && s.bubbleMine]}>
              <Text style={s.bubbleFrom}>{mine ? "You" : `${m.sender?.firstName}`}</Text>
              <Text style={s.bubbleBody}>{m.body}</Text>
              <Text style={s.bubbleTime}>{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
            </View>
          );
        })}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function LearningScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [completing, setCompleting] = useState(null);
  const [reflection, setReflection] = useState("");

  function load() {
    apiFetch("/learning").then(d => setItems(d.items || [])).catch(() => {});
    apiFetch("/learning/my-assignments").then(d => setAssignments(d.assignments || [])).catch(() => {});
  }

  useEffect(load, []);

  async function complete() {
    try {
      await apiFetch(`/learning/assignments/${completing}/complete`, { method: "PATCH", body: JSON.stringify({ reflection }) });
      setCompleting(null); setReflection(""); load();
    } catch (e) { Alert.alert("Error", e.message); }
  }

  if (completing) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.content}>
          <TouchableOpacity onPress={() => setCompleting(null)} style={s.backBtn}>
            <Ionicons name="arrow-back" size={18} color="#1f6f61" /><Text style={s.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={s.screenTitle}>Complete Assignment</Text>
          <Text style={s.fieldLabel}>Reflection (optional)</Text>
          <TextInput style={[s.input, s.textArea]} multiline value={reflection}
            onChangeText={setReflection} placeholder="What did you take away?" placeholderTextColor="#8a9694" />
          <TouchableOpacity style={[s.primaryButton, { marginTop: 16 }]} onPress={complete}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
            <Text style={s.primaryButtonText}>Mark Complete</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.content}>
      <Text style={s.screenTitle}>Learning</Text>

      {assignments.filter(a => a.status !== "COMPLETED").length > 0 && (
        <>
          <Text style={s.sectionTitle}>My Assignments</Text>
          {assignments.filter(a => a.status !== "COMPLETED").map(a => (
            <View key={a.id} style={[s.card, { marginBottom: 10 }]}>
              <Text style={s.cardTitle}>{a.learningItem?.title}</Text>
              {a.learningItem?.estimatedMins && <Text style={s.muted}>{a.learningItem.estimatedMins} min</Text>}
              <TouchableOpacity style={[s.secondaryButton, { marginTop: 10 }]} onPress={() => { setCompleting(a.id); setReflection(""); }}>
                <Text style={s.secondaryButtonText}>Mark Done</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      <Text style={s.sectionTitle}>Learning Library</Text>
      {items.map(item => (
        <View key={item.id} style={[s.card, { marginBottom: 10 }]}>
          <View style={s.row}>
            <Ionicons name="book-outline" size={20} color="#1f6f61" />
            <Text style={[s.cardTitle, { flex: 1, marginLeft: 8 }]}>{item.title}</Text>
            {item.hkmStage && <View style={s.stagePill}><Text style={s.stagePillText}>{item.hkmStage.name}</Text></View>}
          </View>
          {item.description && <Text style={s.muted}>{item.description}</Text>}
          {item.estimatedMins && <Text style={s.muted}>{item.estimatedMins} min</Text>}
        </View>
      ))}
    </ScrollView>
  );
}

function NotificationsScreen() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    apiFetch("/notifications").then(d => setNotifs(d.notifications || [])).catch(() => {}).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function markAll() {
    try { await apiFetch("/notifications/read-all", { method: "PATCH" }); load(); } catch {}
  }

  if (loading) return <View style={s.center}><ActivityIndicator color="#1f6f61" /></View>;

  return (
    <ScrollView contentContainerStyle={s.content}>
      <View style={[s.row, { marginBottom: 16 }]}>
        <Text style={s.screenTitle}>Notifications</Text>
        {notifs.some(n => n.status !== "READ") && (
          <TouchableOpacity onPress={markAll} style={s.secondaryButton}>
            <Text style={s.secondaryButtonText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>
      {notifs.length === 0
        ? <Text style={s.muted}>No notifications yet.</Text>
        : notifs.map(n => (
          <View key={n.id} style={[s.card, { marginBottom: 10, opacity: n.status === "READ" ? 0.6 : 1 }]}>
            <View style={s.row}>
              <View style={[s.dot, n.status !== "READ" && s.dotActive]} />
              <Text style={[s.cardTitle, { flex: 1 }]}>{n.title}</Text>
            </View>
            <Text style={s.muted}>{n.body}</Text>
          </View>
        ))
      }
    </ScrollView>
  );
}

function ProfileScreen() {
  const { user, logout } = useAuth();
  return (
    <ScrollView contentContainerStyle={s.content}>
      <Text style={s.screenTitle}>Profile</Text>
      <View style={[s.card, { alignItems: "center", gap: 8 }]}>
        <View style={s.avatar}><Text style={s.avatarText}>{user?.firstName?.[0]}{user?.lastName?.[0]}</Text></View>
        <Text style={s.cardTitle}>{user?.firstName} {user?.lastName}</Text>
        <Text style={s.muted}>{user?.email}</Text>
        <View style={s.rolePill}><Text style={s.rolePillText}>{user?.role}</Text></View>
      </View>
      <TouchableOpacity style={[s.dangerButton, { marginTop: 24 }]} onPress={logout}>
        <Ionicons name="log-out-outline" size={18} color="#dc2626" />
        <Text style={s.dangerButtonText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── App shell ─────────────────────────────────────────────────────────────────
const TABS = [
  ["Home", "home-outline", HomeScreen],
  ["Check-ins", "checkmark-circle-outline", CheckinsScreen],
  ["Messages", "chatbubble-ellipses-outline", MessagesScreen],
  ["Learning", "book-outline", LearningScreen],
  ["Notifs", "notifications-outline", NotificationsScreen],
  ["Profile", "person-outline", ProfileScreen],
];

function AppShell() {
  const { user, loading } = useAuth();
  const [active, setActive] = useState("Home");

  if (loading) return <View style={[s.center, { flex: 1 }]}><ActivityIndicator size="large" color="#1f6f61" /></View>;
  if (!user) return <LoginScreen />;

  const Screen = TABS.find(([name]) => name === active)?.[2] || HomeScreen;

  return (
    <SafeAreaView style={s.shell}>
      <StatusBar barStyle="dark-content" />
      <View style={s.header}>
        <View>
          <Text style={s.brand}>LeadOn</Text>
          <Text style={s.muted}>{user.role}</Text>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <Screen />
      </View>

      <View style={s.tabs}>
        {TABS.map(([name, icon]) => (
          <TouchableOpacity key={name} style={s.tabBtn} onPress={() => setActive(name)}>
            <Ionicons name={active === name ? icon.replace("-outline", "") : icon} size={22} color={active === name ? "#1f6f61" : "#8a9694"} />
            <Text style={[s.tabLabel, active === name && { color: "#1f6f61" }]}>{name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  shell: { flex: 1, backgroundColor: "#f7f8f5" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#dde5df", backgroundColor: "#fff" },
  brand: { fontSize: 22, fontWeight: "700", color: "#1f1f1f" },
  muted: { fontSize: 13, color: "#8a9694", marginTop: 2 },
  content: { padding: 18, paddingBottom: 100 },
  screenTitle: { fontSize: 24, fontWeight: "700", color: "#1f1f1f", marginBottom: 4 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1f1f1f", marginBottom: 10, marginTop: 8 },
  card: { borderRadius: 12, borderWidth: 1, borderColor: "#dde5df", backgroundColor: "#fff", padding: 16, gap: 6 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#1f1f1f" },
  cardBody: { fontSize: 14, color: "#657574", lineHeight: 20 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  metricCard: { flex: 1, borderRadius: 12, backgroundColor: "#edf6f2", padding: 14, alignItems: "center" },
  metricValue: { fontSize: 26, fontWeight: "800", color: "#1f6f61" },
  nudgeCard: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, backgroundColor: "#fef9ee", borderWidth: 1, borderColor: "#fde68a", padding: 14 },
  nudgeText: { flex: 1, fontSize: 14, color: "#92400e" },
  stageList: { gap: 8, marginTop: 8 },
  stageItem: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 10, borderWidth: 1, borderColor: "#dde5df", backgroundColor: "#fff", padding: 12 },
  stageItemActive: { borderColor: "#1f6f61", backgroundColor: "#edf6f2" },
  stageNum: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#e7ece7", alignItems: "center", justifyContent: "center" },
  stageNumActive: { backgroundColor: "#1f6f61" },
  stageNumText: { fontWeight: "800", color: "#657574", fontSize: 14 },
  stageLabel: { fontSize: 15, color: "#334342" },
  stageBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#1f6f61", alignItems: "center", justifyContent: "center" },
  stageBadgeNum: { color: "#fff", fontWeight: "800", fontSize: 16 },
  statusBadge: { borderRadius: 999, backgroundColor: "#e7ece7", paddingHorizontal: 10, paddingVertical: 4 },
  statusGreen: { backgroundColor: "#d1fae5" },
  statusRed: { backgroundColor: "#fee2e2" },
  statusText: { fontSize: 11, fontWeight: "700", color: "#334342" },
  responsePill: { borderRadius: 8, backgroundColor: "#edf6f2", padding: 10 },
  responseText: { fontSize: 13, color: "#334342" },
  moodBtn: { borderRadius: 999, borderWidth: 1, borderColor: "#dde5df", paddingHorizontal: 12, paddingVertical: 8, alignItems: "center", gap: 4 },
  moodBtnActive: { borderColor: "#1f6f61", backgroundColor: "#edf6f2" },
  moodEmoji: { fontSize: 20 },
  moodLabel: { fontSize: 11, fontWeight: "600", color: "#657574" },
  bubble: { borderRadius: 12, borderWidth: 1, borderColor: "#dde5df", backgroundColor: "#fff", padding: 12, marginBottom: 8, maxWidth: "85%" },
  bubbleMine: { alignSelf: "flex-end", backgroundColor: "#edf6f2", borderColor: "#c6dfd4" },
  bubbleFrom: { fontSize: 11, fontWeight: "700", color: "#1f6f61", marginBottom: 3 },
  bubbleBody: { fontSize: 14, color: "#334342" },
  bubbleTime: { fontSize: 10, color: "#8a9694", marginTop: 4, textAlign: "right" },
  pickerWrap: { marginVertical: 8 },
  recipientChip: { borderRadius: 999, borderWidth: 1, borderColor: "#dde5df", paddingHorizontal: 12, paddingVertical: 6, marginRight: 6 },
  recipientChipActive: { backgroundColor: "#1f6f61", borderColor: "#1f6f61" },
  recipientText: { fontSize: 13, fontWeight: "600", color: "#334342" },
  sendButton: { width: 46, height: 46, borderRadius: 10, backgroundColor: "#1f6f61", alignItems: "center", justifyContent: "center" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#dde5df" },
  dotActive: { backgroundColor: "#1f6f61" },
  stagePill: { borderRadius: 999, backgroundColor: "#edf6f2", paddingHorizontal: 8, paddingVertical: 4 },
  stagePillText: { fontSize: 11, fontWeight: "700", color: "#1f6f61" },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#1f6f61", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 26, fontWeight: "700", color: "#fff" },
  rolePill: { borderRadius: 999, backgroundColor: "#edf6f2", paddingHorizontal: 14, paddingVertical: 6 },
  rolePillText: { fontSize: 13, fontWeight: "700", color: "#1f6f61" },
  tabs: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", borderTopWidth: 1, borderTopColor: "#dde5df", backgroundColor: "#fff", paddingTop: 6, paddingBottom: Platform.OS === "ios" ? 20 : 6 },
  tabBtn: { flex: 1, alignItems: "center", gap: 2 },
  tabLabel: { fontSize: 10, fontWeight: "600", color: "#8a9694" },
  input: { minHeight: 46, borderRadius: 10, borderWidth: 1, borderColor: "#cfdad3", backgroundColor: "#fff", paddingHorizontal: 12, fontSize: 15, color: "#1f1f1f" },
  textArea: { minHeight: 110, paddingTop: 12, textAlignVertical: "top" },
  primaryButton: { minHeight: 48, borderRadius: 10, backgroundColor: "#1f6f61", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  secondaryButton: { minHeight: 42, borderRadius: 10, borderWidth: 1, borderColor: "#c6dfd4", backgroundColor: "#edf6f2", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  secondaryButtonText: { color: "#1f6f61", fontWeight: "700" },
  dangerButton: { minHeight: 48, borderRadius: 10, borderWidth: 1, borderColor: "#fecaca", backgroundColor: "#fff5f5", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  dangerButtonText: { color: "#dc2626", fontWeight: "700" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 },
  backText: { color: "#1f6f61", fontWeight: "600" },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#334342", marginBottom: 6 },
  eyebrow: { fontSize: 11, fontWeight: "800", color: "#1f6f61", textTransform: "uppercase", letterSpacing: 0.5 },
  errorBox: { borderRadius: 8, backgroundColor: "#fee2e2", borderWidth: 1, borderColor: "#fecaca", padding: 10, marginBottom: 12 },
  errorText: { color: "#dc2626", fontSize: 13 },
  loginContainer: { flexGrow: 1, justifyContent: "center", padding: 24, backgroundColor: "#f7f8f5" },
  loginBrand: { alignItems: "center", marginBottom: 32 },
  loginLogo: { width: 64, height: 64, borderRadius: 18, backgroundColor: "#1f6f61", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  loginTitle: { fontSize: 32, fontWeight: "800", color: "#1f1f1f" },
  loginSub: { fontSize: 14, color: "#8a9694", marginTop: 4 },
  demoBox: { marginTop: 20, borderTopWidth: 1, borderTopColor: "#dde5df", paddingTop: 16 },
  demoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  demoRole: { fontSize: 13, fontWeight: "700", color: "#1f6f61" },
  demoEmail: { fontSize: 13, color: "#8a9694" },
});
