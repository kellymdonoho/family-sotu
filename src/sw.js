import { precacheAndRoute } from "workbox-precaching";
import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

// Workbox: precache all build assets (manifest injected by vite-plugin-pwa)
precacheAndRoute(self.__WB_MANIFEST);

// Firebase: handle background push notifications
const app = initializeApp({
  apiKey:            "AIzaSyB4G-d8IPLPpbbCGQst2vDj0aVoHG14eDw",
  authDomain:        "family-sotu.firebaseapp.com",
  projectId:         "family-sotu",
  storageBucket:     "family-sotu.firebasestorage.app",
  messagingSenderId: "269556323351",
  appId:             "1:269556323351:web:f6df520b51400835597852",
});

const messaging = getMessaging(app);

onBackgroundMessage(messaging, (payload) => {
  const { title, body } = payload.notification ?? {};
  if (!title) return;
  self.registration.showNotification(title, {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [200, 100, 200],
    data: payload.data,
    actions: [{ action: "open", title: "Open SotU" }],
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) return clientList[0].focus();
      return clients.openWindow("/");
    })
  );
});
