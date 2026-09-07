import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getVertexAI, getGenerativeModel } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-vertexai-preview.js";

const firebaseConfig = {
  apiKey: "AIzaSyBimSfKfL8lFRbvuu67_oIORWhl66dbYjU",
  authDomain: "cogniflow-3435c.firebaseapp.com",
  projectId: "cogniflow-3435c",
  storageBucket: "cogniflow-3435c.firebasestorage.app",
  messagingSenderId: "496888121161",
  appId: "1:496888121161:web:84e5c683287440a5cdbc98"
};

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export const vertexAI = getVertexAI(app);
export const tutorModel = getGenerativeModel(vertexAI, { model: "gemini-1.5-flash" });