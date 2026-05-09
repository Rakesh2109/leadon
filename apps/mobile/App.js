import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const hkmStages = ["Understand", "Build", "Learn", "Try", "Choose", "Move forward"];

const checkins = [
  { title: "How are things going this week?", status: "Pending", from: "Maya" },
  { title: "What is one small win?", status: "Responded", from: "Jonas" },
  { title: "Do you need support?", status: "Follow up", from: "Amara" }
];

const learning = [
  { title: "Ask one support question", time: "3 min", stage: "Try" },
  { title: "Give useful recognition", time: "4 min", stage: "Build" },
  { title: "Reflect on next step", time: "5 min", stage: "Choose" }
];

const messages = [
  { from: "Maya", body: "Thanks for checking in. This week feels clearer." },
  { from: "You", body: "Glad to hear it. What is the next small step?" }
];

export default function App() {
  const [activeTab, setActiveTab] = useState("Home");
  const [role, setRole] = useState("Leader");

  const screen = activeTab === "Check-ins"
    ? <CheckinsScreen />
    : activeTab === "Messages"
      ? <MessagesScreen />
      : activeTab === "Learning"
        ? <LearningScreen />
        : activeTab === "Progress"
          ? <ProgressScreen />
          : activeTab === "Profile"
            ? <ProfileScreen role={role} setRole={setRole} />
            : <HomeScreen role={role} />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.shell}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>LeadOn</Text>
            <Text style={styles.muted}>{role}</Text>
          </View>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="notifications-outline" size={21} color="#23302f" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {screen}
        </ScrollView>

        <View style={styles.tabs}>
          {[
            ["Home", "home-outline"],
            ["Check-ins", "checkmark-circle-outline"],
            ["Messages", "chatbubble-ellipses-outline"],
            ["Learning", "book-outline"],
            ["Progress", "trail-sign-outline"],
            ["Profile", "person-outline"]
          ].map(([tab, icon]) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Ionicons name={icon} size={19} color={activeTab === tab ? "#1f6f61" : "#657574"} />
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

function HomeScreen({ role }) {
  return (
    <View style={styles.stack}>
      <LoginCard />
      <View style={styles.card}>
        <Text style={styles.eyebrow}>This week</Text>
        <Text style={styles.title}>{role === "Leader" ? "Team rhythm" : "Your growth rhythm"}</Text>
        <View style={styles.metricRow}>
          <Metric label="Check-ins" value="82%" />
          <Metric label="Learning" value="68%" />
          <Metric label="Follow-ups" value="3" />
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Next small step</Text>
        <Text style={styles.bodyText}>Ask Amara if she needs support this week.</Text>
        <TouchableOpacity style={styles.primaryButton}>
          <Ionicons name="send-outline" size={18} color="#fff" />
          <Text style={styles.primaryButtonText}>Send check-in</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function LoginCard() {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Sign in</Text>
      <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#8a9694" />
      <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#8a9694" secureTextEntry />
      <TouchableOpacity style={styles.secondaryButton}>
        <Ionicons name="shield-checkmark-outline" size={18} color="#1f6f61" />
        <Text style={styles.secondaryButtonText}>Log in</Text>
      </TouchableOpacity>
    </View>
  );
}

function CheckinsScreen() {
  return (
    <View style={styles.stack}>
      <ScreenTitle label="Check-ins" title="How are things going this week?" />
      {checkins.map((item) => (
        <ListCard key={item.title} title={item.title} detail={item.from} badge={item.status} />
      ))}
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Respond</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          placeholder="Write a short response"
          placeholderTextColor="#8a9694"
        />
        <TouchableOpacity style={styles.primaryButton}>
          <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
          <Text style={styles.primaryButtonText}>Send response</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MessagesScreen() {
  return (
    <View style={styles.stack}>
      <ScreenTitle label="Messages" title="Simple follow-up" />
      {messages.map((message, index) => (
        <View key={`${message.from}-${index}`} style={[styles.messageBubble, message.from === "You" && styles.messageMine]}>
          <Text style={styles.messageFrom}>{message.from}</Text>
          <Text style={styles.bodyText}>{message.body}</Text>
        </View>
      ))}
      <View style={styles.composer}>
        <TextInput style={styles.composerInput} placeholder="Write a message" placeholderTextColor="#8a9694" />
        <TouchableOpacity style={styles.sendButton}>
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function LearningScreen() {
  return (
    <View style={styles.stack}>
      <ScreenTitle label="Microlearning" title="Short practical tasks" />
      {learning.map((item) => (
        <ListCard key={item.title} title={item.title} detail={item.time} badge={item.stage} />
      ))}
    </View>
  );
}

function ProgressScreen() {
  return (
    <View style={styles.stack}>
      <ScreenTitle label="HKM" title="Current growth stage" />
      <View style={styles.stageList}>
        {hkmStages.map((stage, index) => (
          <View key={stage} style={[styles.stageItem, index === 3 && styles.stageItemActive]}>
            <Text style={[styles.stageNumber, index === 3 && styles.stageNumberActive]}>{index + 1}</Text>
            <Text style={styles.stageLabel}>{stage}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ProfileScreen({ role, setRole }) {
  return (
    <View style={styles.stack}>
      <ScreenTitle label="Profile" title="Working mode" />
      <View style={styles.segmented}>
        {["Leader", "Employee", "Admin"].map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.segmentButton, role === item && styles.segmentButtonActive]}
            onPress={() => setRole(item)}
          >
            <Text style={[styles.segmentText, role === item && styles.segmentTextActive]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function ScreenTitle({ label, title }) {
  return (
    <View>
      <Text style={styles.eyebrow}>{label}</Text>
      <Text style={styles.screenTitle}>{title}</Text>
    </View>
  );
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function ListCard({ title, detail, badge }) {
  return (
    <View style={styles.listCard}>
      <View style={styles.listIcon}>
        <Ionicons name="leaf-outline" size={19} color="#1f6f61" />
      </View>
      <View style={styles.listContent}>
        <Text style={styles.listTitle}>{title}</Text>
        <Text style={styles.muted}>{detail}</Text>
      </View>
      <Text style={styles.badge}>{badge}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f7f8f5"
  },
  shell: {
    flex: 1
  },
  header: {
    minHeight: 70,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomColor: "#dde5df",
    borderBottomWidth: 1,
    backgroundColor: "#f7f8f5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  brand: {
    color: "#23302f",
    fontSize: 25,
    fontWeight: "700"
  },
  muted: {
    color: "#657574",
    fontSize: 13
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dde5df",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff"
  },
  content: {
    padding: 18,
    paddingBottom: 104
  },
  stack: {
    gap: 14
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dde5df",
    backgroundColor: "#fff",
    padding: 16,
    gap: 12
  },
  eyebrow: {
    color: "#1f6f61",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  title: {
    color: "#23302f",
    fontSize: 20,
    fontWeight: "700"
  },
  screenTitle: {
    color: "#23302f",
    fontSize: 26,
    fontWeight: "750",
    marginTop: 4
  },
  bodyText: {
    color: "#334342",
    fontSize: 15,
    lineHeight: 22
  },
  metricRow: {
    flexDirection: "row",
    gap: 10
  },
  metric: {
    flex: 1,
    minHeight: 82,
    borderRadius: 8,
    backgroundColor: "#edf6f2",
    padding: 12,
    justifyContent: "center"
  },
  metricValue: {
    color: "#1f6f61",
    fontSize: 24,
    fontWeight: "800"
  },
  metricLabel: {
    color: "#657574",
    fontSize: 12
  },
  input: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cfdad3",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    color: "#23302f"
  },
  textArea: {
    minHeight: 110,
    paddingTop: 12,
    textAlignVertical: "top"
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: "#1f6f61",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "750"
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cde5db",
    backgroundColor: "#edf6f2",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8
  },
  secondaryButtonText: {
    color: "#1f6f61",
    fontWeight: "750"
  },
  listCard: {
    minHeight: 82,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dde5df",
    backgroundColor: "#fff",
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  listIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#edf6f2",
    alignItems: "center",
    justifyContent: "center"
  },
  listContent: {
    flex: 1,
    gap: 3
  },
  listTitle: {
    color: "#23302f",
    fontSize: 15,
    fontWeight: "700"
  },
  badge: {
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "#edf6f2",
    color: "#1f6f61",
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: "700"
  },
  messageBubble: {
    maxWidth: "88%",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dde5df",
    backgroundColor: "#fff",
    padding: 13,
    gap: 4
  },
  messageMine: {
    alignSelf: "flex-end",
    backgroundColor: "#edf6f2",
    borderColor: "#cde5db"
  },
  messageFrom: {
    color: "#1f6f61",
    fontSize: 12,
    fontWeight: "800"
  },
  composer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center"
  },
  composerInput: {
    flex: 1,
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cfdad3",
    backgroundColor: "#fff",
    paddingHorizontal: 12
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: "#1f6f61",
    alignItems: "center",
    justifyContent: "center"
  },
  stageList: {
    gap: 10
  },
  stageItem: {
    minHeight: 58,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dde5df",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  stageItemActive: {
    borderColor: "#1f6f61",
    backgroundColor: "#edf6f2"
  },
  stageNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    overflow: "hidden",
    backgroundColor: "#e7ece7",
    color: "#657574",
    textAlign: "center",
    lineHeight: 30,
    fontWeight: "800"
  },
  stageNumberActive: {
    backgroundColor: "#1f6f61",
    color: "#fff"
  },
  stageLabel: {
    color: "#23302f",
    fontSize: 16,
    fontWeight: "700"
  },
  segmented: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dde5df",
    overflow: "hidden"
  },
  segmentButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#dde5df",
    backgroundColor: "#fff"
  },
  segmentButtonActive: {
    backgroundColor: "#1f6f61"
  },
  segmentText: {
    color: "#657574",
    fontWeight: "700"
  },
  segmentTextActive: {
    color: "#fff"
  },
  tabs: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 76,
    borderTopWidth: 1,
    borderTopColor: "#dde5df",
    backgroundColor: "#fff",
    flexDirection: "row",
    paddingHorizontal: 4,
    paddingTop: 6
  },
  tabButton: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderRadius: 8
  },
  tabButtonActive: {
    backgroundColor: "#edf6f2"
  },
  tabText: {
    color: "#657574",
    fontSize: 10,
    fontWeight: "700"
  },
  tabTextActive: {
    color: "#1f6f61"
  }
});
