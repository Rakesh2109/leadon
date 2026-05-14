const path = require("path");
const { serializeUser } = require("../utils/userSerializer");
const prisma = require("../config/prisma");
const AppError = require("../utils/appError");

async function getMe(req, res) {
  return res.json({ user: serializeUser(req.user) });
}

async function registerFcmToken(req, res, next) {
  try {
    const { token } = req.body;
    if (!token || typeof token !== "string") {
      return res.status(400).json({ message: "token is required" });
    }
    await prisma.user.update({
      where: { id: req.user.id },
      data: { firebaseToken: token }
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { firstName, lastName } = req.body;
    const data = {};
    if (firstName) data.firstName = firstName.slice(0, 100);
    if (lastName) data.lastName = lastName.slice(0, 100);
    const user = await prisma.user.update({ where: { id: req.user.id }, data });
    res.json({ user: serializeUser(user) });
  } catch (err) {
    next(err);
  }
}

async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) return next(new AppError("No file uploaded", 400));

    const ext = path.extname(req.file.originalname).toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) {
      return next(new AppError("Only image files are allowed", 400));
    }

    const avatarUrl = `/uploads/${req.file.filename}`;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl }
    });
    res.json({ user: serializeUser(user), avatarUrl });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMe, registerFcmToken, updateProfile, uploadAvatar };
