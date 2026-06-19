// Firebase messaging service worker
// This file must be at the root of your domain (/firebase-messaging-sw.js)
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

// These values are safe to be public - they only identify your Firebase project
firebase.initializeApp({
  apiKey:            "AIzaSyB4G-d8IPLPpbbCGQst2vDj0aVoHG14eDw",
  authDomain:        "family-sotu.firebaseapp.com",
  projectId:         "family-sotu",
  storageBucket:     "family-sotu.firebasestorage.app",
  messagingSenderId: "269556323351",
  appId:             "1:269556323351:web:f6df520b51400835597852",
});

const messaging = firebase.messaging();

// Handle background push notifications (when app is closed or in background)
messaging.onBackgroundMessage((payload) => {
  console.log("Background message received:", payload);
  const { title, body } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [200, 100, 200],
    data: payload.data,
    actions: [{ action: "open", title: "Open SotU" }],
  });
});

// Open the app when notification is clicked
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) return clientList[0].focus();
      return clients.openWindow("/");
    })
  );
});
