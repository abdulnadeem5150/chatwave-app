// ══════════════════════════════════════════
//  seed.js  →  public/seed.js
//  Run this ONCE to add demo contacts
//  Open: http://localhost:5000/seed.html
// ══════════════════════════════════════════

import { db, auth } from "./firebase.js";
import {
  doc, setDoc, serverTimestamp, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  createUserWithEmailAndPassword, updateProfile, signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const DEMO_USERS = [
  { name: "Priya Sharma",   email: "priya@chatwave.app",   password: "demo1234", status: "active" },
  { name: "Arjun Mehta",    email: "arjun@chatwave.app",   password: "demo1234", status: "active" },
  { name: "Neha Kapoor",    email: "neha@chatwave.app",    password: "demo1234", status: "away"   },
  { name: "Rohan Verma",    email: "rohan@chatwave.app",   password: "demo1234", status: "busy"   },
  { name: "Aisha Khan",     email: "aisha@chatwave.app",   password: "demo1234", status: "active" },
  { name: "Dev Patel",      email: "dev@chatwave.app",     password: "demo1234", status: "active" },
];

window.seedUsers = async () => {
  const log = document.getElementById('log');
  const btn = document.getElementById('seed-btn');
  btn.disabled = true;
  log.innerHTML = '';

  function addLog(msg, color='#e2edf8') {
    log.innerHTML += `<div style="color:${color};margin:4px 0">${msg}</div>`;
    log.scrollTop = log.scrollHeight;
  }

  addLog('🚀 Starting to create demo users…', '#00e5b0');

  for (const u of DEMO_USERS) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, u.email, u.password);
      await updateProfile(cred.user, { displayName: u.name });
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        name: u.name,
        email: u.email,
        online: false,
        status: u.status,
        lastSeen: serverTimestamp(),
        createdAt: serverTimestamp()
      });
      await signOut(auth);
      addLog(`✅ Created: ${u.name} (${u.email})`, '#2ecc71');
    } catch(e) {
      if (e.code === 'auth/email-already-in-use') {
        addLog(`⚠️ Already exists: ${u.name}`, '#f1c40f');
      } else {
        addLog(`❌ Failed: ${u.name} — ${e.message}`, '#ff5f5f');
      }
    }
  }

  addLog('', '');
  addLog('🎉 Done! Go back to your app and refresh.', '#00e5b0');
  addLog('👉 <a href="/" style="color:#00e5b0">Click here to go to ChatWave</a>', '#00e5b0');
  btn.disabled = false;
};