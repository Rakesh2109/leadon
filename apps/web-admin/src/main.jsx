import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BarChart3,
  Bell,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  UsersRound
} from "lucide-react";
import "./styles.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

const hkmStages = ["Understand", "Build", "Learn", "Try", "Choose", "Move forward"];

const teamMembers = [
  { name: "Maya Chen", role: "Product designer", mood: "Good", stage: "Try", checkin: "Responded", learning: 80 },
  { name: "Oskar Holm", role: "Frontend engineer", mood: "Okay", stage: "Learn", checkin: "Pending", learning: 45 },
  { name: "Amara Singh", role: "Customer success", mood: "Low", stage: "Understand", checkin: "Needs follow-up", learning: 30 },
  { name: "Jonas Vik", role: "Operations lead", mood: "Great", stage: "Choose", checkin: "Responded", learning: 100 }
];

const adminRows = [
  { label: "Users", value: "128", note: "12 leaders, 108 employees" },
  { label: "Teams", value: "18", note: "4 need leader assignment" },
  { label: "Templates", value: "24", note: "6 mapped to HKM stages" },
  { label: "Learning items", value: "42", note: "31 active" }
];

const contentItems = [
  { title: "How are things going this week?", type: "Check-in template", stage: "Understand" },
  { title: "Give one small recognition", type: "Microlearning", stage: "Build" },
  { title: "Try one support question", type: "Microlearning", stage: "Try" }
];

function App() {
  const [activeView, setActiveView] = useState("Dashboard");
  const [role, setRole] = useState("Leader");
  const [email, setEmail] = useState("leader@leadon.test");
  const [password, setPassword] = useState("");
  const [apiStatus, setApiStatus] = useState("Not checked");

  const view = useMemo(() => {
    if (activeView === "Users") return <UsersView />;
    if (activeView === "Teams") return <TeamsView />;
    if (activeView === "Content") return <ContentView />;
    if (activeView === "Reports") return <ReportsView />;
    if (activeView === "Settings") return <SettingsView role={role} setRole={setRole} />;
    return <DashboardView />;
  }, [activeView, role]);

  async function checkApi() {
    setApiStatus("Checking");
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      const data = await response.json();
      setApiStatus(data.status === "ok" ? "Connected" : "Unavailable");
    } catch {
      setApiStatus("Unavailable");
    }
  }

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
          {[
            ["Dashboard", LayoutDashboard],
            ["Users", UsersRound],
            ["Teams", ShieldCheck],
            ["Content", BookOpen],
            ["Reports", BarChart3],
            ["Settings", Settings]
          ].map(([item, Icon]) => (
            <button
              key={item}
              className={`nav-button ${activeView === item ? "nav-button-active" : ""}`}
              onClick={() => setActiveView(item)}
              type="button"
              title={item}
            >
              <Icon size={18} />
              <span>{item}</span>
            </button>
          ))}
        </nav>
        <div className="absolute bottom-5 left-4 right-4 rounded-md border border-line bg-paper p-3">
          <p className="text-sm font-medium">API status</p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className={`status-dot ${apiStatus === "Connected" ? "status-ok" : ""}`} />
            <span className="flex-1 text-sm text-quiet">{apiStatus}</span>
            <button className="icon-button" onClick={checkApi} type="button" title="Check API">
              <CheckCircle2 size={16} />
            </button>
          </div>
        </div>
      </aside>

      <section className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur md:px-7">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-spruce">{role}</p>
              <h1 className="text-2xl font-semibold tracking-normal md:text-3xl">{activeView}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button className="secondary-button" type="button">
                <Bell size={17} />
                <span>Reminders</span>
              </button>
              <button className="primary-button" type="button">
                <Send size={17} />
                <span>Send check-in</span>
              </button>
              <button className="icon-button" type="button" title="Sign out">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-5 px-4 py-5 md:px-7 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section>{view}</section>
          <aside className="space-y-5">
            <LoginPanel
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
            />
            <NudgePanel />
          </aside>
        </div>
      </section>
    </main>
  );
}

