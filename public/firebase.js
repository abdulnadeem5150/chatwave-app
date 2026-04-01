// ══════════════════════════════════════════
//  firebase.js  →  public/firebase.js
//  Storage REMOVED — uses Firestore only
// ══════════════════════════════════════════

import { initializeApp }  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth }        from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore }   from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyDc_oXk-4ChaWOjTLojDfAZ945diBp8KtI",
  authDomain:        "chatwave-36adf.firebaseapp.com",
  projectId:         "chatwave-36adf",
  storageBucket:     "chatwave-36adf.firebasestorage.app",
  messagingSenderId: "882972475400",
  appId:             "1:882972475400:web:97b77769eb9ca6e8d2d1bd"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// storage is NOT exported — file upload disabled
export { app, auth, db };