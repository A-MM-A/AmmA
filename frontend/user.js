// 1) Supabase init
// 
// will use the data in script.js
// 

// 2) DOM refs
const avatarImg = document.getElementById("user-avatar");
const nameSpan = document.getElementById("user-name");
const logoutBtn = document.getElementById("logout-btn");
const loginBtnTop = document.getElementById("login-btn-top");
const settingsSec = document.getElementById("settings-section");
const notLoggedMsg = document.getElementById("not-logged-in-msg");

// Manual fallback for older UMD builds + debug printline
async function handleOAuthRedirectFallback() {
    const params = new URLSearchParams(window.location.search);
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    // console.log("⚙️ OAuth fallback, URL params:", Object.fromEntries(params.entries()));  // <— Printline

    if (access_token) {
        const { data, error } = await supa.auth.setSession({
            access_token,
            refresh_token
        });
        if (error) {
            console.error("Error in fallback setSession:", error.message);
        } else {
            console.log("✅ Fallback setSession succeeded", data.session);
            // clean up the URL
            window.history.replaceState({}, "", window.location.pathname);
        }
    }
}

// 3) Check session, update UI
async function checkSession() {
    // console.log("→ checkSession() fired");
    const { data: { session } } = await supa.auth.getSession();

    // 👇 Add this to inspect your session object every time
    // console.log("checkSession → session:", session);

    if (session) {
        // Top bar
        const meta = session.user.user_metadata || {};
        if (avatarImg && nameSpan && logoutBtn && loginBtnTop && settingsSec && notLoggedMsg) {
            avatarImg.src = meta.avatar_url || "icons/user-fill.svg";
            nameSpan.textContent = meta.full_name || session.user.email;
            logoutBtn.classList.remove("hidden");
            loginBtnTop.classList.add("hidden");
            // Settings
            settingsSec.classList.remove("hidden");
            notLoggedMsg.classList.add("hidden");
        }

    }
    else {
        if (avatarImg && nameSpan && logoutBtn && loginBtnTop && settingsSec && notLoggedMsg) {

            avatarImg.src = "icons/user-fill.svg";
            nameSpan.textContent = "Guest";
            logoutBtn.classList.add("hidden");
            loginBtnTop.classList.remove("hidden");

            settingsSec.classList.add("hidden");
            notLoggedMsg.classList.remove("hidden");
        }
    }
}

// 4) Logout handler
if (logoutBtn) {

    logoutBtn.addEventListener("click", async () => {
        await supa.auth.signOut();
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        await checkSession();
        Loggedoffstatus()
        Saved();
    });
}

// 5) Build & inject login pop‑up HTML/CSS **once**
let popupInit = false;
function ensureLoginPopup() {
    if (popupInit) return;
    popupInit = true;

    // Inject styles
    const style = document.createElement("style");
    style.textContent = `
    .overlay {
      position: fixed; 
      top:0; 
      left:0; 
      width:100%; 
      height:100%;
      background: rgba(128,128,128,0.3);
      display: flex; 
      align-items:center; 
      justify-content:center;
      z-index:1000;
    }
    .overlay
    .hidden { 
    display: none; 
    }
    .login-popup {
      background: #ffffff;
      border-radius: 16px;
      width: 90%;
      max-width: 360px;
      height: 55%;
      padding: 16px;
      position: absolute;
      top: 150px;
    }
    .close-btn {
      position:absolute; 
      top:8px; 
      right:12px;
      background:none; 
      border:none; 
      font-size:1.2rem; 
      cursor:pointer;
    }
    .popup-logo { 
      display:block; 
      margin:0 auto 16px;
      width:120px; 
      height:110px; 
      object-fit:contain;
    }
    .pill-input {
      width:100%; 
      padding:10px 14px; 
      margin-bottom:12px;
      border:1px solid #ccc; 
      border-radius:9999px; 
      font-size:1rem;
    }
    .show-password { 
      display:flex; 
      align-items:center;
      font-size:0.9rem; 
      margin-bottom:12px;
    }
    .show-password input { 
      margin-right:6px; 
    }
    .action-buttons {
      display:flex; 
      justify-content:space-between; 
      margin-bottom:12px;
    }
    .signup-pill { 
      position: absolute;
      background-color: #27ae60;
      color: #fff;
      left: 50px;
    }
    .login-pill-2  { 
      position: absolute;
      background-color: #2980b9;
      color: #fff;
      right: 50px; 
    }
    .auth-msg{
      white-space: nowrap;
      overflow-x: auto;
    }
    .divider {
      border: none;
      border-top: 1px solid #88888880;
      margin: 12px 0;
      position: absolute;
      bottom: 57px;
      right: 10px;
      left: 10px;
    }
    .google-btn {
      position: absolute;
      bottom: 20px;
      right: 25%;
      background: linear-gradient(to right, rgba(255, 0, 0, 0.228), rgba(255, 255, 0, 0.248), rgba(0, 128, 0, 0.294), rgba(0, 0, 255, 0.274));
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 0.95rem;
      cursor: pointer;
      border-radius: 20px;
    }
    .google-btn img { 
      width:18px; 
      height:18px; 
      margin-right:8px; 
    }
  `;
    document.head.appendChild(style);

    // Overlay
    const overlay = document.createElement("div");
    overlay.id = "login-overlay";
    overlay.className = "overlay hidden";

    // Popup
    const popup = document.createElement("div");
    popup.className = "login-popup";

    // Close button
    const closeBtn = document.createElement("button");
    closeBtn.className = "close-btn";
    closeBtn.innerText = "X";
    closeBtn.onclick = () => {
        overlay.classList.add("hidden");
    };

    // Logo
    const logo = document.createElement("img");
    logo.src = "logo/logo.svg";
    logo.alt = "Logo";
    logo.className = "popup-logo";

    // Content container
    const content = document.createElement("div");
    content.className = "login-content";

    // Email input
    const emailIn = document.createElement("input");
    emailIn.id = "popup-email";
    emailIn.type = "email";
    emailIn.placeholder = "Email";
    emailIn.className = "pill-input";

    // Password input
    const passIn = document.createElement("input");
    passIn.id = "popup-password";
    passIn.type = "password";
    passIn.placeholder = "Password";
    passIn.className = "pill-input";

    // Show-password
    const showLab = document.createElement("label");
    showLab.className = "show-password";
    showLab.innerHTML = `<input type="checkbox" id="show-password-checkbox"> Show password`;
    showLab.querySelector("input")
        .onchange = e => passIn.type = e.target.checked ? "text" : "password";

    // Message
    const msg = document.createElement("p");
    msg.id = "popup-auth-message";
    msg.className = "auth-msg";

    // Actions
    const actions = document.createElement("div");
    actions.className = "action-buttons";

    const signupBtn = document.createElement("button");
    signupBtn.id = "popup-signup";
    signupBtn.className = "pill-btn signup-pill";
    signupBtn.innerText = "Sign Up";
    signupBtn.onclick = handleSignup;

    const loginBtn = document.createElement("button");
    loginBtn.id = "popup-login";
    loginBtn.className = "pill-btn login-pill-2";
    loginBtn.innerText = "Login";
    loginBtn.onclick = handlePopupLogin;

    actions.append(signupBtn, loginBtn);

    // Divider
    const hr = document.createElement("hr");
    hr.className = "divider";

    // Google
    const gbtn = document.createElement("button");
    gbtn.id = "popup-google";
    gbtn.className = "google-btn";
    gbtn.innerHTML = `<img src="logo/google-logo.svg" alt=""> Continue with Google`;
    gbtn.onclick = handleGoogle;

    // Assemble
    content.append(emailIn, passIn, showLab, msg, actions, hr, gbtn);
    popup.append(closeBtn, logo, content);
    overlay.append(popup);
    document.body.append(overlay);

    // Outside‑click
    overlay.onclick = e => {
        if (e.target === overlay && !emailIn.value && !passIn.value) {
            overlay.classList.add("hidden");
        }
    };
}

