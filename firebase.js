import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDCCcEwAiJllweBPcRkBB4ucTSb6_9OrOU",
  authDomain: "gravitas26.firebaseapp.com",
  projectId: "gravitas26",
  storageBucket: "gravitas26.firebasestorage.app",
  messagingSenderId: "365982186824",
  appId: "1:365982186824:web:9897df6413acf0612c077d"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);