import { supabase, esc, user } from "./supabase.js";

const root = document.querySelector("#account");
const heading = document.querySelector("#heading");

function loginUI() {
  root.innerHTML = `
    <div class="tabs">
      <button id="loginTab" class="active">Sign in</button>
      <button id="signupTab">Create account</button>
    </div>

    <form id="auth">
      <label>
        Email
        <input id="email" type="email" required>
      </label>

      <label>
        Password
        <input id="password" type="password" minlength="6" required>
      </label>

      <div id="namebox" class="hidden">
        <label>
          Full name
          <input id="name">
        </label>

        <label>
          Phone/WhatsApp
          <input id="phone">
        </label>
      </div>

      <button class="btn full">Continue</button>
      <div id="msg" class="status"></div>
    </form>
  `;

  let mode = "login";

  const loginTab = document.querySelector("#loginTab");
  const signupTab = document.querySelector("#signupTab");
  const namebox = document.querySelector("#namebox");
  const form = document.querySelector("#auth");
  const msg = document.querySelector("#msg");

  const emailInput = document.querySelector("#email");
  const passwordInput = document.querySelector("#password");
  const nameInput = document.querySelector("#name");
  const phoneInput = document.querySelector("#phone");

  loginTab.onclick = () => {
    mode = "login";
    loginTab.classList.add("active");
    signupTab.classList.remove("active");
    namebox.classList.add("hidden");
    msg.textContent = "";
  };

  signupTab.onclick = () => {
    mode = "signup";
    signupTab.classList.add("active");
    loginTab.classList.remove("active");
    namebox.classList.remove("hidden");
    msg.textContent = "";
  };

  form.onsubmit = async (e) => {
    e.preventDefault();

    msg.textContent = "Please wait…";

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const fullName = nameInput.value.trim();
    const phone = phoneInput.value.trim();

    if (mode === "login") {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        msg.textContent = error.message;
        return;
      }

      if (data?.session) {
        msg.textContent = "Signed in. Redirecting…";
        location.href = "dashboard.html";
      }

      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone
        }
      }
    });

    if (error) {
      msg.textContent = error.message;
      return;
    }

    /*
      Confirm email is OFF in Supabase.
      Therefore a successful signup should return a session.
    */
    if (data?.session) {
      msg.textContent = "Account created. Welcome to AjeMarket!";

      setTimeout(() => {
        location.href = "dashboard.html";
      }, 500);

      return;
    }

    /*
      Fallback in case Supabase creates the account
      but doesn't return a session.
    */
    msg.textContent = "Account created. Signing you in…";

    const { data: loginData, error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password
      });

    if (loginError) {
      msg.textContent = loginError.message;
      return;
    }

    if (loginData?.session) {
      location.href = "dashboard.html";
    }
  };
}

async function init() {
  const u = await user();

  if (!u) {
    loginUI();
    return;
  }

  heading.textContent = "My account";

  const { data: p } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", u.id)
    .maybeSingle();

  root.innerHTML = `
    <div class="notice">
      <b>${esc(p?.full_name || u.email)}</b><br>
      ${esc(u.email)}<br>
      ${esc(p?.phone || "")}
    </div>

    <div class="actions">
      <a class="btn" href="dashboard.html">My dashboard</a>
      <a class="btn secondary" href="sell.html">Sell a product</a>
      <button class="btn danger" id="out">Sign out</button>
    </div>
  `;

  document.querySelector("#out").onclick = async () => {
    await supabase.auth.signOut();
    location.reload();
  };
}

init(); 
