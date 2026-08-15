const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

const APP_URL = "https://family-sotu.vercel.app";

// Map person name → email so we can look up FCM tokens
const EMAIL_BY_NAME = {
  Kelly: "kellymdonoho@gmail.com",
  Kevin: "kdonoho1@gmail.com",
  "Nana & Grumpa": "donna_durham@yahoo.com",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_FULL = { 1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday" };

// ── SATURDAY REMINDER ───────────────────────────────────────────────────────
// Runs every Saturday at 7:00 PM Mountain Time. Sends one push notification
// to each person with a registered FCM token.
exports.sundayMeetingReminder = onSchedule(
  {
    schedule: "0 19 * * 6",
    timeZone: "America/Denver",
  },
  async () => {
    const db = getFirestore();
    const messaging = getMessaging();

    const tokensSnap = await db.collection("fcm_tokens").get();
    if (tokensSnap.empty) {
      console.log("No FCM tokens found");
      return;
    }

    const tokens = tokensSnap.docs.map((doc) => doc.data().token).filter(Boolean);
    if (!tokens.length) return;

    const message = {
      notification: {
        title: "Sunday SotU tomorrow",
        body: "Meeting ready whenever you are. Takes 25 minutes.",
      },
      webpush: {
        notification: {
          icon: `${APP_URL}/icon-192.png`,
          badge: `${APP_URL}/icon-192.png`,
          vibrate: [200, 100, 200],
        },
        fcm_options: {
          link: APP_URL,
        },
      },
      tokens,
    };

    const response = await messaging.sendEachForMulticast(message);
    console.log(`Sent ${response.successCount} / ${tokens.length} notifications`);
    response.responses.forEach((r, i) => {
      if (!r.success) console.error(`Token ${i} failed:`, r.error);
    });

    // Clean up invalid tokens
    const failedTokens = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) failedTokens.push(tokensSnap.docs[idx].id);
    });
    await Promise.all(failedTokens.map((id) => db.collection("fcm_tokens").doc(id).delete()));
  }
);

// ── LILY PICK-UP REMINDER ───────────────────────────────────────────────────
// Fires when a parent completes the Sunday meeting (meetingCompletedAt is
// newly written to sou/{weekId}). Reads the week's logistics data, figures
// out who picks up Lily each weekday, and sends each person a reminder with
// their specific days.
exports.lilyPickupReminder = onDocumentUpdated("sou/{weekId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();

  // Only fire when meetingCompletedAt transitions from unset → set
  if (before?.meetingCompletedAt || !after?.meetingCompletedAt) return;
  // Don't send twice for the same week
  if (after.pickupRemindersSent) return;

  const logistics = after.logistics;
  if (!logistics) {
    console.log("No logistics data for week", event.params.weekId);
    return;
  }

  // Build a map: person name → list of day names they pick up Lily
  const pickupDays = {}; // { Kelly: ["Mon", "Wed"], Kevin: ["Tue", "Thu"] }

  Object.entries(logistics).forEach(([dateKey, dayLog]) => {
    if (!dayLog || !dayLog.lily) return;
    const dow = new Date(dateKey + "T12:00:00Z").getUTCDay();
    if (dow < 1 || dow > 5) return; // weekdays only (Mon-Fri)

    // Determine who picks up Lily:
    //   afterCare="Us" + afterWho=Kelly/Kevin → that parent picks up
    //   afterCare="Nana & Grumpa" → Nana & Grumpa pick up
    if (dayLog.lily.afterCare === "Us" && dayLog.lily.afterWho) {
      const person = dayLog.lily.afterWho;
      if (!pickupDays[person]) pickupDays[person] = [];
      pickupDays[person].push(DAY_NAMES[dow]);
    } else if (dayLog.lily.afterCare === "Nana & Grumpa") {
      if (!pickupDays["Nana & Grumpa"]) pickupDays["Nana & Grumpa"] = [];
      pickupDays["Nana & Grumpa"].push(DAY_NAMES[dow]);
    }
  });

  const people = Object.keys(pickupDays).filter((p) => EMAIL_BY_NAME[p]);
  if (!people.length) {
    console.log("No pick-up assignments found for week", event.params.weekId);
    return;
  }

  const db = getFirestore();
  const messaging = getMessaging();
  let sentAny = false;

  for (const person of people) {
    const email = EMAIL_BY_NAME[person];
    const days = pickupDays[person];

    // Look up this person's FCM token by email
    const tokenSnap = await db.collection("fcm_tokens").where("email", "==", email).limit(1).get();
    if (tokenSnap.empty) {
      console.log(`No FCM token for ${person} (${email})`);
      continue;
    }

    const token = tokenSnap.docs[0].data().token;
    if (!token) continue;

    // Build the message body
    let dayList;
    if (days.length === 1) {
      // Find the date key for this person's single pick-up day
      const dateKey = Object.keys(logistics).find((k) => {
        const dl = logistics[k];
        if (person === "Nana & Grumpa") return dl?.lily?.afterCare === "Nana & Grumpa";
        return dl?.lily?.afterCare === "Us" && dl?.lily?.afterWho === person;
      });
      const dow = new Date(dateKey + "T12:00:00Z").getUTCDay();
      dayList = WEEKDAY_FULL[dow];
    } else {
      dayList = days.join(", ");
    }

    const message = {
      notification: {
        title: "Lily pick-up reminder",
        body: `Remember Lily pick up at 3:27 this week on: ${dayList}`,
      },
      webpush: {
        notification: {
          icon: `${APP_URL}/icon-192.png`,
          badge: `${APP_URL}/icon-192.png`,
          vibrate: [200, 100, 200],
        },
        fcm_options: {
          link: APP_URL,
        },
      },
      token,
    };

    try {
      const resp = await messaging.send(message);
      console.log(`Pick-up reminder sent to ${person}:`, resp);
      sentAny = true;
    } catch (e) {
      console.error(`Failed to send pick-up reminder to ${person}:`, e);
    }
  }

  // Mark reminders as sent so we don't re-send if the document updates again
  if (sentAny) {
    await db.collection("sou").doc(event.params.weekId).set(
      { pickupRemindersSent: true },
      { merge: true }
    );
  }
});
