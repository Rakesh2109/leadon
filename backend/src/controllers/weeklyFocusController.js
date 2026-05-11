const prisma = require("../config/prisma");
const AppError = require("../utils/appError");

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function upsertWeeklyFocus(req, res, next) {
  try {
    const { topic, description, teamId, hiddenFromLeader, weekStart } = req.body;
    const user = req.user;

    const weekStartDate = weekStart ? new Date(weekStart) : getWeekStart();

    const existing = await prisma.weeklyFocus.findFirst({
      where: {
        employeeId: user.id,
        weekStart: weekStartDate,
      },
    });

    let focus;
    if (existing) {
      focus = await prisma.weeklyFocus.update({
        where: { id: existing.id },
        data: { topic, description: description ?? null, teamId: teamId ?? null, hiddenFromLeader },
      });
    } else {
      focus = await prisma.weeklyFocus.create({
        data: {
          organizationId: user.organizationId,
          employeeId: user.id,
          teamId: teamId ?? null,
          topic,
          description: description ?? null,
          hiddenFromLeader,
          weekStart: weekStartDate,
        },
      });
    }

    res.status(existing ? 200 : 201).json({ weeklyFocus: focus });
  } catch (err) {
    next(err);
  }
}

async function getMyWeeklyFocus(req, res, next) {
  try {
    const weekStart = req.query.weekStart ? new Date(req.query.weekStart) : getWeekStart();

    const focus = await prisma.weeklyFocus.findFirst({
      where: { employeeId: req.user.id, weekStart },
    });

    res.json({ weeklyFocus: focus ?? null });
  } catch (err) {
    next(err);
  }
}

async function getTeamWeeklyFocuses(req, res, next) {
  try {
    const user = req.user;
    if (user.role === "EMPLOYEE") return next(new AppError("Forbidden", 403));

    const { teamId } = req.params;
    const weekStart = req.query.weekStart ? new Date(req.query.weekStart) : getWeekStart();

    const focuses = await prisma.weeklyFocus.findMany({
      where: {
        teamId,
        weekStart,
        // Employees who set hiddenFromLeader=true are hidden from leaders (but not admins)
        ...(user.role === "LEADER" && { hiddenFromLeader: false }),
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    res.json({ weeklyFocuses: focuses });
  } catch (err) {
    next(err);
  }
}

module.exports = { upsertWeeklyFocus, getMyWeeklyFocus, getTeamWeeklyFocuses };
