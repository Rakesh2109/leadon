const authService = require("../services/authService");

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

async function register(req, res, next) {
  try {
    const result = await authService.registerUser(req.validated.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const result = await authService.loginUser(req.validated.body, {
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    });
    res.cookie("leadon_rt", result.refreshToken, COOKIE_OPTIONS);
    res.json({ user: result.user, accessToken: result.accessToken });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const token = req.cookies?.leadon_rt;
    const result = await authService.refreshAccessToken(token);
    res.json({ user: result.user, accessToken: result.accessToken });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const token = req.cookies?.leadon_rt;
    await authService.logoutUser(req.user.id, token);
    res.clearCookie("leadon_rt", { ...COOKIE_OPTIONS, maxAge: 0 });
    res.json({ message: "Logged out" });
  } catch (err) {
    next(err);
  }
}

async function logoutAll(req, res, next) {
  try {
    await authService.logoutUser(req.user.id, null);
    res.clearCookie("leadon_rt", { ...COOKIE_OPTIONS, maxAge: 0 });
    res.json({ message: "All sessions revoked" });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refresh, logout, logoutAll };
