import { supabase, esc, user } from "./supabase.js";

const root = document.querySelector("#account");
const heading = document.querySelector("#heading");

function money(value) {
  const number = Number(value || 0);
  return "₦" + number.toLocaleString("en-NG");
}

function getProductImage(product) {
  if (product.image_url) return product.image_url;
  if (product.image) return product.image;
  if (product.photo_url) return product.photo_url;
  if (Array.isArray(product.images) && product.images.length) return product.images[0];

  if (typeof product.images === "string" && product.images.trim()) {
    try {
      const parsed = JSON.parse(product.images);
      if (Array.isArray(parsed) && parsed.length) return parsed[0];
    } catch {
      return product.images;
    }
  }

  return "";
}

function passwordField(id, label = "Password") {
  return `
    <label class="password-field">
      ${label}
      <div class="password-wrap">
        <input id="${id}" type="password" minlength="6" autocomplete="current-password" required>
        <button type="button" class="password-toggle" data-target="${id}" aria-label="Show password">👁️</button>
      </div>
    </label>
  `;
}

function setupPasswordToggles() {
  document.querySelectorAll(".password-toggle").forEach(button => {
    button.onclick = () => {
      const input = document.querySelector(`#${button.dataset.target}`);
      if (!input) return;

      const showing = input.type === "text";
      input.type = showing ? "password" : "text";
      button.textContent = showing ? "👁️" : "🙈";
      button.setAttribute(
        "aria-label",
        showing ? "Show password" : "Hide password"
      );
    };
  });
}

function loginUI() {
  root.innerHTML = `
    <div class="tabs">
      <button id="loginTab" class="active" type="button">Sign in</button>
      <button id="signupTab" type="button">Create account</button>
    </div>

    <form id="auth">
      <label>Email
        <input id="email" type="email" autocomplete="email" required>
      </label>

      ${passwordField("password")}

      <div id="namebox" class="hidden">
        <label>Full name
          <input id="name" type="text" autocomplete="name">
        </label>

        <label>Phone/WhatsApp
          <input id="phone" type="tel" autocomplete="tel">
        </label>
      </div>

      <button class="btn full" id="authButton" type="submit">Sign in</button>

      <button type="button" id="forgotPassword" class="link-button">
        Forgot password?
      </button>

      <div id="msg" class="status"></div>
    </form>
  `;

  let mode = "login";

  const loginTab = document.querySelector("#loginTab");
  const signupTab = document.querySelector("#signupTab");
  const namebox = document.querySelector("#namebox");
  const form = document.querySelector("#auth");
  const msg = document.querySelector("#msg");
  const authButton = document.querySelector("#authButton");
  const forgotButton = document.querySelector("#forgotPassword");
  const emailInput = document.querySelector("#email");
  const passwordInput = document.querySelector("#password");
  const nameInput = document.querySelector("#name");
  const phoneInput = document.querySelector("#phone");

  setupPasswordToggles();

  loginTab.onclick = () => {
    mode = "login";
    loginTab.classList.add("active");
    signupTab.classList.remove("active");
    namebox.classList.add("hidden");
    authButton.textContent = "Sign in";
    forgotButton.style.display = "block";
    msg.textContent = "";
  };

  signupTab.onclick = () => {
    mode = "signup";
    signupTab.classList.add("active");
    loginTab.classList.remove("active");
    namebox.classList.remove("hidden");
    authButton.textContent = "Create account";
    forgotButton.style.display = "none";
    msg.textContent = "";
  };

  forgotButton.onclick = async () => {
    const email = emailInput.value.trim();

    if (!email) {
      msg.textContent =
        "Enter your email address first, then tap Forgot password.";
      emailInput.focus();
      return;
    }

    forgotButton.disabled = true;
    forgotButton.textContent = "Sending…";

    try {
      const redirectUrl =
        `${window.location.origin}${window.location.pathname}`;

      const { error } =
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl
        });

      if (error) {
        msg.textContent = error.message;
        return;
      }

      msg.textContent =
        "Password reset email sent. Check your email and follow the link to create a new password.";
    } catch (error) {
      console.error(error);
      msg.textContent = "Unable to send password reset email.";
    } finally {
      forgotButton.disabled = false;
      forgotButton.textContent = "Forgot password?";
    }
  };

  form.onsubmit = async event => {
    event.preventDefault();
    msg.textContent = "Please wait…";

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const fullName = nameInput.value.trim();
    const phone = phoneInput.value.trim();

    if (mode === "login") {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email,
          password
        });

      if (error) {
        msg.textContent = error.message;
        return;
      }

      if (data?.session) {
        msg.textContent =
          "Signed in successfully. Redirecting…";

        setTimeout(() => {
          location.href = "dashboard.html";
        }, 400);
      }

      return;
    }

    if (!fullName) {
      msg.textContent = "Please enter your full name.";
      return;
    }

    const { data, error } =
      await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone
          }
        }
      });

    if (error) {
      msg.textContent = error.message;
      return;
    }

    if (data?.session) {
      msg.textContent =
        "Account created. Welcome to AjeMarket!";

      setTimeout(() => {
        location.href = "dashboard.html";
      }, 500);

      return;
    }

    msg.textContent = "Account created. Signing you in…";

    const { data: loginData, error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password
      });

    if (loginError) {
      msg.textContent =
        "Account created. Please check your email if confirmation is required.";
      return;
    }

    if (loginData?.session) {
      location.href = "dashboard.html";
    }
  };
}

