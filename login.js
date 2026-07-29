import { auth } from "./firebase.js";
import {
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

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

    if (!email || !password) {
      showToast("Missing Fields", "Please enter Email and Password");
      return;
    }

    setLoadingState(true);

    try {
      const user = await signInWithEmailAndPassword(auth, email, password);
      localStorage.setItem("userEmail", user.user.email || email);
      window.location.href = "dashboard.html";
    } catch (error) {
      const errorCode = error?.code || "";
      const isInvalidCred = [
        "auth/invalid-credential",
        "auth/user-not-found",
        "auth/wrong-password",
        "auth/invalid-email"
      ].includes(errorCode);

      showToast(
        "Login Failed",
        isInvalidCred ? "Invalid email or password." : "Unable to sign in right now. Please try again."
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