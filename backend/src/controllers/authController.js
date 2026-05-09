const authService = require("../services/authService");

async function register(req, res, next) {
  try {
    const result = await authService.registerUser(req.validated.body);
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const result = await authService.loginUser(req.validated.body);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  register,
  login
};