function passwordResetUI() {
  heading.textContent = "Create a new password";

  root.innerHTML = `
    <div class="notice">
      <h3>Reset your AjeMarket password</h3>
      <p class="muted">
        Choose a new password for your account.
      </p>
    </div>

    <form id="resetForm">
      ${passwordField("newPassword", "New password")}
      ${passwordField("confirmPassword", "Confirm new password")}

      <button
        class="btn full"
        type="submit"
        id="resetButton"
      >
        Update password
      </button>

      <div id="resetMsg" class="status"></div>
    </form>
  `;

  setupPasswordToggles();

  const form = document.querySelector("#resetForm");
  const newPassword = document.querySelector("#newPassword");
  const confirmPassword =
    document.querySelector("#confirmPassword");
  const button = document.querySelector("#resetButton");
  const msg = document.querySelector("#resetMsg");

  form.onsubmit = async event => {
    event.preventDefault();

    const password = newPassword.value;
    const confirm = confirmPassword.value;

    if (password.length < 6) {
      msg.textContent =
        "Password must be at least 6 characters.";
      return;
    }

    if (password !== confirm) {
      msg.textContent =
        "The passwords do not match.";
      return;
    }

    button.disabled = true;
    button.textContent = "Updating…";

    const { error } =
      await supabase.auth.updateUser({ password });

    if (error) {
      msg.textContent = error.message;
      button.disabled = false;
      button.textContent = "Update password";
      return;
    }

    msg.textContent =
      "Password updated successfully. You can now sign in with your new password.";

    setTimeout(async () => {
      await supabase.auth.signOut();
      location.href = "account.html";
    }, 1200);
  };
}