// 6) Show pop‑up
function showLoginPopup() {
    ensureLoginPopup();
    document.getElementById("popup-email").value = "";
    document.getElementById("popup-password").value = "";
    document.getElementById("popup-auth-message").textContent = "";
    document.getElementById("login-overlay")
        .classList.remove("hidden");
}

if (loginBtnTop) {

    loginBtnTop.addEventListener("click", showLoginPopup);
}

// 7) Handlers (copy‑paste from your ZIP)
async function handleSignup() {
    const email = document.getElementById("popup-email").value.trim();
    const password = document.getElementById("popup-password").value.trim();
    const msg = document.getElementById("popup-auth-message");
    if (!email || !password) {
        msg.textContent = "Email and password are required.";
        msg.style.color = "red";
        return;
    }
    const { data, error } = await supa.auth.signUp({ email, password });
    if (error) {
        msg.textContent = error.message;
        msg.style.color = "red";
        return;
    }
    await supa.from("users").insert({ id: data.user.id, email });
    msg.textContent = "Sign‑up successful! Check your email.";
    msg.style.color = "green";
}

async function handlePopupLogin() {
    const email = document.getElementById("popup-email").value.trim();
    const password = document.getElementById("popup-password").value.trim();
    const msg = document.getElementById("popup-auth-message");
    if (!email || !password) {
        msg.textContent = "Email and password are required.";
        msg.style.color = "red";
        return;
    }
    const { error } = await supa.auth.signInWithPassword({ email, password });
    if (error) {
        msg.textContent = error.message;
        msg.style.color = "red";
        return;
    }
    document.getElementById("login-overlay")
        .classList.add("hidden");
    await checkSession();
}

async function handleGoogle() {
    const cleanUrl = window.location.origin + window.location.pathname;
    await supa.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: cleanUrl }
    });
}

async function handleOAuthRedirect() {
    // parse location.search for access_token and expires_in
    const params = new URLSearchParams(window.location.search);
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (access_token) {
        console.log("→ Found OAuth tokens in URL, manually setting session");
        const { data, error } = await supa.auth.setSession({
            access_token,
            refresh_token
        });
        if (error) {
            console.error("Error setting session from URL:", error.message);
        } else {
            // remove the tokens from the URL
            window.history.replaceState({}, "", window.location.pathname);
        }
    }
}



// Combine UI update into one function
function renderUI(session) {

    // 👇 Add this to inspect your session object every time
    console.log("checkSession → session:", session);
    // top bar + settings
    if (session) {
        logoutBtn.classList.remove("hidden");
        loginBtnTop.classList.add("hidden");
        const meta = session.user.user_metadata || {};
        avatarImg.src = meta.avatar_url || "icons/user-fill.svg";
        nameSpan.textContent = meta.full_name || session.user.email;

        settingsSec.classList.remove("hidden");
        notLoggedMsg.classList.add("hidden");
    } else {
        logoutBtn.classList.add("hidden");
        loginBtnTop.classList.remove("hidden");
        avatarImg.src = "icons/user-fill.svg";
        nameSpan.textContent = "Guest";

        settingsSec.classList.add("hidden");
        notLoggedMsg.classList.remove("hidden");
    }
}

// 9) On load (and OAuth)
window.addEventListener("DOMContentLoaded", async () => {
    // console.log("DOM ready");

    await handleOAuthRedirectFallback();


    // 2) Now re‑check session and render UI
    await checkSession();
});
