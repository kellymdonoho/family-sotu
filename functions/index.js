const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

// Runs every Saturday at 7:00 PM Mountain Time
// Sends a push notification to everyone with a registered FCM token
exports.sundayMeetingReminder = onSchedule(
  {
    schedule: "0 19 * * 6",   // cron: minute hour day month weekday (6 = Saturday)
    timeZone: "America/Denver",
  },
  async () => {
    const db = getFirestore();
    const messaging = getMessaging();

    // Get all registered FCM tokens
    const tokensSnap = await db.collection("fcm_tokens").get();
    if (tokensSnap.empty) {
      console.log("No FCM tokens found");
      return;
    }

    const tokens = tokensSnap.docs.map((doc) => doc.data().token).filter(Boolean);
    if (!tokens.length) return;

    const message = {
      notification: {
        title: "Sunday SotU tomorrow 💕",
        body: "Meeting ready whenever you are. Takes 25 minutes.",
      },
      webpush: {
        notification: {
          icon: "https://YOUR_VERCEL_URL/icon-192.png",   // update after deploy
          badge: "https://YOUR_VERCEL_URL/icon-192.png",
          vibrate: [200, 100, 200],
        },
        fcm_options: {
          link: "https://YOUR_VERCEL_URL",               // update after deploy
        },
      },
      tokens,
    };

    const response = await messaging.sendEachForMulticast(message);
    console.log(`Sent ${response.successCount} / ${tokens.length} notifications`);

    // Clean up any tokens that are no longer valid
    const failedTokens = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) failedTokens.push(tokensSnap.docs[idx].id);
    });
    await Promise.all(failedTokens.map((id) => db.collection("fcm_tokens").doc(id).delete()));
  }
);