async function loadFavorites(u) {
  const section =
    document.querySelector("#favoritesSection");

  if (!section) return;

  section.innerHTML = `
    <div class="section-title">
      <div>
        <small>SAVED PRODUCTS</small>
        <h2>My Favourites</h2>
      </div>
    </div>

    <div id="favoritesList" class="grid">
      <div class="empty">
        Loading your favourites…
      </div>
    </div>
  `;

  const list =
    document.querySelector("#favoritesList");

  const {
    data: favorites,
    error: favoriteError
  } = await supabase
    .from("favorites")
    .select("product_id, created_at")
    .eq("user_id", u.id)
    .order("created_at", { ascending: false });

  if (favoriteError) {
    list.innerHTML = `
      <div class="empty">
        Could not load your favourites.
        <br><br>
        ${esc(favoriteError.message)}
      </div>
    `;
    return;
  }

  if (!favorites || favorites.length === 0) {
    list.innerHTML = `
      <div class="empty">
        <h3>No saved products yet</h3>
        <p class="muted">
          Tap <b>Save</b> on a product you like and it
          will appear here.
        </p>
        <a class="btn" href="index.html">
          Explore products
        </a>
      </div>
    `;
    return;
  }

  const ids =
    favorites.map(item => item.product_id);

  const {
    data: products,
    error: productError
  } = await supabase
    .from("products")
    .select("*")
    .in("id", ids);

  if (productError) {
    list.innerHTML = `
      <div class="empty">
        Could not load your saved products.
        <br><br>
        ${esc(productError.message)}
      </div>
    `;
    return;
  }

  const productMap =
    new Map(
      (products || []).map(product => [
        product.id,
        product
      ])
    );

  list.innerHTML = favorites.map(favorite => {
    const product =
      productMap.get(favorite.product_id);

    if (!product) {
      return `
        <div class="card">
          <div class="cardbody">
            <h3>Product unavailable</h3>
            <p class="muted">
              This saved product is no longer available.
            </p>
            <button
              class="btn danger small remove-favorite"
              data-id="${esc(favorite.product_id)}"
            >
              Remove
            </button>
          </div>
        </div>
      `;
    }

    const title =
      product.title ||
      product.name ||
      "AjeMarket product";

    const price =
      product.price !== undefined &&
      product.price !== null
        ? money(product.price)
        : "Price unavailable";

    const location =
      product.location ||
      product.city ||
      "";

    const image =
      getProductImage(product);

    return `
      <article class="card">
        ${
          image
            ? `
              <img
                src="${esc(image)}"
                alt="${esc(title)}"
                loading="lazy"
              >
            `
            : `
              <div class="noimg">
                AjeMarket
              </div>
            `
        }

        <div class="cardbody">
          <h3>${esc(title)}</h3>

          <div class="price">
            ${esc(price)}
          </div>

          ${
            location
              ? `
                <div class="muted">
                  📍 ${esc(location)}
                </div>
              `
              : ""
          }

          <div
            class="actions"
            style="margin-top:14px"
          >
            <a
              class="btn small"
              href="product.html?id=${encodeURIComponent(product.id)}"
            >
              View product
            </a>

            <button
              class="btn danger small remove-favorite"
              data-id="${esc(product.id)}"
            >
              Remove
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  document
    .querySelectorAll(".remove-favorite")
    .forEach(button => {
      button.onclick = async () => {
        const productId =
          button.dataset.id;

        button.disabled = true;
        button.textContent = "Removing…";

        const { error } =
          await supabase
            .from("favorites")
            .delete()
            .eq("user_id", u.id)
            .eq("product_id", productId);

        if (error) {
          alert(error.message);
          button.disabled = false;
          button.textContent = "Remove";
          return;
        }

        await loadFavorites(u);
      };
    });
}

async function deleteMyAccount() {
  const firstConfirm = confirm(
    "Delete your AjeMarket account?\n\n" +
    "This will permanently remove your profile, " +
    "saved products and authentication account."
  );

  if (!firstConfirm) return;

  const secondConfirm = confirm(
    "This action cannot be undone.\n\n" +
    "Are you absolutely sure you want to delete your account?"
  );

  if (!secondConfirm) return;

  const button =
    document.querySelector("#deleteAccount");

  if (button) {
    button.disabled = true;
    button.textContent = "Deleting account…";
  }

  const { data, error } =
    await supabase.rpc("delete_my_account");

  if (error) {
    console.error(error);

    if (button) {
      button.disabled = false;
      button.textContent = "Delete my account";
    }

    alert(
      "Account deletion failed:\n\n" +
      error.message
    );

    return;
  }

  if (!data?.success) {
    if (button) {
      button.disabled = false;
      button.textContent = "Delete my account";
    }

    alert(
      "The account could not be deleted. Please try again."
    );

    return;
  }

  await supabase.auth.signOut();

  alert(
    "Your AjeMarket account has been permanently deleted."
  );

  location.href = "account.html";
}

async function accountUI(u) {
  heading.textContent = "My account";

  const { data: p } =
    await supabase
      .from("profiles")
      .select("*")
      .eq("id", u.id)
      .maybeSingle();

  root.innerHTML = `
    <div class="notice">
      <b>${esc(p?.full_name || u.email)}</b>
      <br>
      ${esc(u.email)}
      <br>
      ${esc(p?.phone || "")}
    </div>

    <div class="actions">
      <a class="btn" href="dashboard.html">
        My dashboard
      </a>

      <a class="btn secondary" href="sell.html">
        Sell a product
      </a>

      <button
        class="btn danger"
        id="out"
        type="button"
      >
        Sign out
      </button>
    </div>

    <div
      class="panel"
      style="margin-top:25px;"
    >
      <small>ACCOUNT SETTINGS</small>

      <h3 style="margin-top:8px;">
        Delete account
      </h3>

      <p class="muted">
        Permanently delete your AjeMarket account,
        profile and saved products.
      </p>

      <button
        class="btn danger"
        id="deleteAccount"
        type="button"
      >
        Delete my account
      </button>
    </div>

    <div
      id="favoritesSection"
      style="margin-top:35px"
    ></div>
  `;

  document.querySelector("#out").onclick =
    async () => {
      await supabase.auth.signOut();
      location.reload();
    };

  document.querySelector("#deleteAccount").onclick =
    deleteMyAccount;

  await loadFavorites(u);
}

async function init() {
  const hash =
    window.location.hash;

  const search =
    window.location.search;

  const recoveryDetected =
    hash.includes("type=recovery") ||
    search.includes("type=recovery");

  if (recoveryDetected) {
    await new Promise(resolve =>
      setTimeout(resolve, 500)
    );

    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (session) {
      passwordResetUI();
      return;
    }

    root.innerHTML = `
      <div class="empty">
        <h3>Reset link expired</h3>

        <p class="muted">
          Please request another password reset email.
        </p>

        <button
          class="btn"
          id="backToLogin"
          type="button"
        >
          Back to sign in
        </button>
      </div>
    `;

    document.querySelector("#backToLogin").onclick =
      () => {
        history.replaceState(
          {},
          document.title,
          "account.html"
        );

        location.reload();
      };

    return;
  }

  const u = await user();

  if (!u) {
    heading.textContent = "Join AjeMarket";
    loginUI();
    return;
  }

  await accountUI(u);
}

init();