function DashboardView() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title="Check-in completion" value="82%" detail="11 of 13 this week" tone="spruce" />
        <Metric title="Learning completion" value="68%" detail="9 active assignments" tone="river" />
        <Metric title="Pending follow-ups" value="3" detail="1 marked low mood" tone="coral" />
        <Metric title="Engagement" value="7.8" detail="Team average" tone="spruce" />
      </div>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Team</p>
            <h2>Weekly overview</h2>
          </div>
          <button className="secondary-button" type="button">
            <MessageSquareText size={17} />
            <span>Follow up</span>
          </button>
        </div>
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Mood</th>
                <th>Current growth stage</th>
                <th>Check-in</th>
                <th>Learning</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member) => (
                <tr key={member.name}>
                  <td>
                    <div className="font-medium">{member.name}</div>
                    <div className="text-sm text-quiet">{member.role}</div>
                  </td>
                  <td><Badge label={member.mood} /></td>
                  <td>{member.stage}</td>
                  <td>{member.checkin}</td>
                  <td>
                    <div className="progress-track"><span style={{ width: `${member.learning}%` }} /></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">HKM</p>
            <h2>Growth cycle</h2>
          </div>
        </div>
        <div className="stage-grid">
          {hkmStages.map((stage, index) => (
            <div className="stage" key={stage}>
              <span>{index + 1}</span>
              <p>{stage}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function UsersView() {
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Admin</p>
          <h2>User management</h2>
        </div>
        <button className="primary-button" type="button"><UsersRound size={17} /><span>Add user</span></button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {teamMembers.map((member) => (
          <PersonCard key={member.name} member={member} />
        ))}
      </div>
    </section>
  );
}

function TeamsView() {
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Teams</p>
          <h2>Leader groups</h2>
        </div>
        <button className="primary-button" type="button"><ShieldCheck size={17} /><span>Create team</span></button>
      </div>
      {["Product", "Customer success", "Operations"].map((team, index) => (
        <div className="list-row" key={team}>
          <div>
            <p className="font-medium">{team}</p>
            <p className="text-sm text-quiet">{index + 4} members</p>
          </div>
          <Badge label={index === 1 ? "Needs leader" : "Active"} />
        </div>
      ))}
    </section>
  );
}

function ContentView() {
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Content</p>
          <h2>Templates and learning</h2>
        </div>
        <button className="primary-button" type="button"><BookOpen size={17} /><span>Create item</span></button>
      </div>
      {contentItems.map((item) => (
        <div className="list-row" key={item.title}>
          <div>
            <p className="font-medium">{item.title}</p>
            <p className="text-sm text-quiet">{item.type}</p>
          </div>
          <Badge label={item.stage} />
        </div>
      ))}
    </section>
  );
}

function ReportsView() {
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Reports</p>
          <h2>Organization pulse</h2>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {adminRows.map((row) => (
          <Metric key={row.label} title={row.label} value={row.value} detail={row.note} tone="river" />
        ))}
      </div>
    </section>
  );
}

function SettingsView({ role, setRole }) {
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Settings</p>
          <h2>Working mode</h2>
        </div>
      </div>
      <div className="segmented">
        {["Admin", "Leader", "Employee"].map((item) => (
          <button
            className={role === item ? "selected" : ""}
            key={item}
            onClick={() => setRole(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>
    </section>
  );
}

function LoginPanel({ email, setEmail, password, setPassword }) {
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Sign in</p>
          <h2>Backend auth</h2>
        </div>
      </div>
      <form className="space-y-3">
        <label className="field">
          <span>Email</span>
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
        </label>
        <label className="field">
          <span>Password</span>
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
        </label>
        <button className="primary-button w-full justify-center" type="button">
          <ShieldCheck size={17} />
          <span>Log in</span>
        </button>
      </form>
    </section>
  );
}

function NudgePanel() {
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Next small step</p>
          <h2>Gentle nudges</h2>
        </div>
      </div>
      <div className="nudge-list">
        <div><ClipboardList size={18} /><span>Ask Amara if she needs support this week.</span></div>
        <div><Bell size={18} /><span>Send a reminder to Oskar for his check-in.</span></div>
        <div><BookOpen size={18} /><span>Recognize Jonas for completing learning.</span></div>
      </div>
    </section>
  );
}

function Metric({ title, value, detail, tone }) {
  return (
    <article className={`metric metric-${tone}`}>
      <p>{title}</p>
      <strong>{value}</strong>
      <span>{detail}</span>
    </article>
  );
}

function Badge({ label }) {
  return <span className="badge">{label}</span>;
}

function PersonCard({ member }) {
  return (
    <article className="person-card">
      <div>
        <p className="font-medium">{member.name}</p>
        <p className="text-sm text-quiet">{member.role}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge label={member.stage} />
        <Badge label={member.mood} />
      </div>
    </article>
  );
}

createRoot(document.getElementById("root")).render(<App />);
