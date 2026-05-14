const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create default organization
  const org = await prisma.organization.upsert({
    where: { slug: "leadon-default" },
    create: { name: "LeadOn Default Org", slug: "leadon-default" },
    update: {}
  });
  console.log("Organization:", org.name);

  // Create admin user
  const passwordHash = await bcrypt.hash("Admin@1234", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@leadon.com" },
    create: {
      email: "admin@leadon.com",
      passwordHash,
      firstName: "Admin",
      lastName: "User",
      role: "ADMIN",
      organizationId: org.id
    },
    update: {}
  });
  console.log("Admin user:", admin.email);

  // Seed HKM stages (global, organizationId = null)
  const stages = [
    { name: "Enthusiastic Beginner", description: "High commitment, low competence. New to task, excited to learn.", position: 1 },
    { name: "Disillusioned Learner", description: "Low commitment, low-to-some competence. Reality has set in.", position: 2 },
    { name: "Capable but Cautious", description: "Variable commitment, moderate-to-high competence.", position: 3 },
    { name: "Self-Reliant Achiever", description: "High commitment and high competence. Peak performance.", position: 4 },
    { name: "Expert Mentor", description: "Peak competence, focused on coaching and developing others.", position: 5 },
    { name: "Transformational Leader", description: "Strategic vision and org-wide influence.", position: 6 }
  ];

  const existingCount = await prisma.hKMStage.count({ where: { organizationId: null } });
  if (existingCount === 0) {
    await prisma.hKMStage.createMany({
      data: stages.map((s) => ({ ...s, organizationId: null })),
      skipDuplicates: true
    });
  }
  console.log("HKM stages seeded:", stages.length);

  // Sample leader
  const leaderHash = await bcrypt.hash("Leader@1234", 12);
  const leader = await prisma.user.upsert({
    where: { email: "leader@leadon.com" },
    create: {
      email: "leader@leadon.com",
      passwordHash: leaderHash,
      firstName: "Sarah",
      lastName: "Leader",
      role: "LEADER",
      organizationId: org.id
    },
    update: {}
  });

  // Sample employee
  const empHash = await bcrypt.hash("Employee@1234", 12);
  const employee = await prisma.user.upsert({
    where: { email: "employee@leadon.com" },
    create: {
      email: "employee@leadon.com",
      passwordHash: empHash,
      firstName: "John",
      lastName: "Employee",
      role: "EMPLOYEE",
      organizationId: org.id
    },
    update: {}
  });
  console.log("Sample users created: leader, employee");

  // Sample team
  const team = await prisma.team.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Engineering Team",
      organizationId: org.id,
      leaderId: leader.id,
      createdById: admin.id
    },
    update: {}
  });

  // Add employee to team
  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: team.id, userId: employee.id } },
    create: { teamId: team.id, userId: employee.id, role: "MEMBER" },
    update: {}
  });
  console.log("Sample team created:", team.name);

  console.log("\n✅ Seed complete!");
  console.log("─────────────────────────────────────");
  console.log("Login credentials:");
  console.log("  Admin    → admin@leadon.com    / Admin@1234");
  console.log("  Leader   → leader@leadon.com   / Leader@1234");
  console.log("  Employee → employee@leadon.com / Employee@1234");
  console.log("─────────────────────────────────────");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
