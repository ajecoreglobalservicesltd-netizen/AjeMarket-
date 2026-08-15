import { supabase, esc, money, user } from "./supabase.js";

const root = document.querySelector("#account");
const heading = document.querySelector("#heading");

const savedSection = document.querySelector("#savedSection");
const savedProducts = document.querySelector("#savedProducts");


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

        msg.textContent = "Signed in. Redirecting…";

        location.href = "dashboard.html";
      }

      return;
    }


    const { data, error } =
      await supabase.auth.signUp({

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

      msg.textContent =
        "Account created. Welcome to AjeMarket!";

      setTimeout(() => {

        location.href = "dashboard.html";

      }, 500);

      return;
    }


    msg.textContent =
      "Account created. Signing you in…";


    const {
      data: loginData,
      error: loginError
    } =
      await supabase.auth.signInWithPassword({

        email,
        password

      });


    if (loginError) {

      msg.textContent =
        loginError.message;

      return;
    }


    if (loginData?.session) {

      location.href = "dashboard.html";

    }

  };

}


/* =========================
   SAVED PRODUCTS
========================= */

async function loadSavedProducts(u) {

  savedSection.style.display = "block";

  savedProducts.innerHTML =
    `<p class="muted">Loading saved products…</p>`;


  /* Get this user's favourites */

  const {
    data: favorites,
    error: favoriteError
  } = await supabase
    .from("favorites")
    .select("id, product_id, created_at")
    .eq("user_id", u.id)
    .order("created_at", {
      ascending: false
    });


  if (favoriteError) {

    savedProducts.innerHTML = `
      <div class="empty">
        ${esc(favoriteError.message)}
      </div>
    `;

    return;
  }


  if (!favorites || favorites.length === 0) {

    savedProducts.innerHTML = `
      <div class="empty">
        You haven't saved any products yet.
        <br><br>
        Browse AjeMarket and tap
        <b>♡ Save</b> on products you like.
      </div>
    `;

    return;
  }


  const productIds =
    favorites.map(item => item.product_id);


  /* Get the actual products separately */

  const {
    data: products,
    error: productError
  } = await supabase
    .from("products")
    .select(
      "id,title,name,price,location,image_url,status"
    )
    .in("id", productIds);


  if (productError) {

    savedProducts.innerHTML = `
      <div class="empty">
        ${esc(productError.message)}
      </div>
    `;

    return;
  }


  const productMap = new Map(
    (products || []).map(product => [
      product.id,
      product
    ])
  );


  const cards = favorites
    .map(favorite => {

      const product =
        productMap.get(favorite.product_id);


      if (!product) return "";


      const title =
        product.title ||
        product.name ||
        "Untitled product";


      const image =
        product.image_url
          ? `
            <img
              src="${esc(product.image_url)}"
              alt="${esc(title)}"
              style="
                width:100%;
                height:180px;
                object-fit:contain;
                background:#eef2f3;
                border-radius:12px;
              "
            >
          `
          : `
            <div class="noimg">
              AjeMarket
            </div>
          `;


      return `
        <div
          class="card"
          style="margin-bottom:15px;"
        >

          ${image}

          <div class="cardbody">

            <h3>
              ${esc(title)}
            </h3>

            <div class="price">
              ${money(product.price)}
            </div>

            <p class="muted">
              📍 ${esc(product.location || "")}
            </p>

            <div class="actions">

              <a
                class="btn small"
                href="product.html?id=${encodeURIComponent(product.id)}"
              >
                View product
              </a>

              <button
                class="btn danger small remove-favorite"
                data-id="${esc(favorite.id)}"
              >
                Remove
              </button>

            </div>

          </div>

        </div>
      `;

    })
    .filter(Boolean);


  if (cards.length === 0) {

    savedProducts.innerHTML = `
      <div class="empty">
        Your saved products are no longer available.
      </div>
    `;

    return;
  }


  savedProducts.innerHTML = cards.join("");


  /* Remove saved product */

  document
    .querySelectorAll(".remove-favorite")
    .forEach(button => {

      button.onclick = async () => {

        const favoriteId =
          button.dataset.id;

        button.disabled = true;
        button.textContent = "Removing…";


        const { error } =
          await supabase
            .from("favorites")
            .delete()
            .eq("id", favoriteId)
            .eq("user_id", u.id);


        if (error) {

          alert(error.message);

          button.disabled = false;
          button.textContent = "Remove";

          return;
        }


        await loadSavedProducts(u);

      };

    });

}


/* =========================
   ACCOUNT INITIALIZATION
========================= */

async function init() {

  const u = await user();


  if (!u) {

    loginUI();

    return;
  }


  heading.textContent =
    "My account";


  const { data: p } =
    await supabase
      .from("profiles")
      .select("*")
      .eq("id", u.id)
      .maybeSingle();


  root.innerHTML = `

    <div class="notice">

      <b>
        ${esc(p?.full_name || u.email)}
      </b>

      <br>

      ${esc(u.email)}

      <br>

      ${esc(p?.phone || "")}

    </div>


    <div class="actions">

      <a
        class="btn"
        href="dashboard.html"
      >
        My dashboard
      </a>

      <a
        class="btn secondary"
        href="sell.html"
      >
        Sell a product
      </a>

      <button
        class="btn danger"
        id="out"
      >
        Sign out
      </button>

    </div>

  `;


  document.querySelector("#out").onclick =
    async () => {

      await supabase.auth.signOut();

      location.reload();

    };


  /* Load saved products */

  await loadSavedProducts(u);

}


init();
