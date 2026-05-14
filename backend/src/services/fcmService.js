const logger = require("../config/logger");

let messaging = null;

function getMessaging() {
  if (messaging) return messaging;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountJson) return null;

  try {
    const admin = require("firebase-admin");
    if (!admin.apps.length) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    messaging = admin.messaging();
    return messaging;
  } catch (err) {
    logger.warn({ err }, "Firebase Admin init failed — push notifications disabled");
    return null;
  }
}

async function sendPush(token, { title, body, data = {} }) {
  const m = getMessaging();
  if (!m || !token) return;
  try {
    await m.send({ token, notification: { title, body }, data });
    logger.debug({ token: token.slice(0, 10) }, "FCM push sent");
  } catch (err) {
    // Stale tokens return registration-token-not-registered — don't crash
    logger.warn({ err: err.code }, "FCM push failed");
  }
}

module.exports = { sendPush };
