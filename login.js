import { auth, db } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

function initLogin() {
  const loginBtn = document.getElementById("loginBtn");
  const loader = document.getElementById("loader");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const togglePasswordBtn = document.getElementById("togglePassword");

  if (!loginBtn || !loader || !emailInput || !passwordInput) return;

  const setLoadingState = (isLoading) => {
    loader.style.display = isLoading ? "inline-block" : "none";
    loginBtn.disabled = isLoading;
  };

  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener("click", () => {
      const isPassword = passwordInput.type === "password";
      passwordInput.type = isPassword ? "text" : "password";
      const icon = togglePasswordBtn.querySelector("i");
      if (icon) {
        icon.className = isPassword ? "bi bi-eye-slash" : "bi bi-eye";
      }
    });
  }

  const login = async (event) => {
    if (event) event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const loginType = document.querySelector('input[name="loginType"]:checked')?.value || "user";

    if (!email || !password) {
      showToast("Missing Fields", "Please enter Email and Password");
      return;
    }

    setLoadingState(true);

    try {

        const userCredential = await signInWithEmailAndPassword(auth, email, password);

        const user = userCredential.user;

        const loginType = document.querySelector(
            'input[name="loginType"]:checked'
        ).value;

        localStorage.setItem("userEmail", user.email);

        // Check whether the logged-in email is an admin
        const q = query(
            collection(db, "admins"),
            where("email", "==", user.email)
        );

        const snapshot = await getDocs(q);

        if (loginType === "admin") {

            // Admin login selected
            if (snapshot.empty) {

                await signOut(auth);

                showToast(
                    "Access Denied",
                    "This email is not authorized as an Admin."
                );

                return;
            }

            window.location.href = "admin.html";
            return;

        } else {

            // User login selected
            if (!snapshot.empty) {

                await signOut(auth);

                showToast(
                    "Wrong Login",
                    "This account is an Admin. Please use the Admin login."
                );

                return;
            }

            window.location.href = "dashboard.html";
            return;
        }

    }
    catch(error){

        showToast(
            "Login Failed",
            "Invalid Email or Password"
        );

    } finally {
      setLoadingState(false);
    }
  };

  loginBtn.addEventListener("click", login);

  [emailInput, passwordInput].forEach((input) => {
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        login(event);
      }
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLogin, { once: true });
} else {
  initLogin();
}