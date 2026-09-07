import { auth, db } from "./firebase.js";

import {
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";


function initLogin() {

    const loginBtn =
        document.getElementById("loginBtn");

    const loader =
        document.getElementById("loader");

    const emailInput =
        document.getElementById("email");

    const passwordInput =
        document.getElementById("password");

    const togglePasswordBtn =
        document.getElementById("togglePassword");


    if (!loginBtn || !loader || !emailInput || !passwordInput) {
        console.error("Login elements not found.");
        return;
    }


    /* ==============================
       LOADING
    ============================== */

    const setLoadingState = (loading) => {

        loader.style.display =
            loading ? "inline-block" : "none";

        loginBtn.disabled = loading;

    };


    /* ==============================
       PASSWORD SHOW / HIDE
    ============================== */

    if (togglePasswordBtn) {

        togglePasswordBtn.addEventListener("click", () => {

            const isPassword =
                passwordInput.type === "password";

            passwordInput.type =
                isPassword ? "text" : "password";

            const icon =
                togglePasswordBtn.querySelector("i");

            if (icon) {

                icon.className =
                    isPassword
                        ? "bi bi-eye-slash"
                        : "bi bi-eye";
            }

        });

    }


    /* ==============================
       LOGIN
    ============================== */

    const login = async (event) => {

        if (event) {
            event.preventDefault();
        }


        const email =
            emailInput.value.trim();

        /*
         * Do NOT trim password.
         * Passwords must be sent exactly as entered.
         */
        const password =
            passwordInput.value;


        const selectedRole =
            document.querySelector(
                'input[name="loginType"]:checked'
            )?.value;


        /* ==============================
           VALIDATION
        ============================== */

        if (!email) {

            showToast(
                "Email Required",
                "Please enter your email address."
            );

            emailInput.focus();
            return;
        }


        if (!password) {

            showToast(
                "Password Required",
                "Please enter your password."
            );

            passwordInput.focus();
            return;
        }


        if (!selectedRole) {

            showToast(
                "Login Type Required",
                "Please select Student or Teacher."
            );

            return;
        }


        setLoadingState(true);


        try {

            /* ==============================
               STEP 1: FIREBASE AUTH
            ============================== */

            console.log("Attempting Firebase login...");
            console.log("Email:", email);
            console.log("Selected role:", selectedRole);

            const userCredential =
                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );


            const user =
                userCredential.user;


            console.log(
                "Firebase Authentication successful."
            );

            console.log(
                "Firebase UID:",
                user.uid
            );


            /* ==============================
               STEP 2: FIRESTORE USER
            ============================== */

            const userRef =
                doc(
                    db,
                    "users",
                    user.uid
                );


            const userSnapshot =
                await getDoc(userRef);


            /* ==============================
               USER PROFILE NOT FOUND
            ============================== */

            if (!userSnapshot.exists()) {

                console.error(
                    "Firestore profile missing for UID:",
                    user.uid
                );

                await signOut(auth);

                showToast(
                    "Profile Not Found",
                    "Firebase login is correct, but your CogniFlow user profile is missing."
                );

                return;
            }


            /* ==============================
               STEP 3: GET ROLE
            ============================== */

            const userData =
                userSnapshot.data();


            const actualRole =
                userData.role;


            console.log(
                "Firestore role:",
                actualRole
            );


            /* ==============================
               INVALID ROLE
            ============================== */

            if (
                actualRole !== "student" &&
                actualRole !== "teacher"
            ) {

                await signOut(auth);

                showToast(
                    "Invalid Account",
                    "Your account does not have a valid Student or Teacher role."
                );

                return;
            }


            /* ==============================
               STEP 4: CHECK LOGIN TYPE
            ============================== */

            if (actualRole !== selectedRole) {

                await signOut(auth);


                if (selectedRole === "student") {

                    showToast(
                        "Invalid Student Login",
                        "This account belongs to a Teacher. Please select Teacher login."
                    );

                } else {

                    showToast(
                        "Invalid Teacher Login",
                        "This account belongs to a Student. Please select Student login."
                    );
                }

                return;
            }


            /* ==============================
               STEP 5: SAVE USER
            ============================== */

            localStorage.setItem(
                "userEmail",
                user.email
            );

            localStorage.setItem(
                "userRole",
                actualRole
            );

            localStorage.setItem(
                "userName",
                userData.name || ""
            );


            /* ==============================
               STEP 6: DASHBOARD
            ============================== */

            if (actualRole === "student") {

                window.location.href = "splash.html";

                return;
            }


            if (actualRole === "teacher") {

                window.location.href =
                    "teacher-dashboard.html";

                return;
            }

        }


        /* ==============================
           FIREBASE ERRORS
        ============================== */

        catch (error) {

            console.error(
                "Firebase error code:",
                error.code
            );

            console.error(
                "Firebase error message:",
                error.message
            );


            /* INVALID CREDENTIAL */

            if (
                error.code ===
                "auth/invalid-credential"
            ) {

                showToast(
                    "Login Failed",
                    "Incorrect email or password."
                );

            }


            /* USER NOT FOUND */

            else if (
                error.code ===
                "auth/user-not-found"
            ) {

                showToast(
                    "Account Not Found",
                    "No Firebase account exists with this email."
                );

            }


            /* WRONG PASSWORD */

            else if (
                error.code ===
                "auth/wrong-password"
            ) {

                showToast(
                    "Wrong Password",
                    "The password entered is incorrect."
                );

            }


            /* INVALID EMAIL */

            else if (
                error.code ===
                "auth/invalid-email"
            ) {

                showToast(
                    "Invalid Email",
                    "Please enter a valid email address."
                );

            }


            /* EMAIL/PASSWORD DISABLED */

            else if (
                error.code ===
                "auth/operation-not-allowed"
            ) {

                showToast(
                    "Authentication Disabled",
                    "Enable Email/Password authentication in Firebase."
                );

            }


            /* TOO MANY ATTEMPTS */

            else if (
                error.code ===
                "auth/too-many-requests"
            ) {

                showToast(
                    "Too Many Attempts",
                    "Too many login attempts. Please try again later."
                );

            }


            /* FIRESTORE PERMISSION */

            else if (
                error.code ===
                "permission-denied" ||
                error.code ===
                "firestore/permission-denied"
            ) {

                showToast(
                    "Database Access Denied",
                    "Firestore rules are blocking access to the user profile."
                );

            }


            /* ANY OTHER ERROR */

            else {

                showToast(
                    "Login Error",
                    error.message ||
                    "Something went wrong. Check the browser console."
                );

            }

        }


        finally {

            setLoadingState(false);

        }

    };


    /* ==============================
       LOGIN BUTTON
    ============================== */

    loginBtn.addEventListener(
        "click",
        login
    );


    /* ==============================
       ENTER KEY
    ============================== */

    [
        emailInput,
        passwordInput
    ].forEach((input) => {

        input.addEventListener(
            "keydown",
            (event) => {

                if (event.key === "Enter") {
                    login(event);
                }

            }
        );

    });

}


/* ==============================
   INITIALIZE
============================== */

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        initLogin,
        { once: true }
    );

} else {

    initLogin();

}