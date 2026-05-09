const { serializeUser } = require("../utils/userSerializer");

async function getMe(req, res) {
  return res.json({
    user: serializeUser(req.user)
  });
}

module.exports = {
  getMe
};
