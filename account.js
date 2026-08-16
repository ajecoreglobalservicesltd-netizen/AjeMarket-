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

  if (Array.isArray(product.images) && product.images.length) {
    return product.images[0];
  }

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

    if (data?.session) {
      msg.textContent = "Account created. Welcome to AjeMarket!";

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
      msg.textContent = loginError.message;
      return;
    }

    if (loginData?.session) {
      location.href = "dashboard.html";
    }
  };
}

async function loadFavorites(u) {
  const section = document.querySelector("#favoritesSection");

  if (!section) return;

  section.innerHTML = `
    <div class="section-title">
      <div>
        <small>SAVED PRODUCTS</small>
        <h2>My Favourites</h2>
      </div>
    </div>

    <div id="favoritesList" class="grid">
      <div class="empty">Loading your favourites…</div>
    </div>
  `;

  const list = document.querySelector("#favoritesList");

  const { data: favorites, error: favoriteError } = await supabase
    .from("favorites")
    .select("product_id, created_at")
    .eq("user_id", u.id)
    .order("created_at", { ascending: false });

  if (favoriteError) {
    list.innerHTML = `
      <div class="empty">
        Could not load your favourites.<br><br>
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
          Tap <b>Save</b> on a product you like and it will appear here.
        </p>
        <a class="btn" href="index.html">Explore products</a>
      </div>
    `;
    return;
  }

  const ids = favorites.map(item => item.product_id);

  const { data: products, error: productError } = await supabase
    .from("products")
    .select("*")
    .in("id", ids);

  if (productError) {
    list.innerHTML = `
      <div class="empty">
        Could not load your saved products.<br><br>
        ${esc(productError.message)}
      </div>
    `;
    return;
  }

  const productMap = new Map(
    (products || []).map(product => [product.id, product])
  );

  list.innerHTML = favorites.map(favorite => {
    const product = productMap.get(favorite.product_id);

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

    const image = getProductImage(product);

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
              ? `<div class="muted">📍 ${esc(location)}</div>`
              : ""
          }

          <div class="actions" style="margin-top:14px">
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

  document.querySelectorAll(".remove-favorite").forEach(button => {
    button.onclick = async () => {
      const productId = button.dataset.id;

      button.disabled = true;
      button.textContent = "Removing…";

      const { error } = await supabase
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

async function init() {
  const u = await user();

  if (!u) {
    heading.textContent = "Join AjeMarket";
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

    <div id="favoritesSection" style="margin-top:35px"></div>
  `;

  document.querySelector("#out").onclick = async () => {
    await supabase.auth.signOut();
    location.reload();
  };

  await loadFavorites(u);
}

init();
