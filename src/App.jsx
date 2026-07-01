import { useState, useEffect } from "react";
import { auth, googleProvider, db, messaging, requestNotificationPermission, onMessage } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import FamilySOUnion from "./FamilySOUnion";
import { Heart, Bell, BellOff } from "lucide-react";

const ALLOWED_EMAILS = [
  "kellymdonoho@gmail.com",
  "kdonoho1@gmail.com",
];

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || "";

async function saveTokenToFirestore(userId, token) {
  await setDoc(doc(db, "fcm_tokens", userId), { token, updatedAt: new Date().toISOString() });
}

export default function App() {
  const [user, setUser]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [notifStatus, setNotifStatus] = useState("unknown");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u) checkNotificationStatus(u.uid);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = onMessage(messaging, (payload) => {
      const { title, body } = payload.notification || {};
      if (title) {
        const toast = document.createElement("div");
        toast.innerHTML = `<strong>${title}</strong><p style="margin:4px 0 0">${body || ""}</p>`;
        Object.assign(toast.style, {
          position:"fixed", top:"16px", right:"16px", background:"#0f172a", color:"white",
          padding:"12px 16px", borderRadius:"12px", fontSize:"13px", zIndex:"9999",
          boxShadow:"0 4px 20px rgba(0,0,0,0.3)", maxWidth:"300px", lineHeight:"1.4",
        });
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
      }
    });
    return unsub;
  }, [user]);

  const checkNotificationStatus = async (uid) => {
    if (!("Notification" in window)) { setNotifStatus("unsupported"); return; }
    if (Notification.permission === "granted") {
      setNotifStatus("granted");
      const token = await requestNotificationPermission(VAPID_KEY);
      if (token) await saveTokenToFirestore(uid, token);
    } else if (Notification.permission === "denied") {
      setNotifStatus("denied");
    } else {
      setNotifStatus("prompt");
    }
  };

  const enableNotifications = async () => {
    if (!user || !VAPID_KEY) return;
    const token = await requestNotificationPermission(VAPID_KEY);
    if (token) { await saveTokenToFirestore(user.uid, token); setNotifStatus("granted"); }
    else setNotifStatus(Notification.permission === "denied" ? "denied" : "prompt");
  };

  const signIn = async () => {
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (ALLOWED_EMAILS.length > 0 && !ALLOWED_EMAILS.includes(result.user.email)) {
        await signOut(auth);
        setError("This Google account is not authorized.");
      }
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="bg-white border border-stone-200 rounded-2xl p-8 shadow-sm max-w-sm w-full text-center">
        <Heart className="w-10 h-10 text-rose-400 mx-auto mb-4"/>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Kelly & Kevin</h1>
        <p className="text-sm text-stone-500 mb-6">State of the Union</p>
        {error && <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-2 mb-4 text-xs text-rose-700">{error}</div>}
        <button onClick={signIn}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-stone-300 rounded-xl hover:bg-stone-50 transition-colors text-sm font-semibold text-slate-700 shadow-sm">
          <svg viewBox="0 0 24 24" className="w-5 h-5">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </button>
        <p className="text-xs text-stone-400 mt-4">Both Kelly and Kevin sign in with their Google account</p>
      </div>
    </div>
  );

  return (
    <div>
      {notifStatus === "prompt" && VAPID_KEY && (
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center gap-3">
          <Bell className="w-4 h-4 text-amber-400 flex-shrink-0"/>
          <p className="text-sm flex-1">Get a reminder before Sunday meetings</p>
          <button onClick={enableNotifications}
            className="text-xs font-bold bg-white text-slate-900 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors flex-shrink-0">
            Enable
          </button>
          <button onClick={()=>setNotifStatus("dismissed")} className="text-stone-400 hover:text-white">
            <BellOff className="w-4 h-4"/>
          </button>
        </div>
      )}
      {notifStatus === "denied" && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-700 text-center">
          Notifications blocked. Settings → Safari → [this site] → Notifications → Allow
        </div>
      )}
      <FamilySOUnion db={db} user={user} onSignOut={()=>signOut(auth)}/>
    </div>
  );
}
