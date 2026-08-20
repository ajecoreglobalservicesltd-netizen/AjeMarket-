import { supabase } from "./supabase.js";

const usersTable = document.querySelector("#usersTable");
const listingsTable = document.querySelector("#listingsTable");

const userCount = document.querySelector("#userCount");
const listingCount = document.querySelector("#listingCount");

const search = document.querySelector("#search");
const filter = document.querySelector("#filter");

const status = document.querySelector("#status");
const errorBox = document.querySelector("#errorBox");

const refreshBtn = document.querySelector("#refreshBtn");
const logoutBtn = document.querySelector("#logoutBtn");

let users = [];
let profiles = [];
let sellers = [];
let listings = [];
let payments = [];


/* =========================================================
   HELPERS
========================================================= */

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function money(value) {
  return "₦" + Number(value || 0).toLocaleString("en-NG");
}


function dateTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}


function showError(message) {
  errorBox.textContent = message;
  errorBox.style.display = "block";
}


function hideError() {
  errorBox.textContent = "";
  errorBox.style.display = "none";
}


/* =========================================================
   AUTHENTICATION
========================================================= */

async function requireAdmin() {

  const {
    data,
    error
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  if (!data?.session?.user) {
    window.location.href = "account.html";
    return false;
  }

  return true;
}


/* =========================================================
   LOAD ADMIN MANAGEMENT DATA
========================================================= */

async function loadData() {

  hideError();

  status.textContent =
    "Loading management data...";

  const allowed =
    await requireAdmin();

  if (!allowed) {
    return;
  }


  /*
   * IMPORTANT:
   *
   * This is the new secure RPC we created.
   *
   * It replaces the old:
   *
   * admin_users_list
   */

  const {
    data,
    error
  } = await supabase.rpc(
    "admin_management_data"
  );


  if (error) {

    console.error(
      "Admin management error:",
      error
    );

    showError(
      error.message ||
      "Unable to load management data."
    );

    status.textContent =
      "Unable to load data.";

    return;
  }


  if (!data) {

    showError(
      "The management system returned no data."
    );

    status.textContent =
      "No management data returned.";

    return;
  }


  users =
    Array.isArray(data.users)
      ? data.users
      : [];


  profiles =
    Array.isArray(data.profiles)
      ? data.profiles
      : [];


  sellers =
    Array.isArray(data.sellers)
      ? data.sellers
      : [];


  listings =
    Array.isArray(data.products)
      ? data.products
      : [];


  payments =
    Array.isArray(data.payments)
      ? data.payments
      : [];


  renderUsers();

  renderListings();


  status.textContent =
    `Admin system online • Updated ${new Date().toLocaleString("en-NG")}`;
}


/* =========================================================
   USERS
========================================================= */

function renderUsers() {

  if (!usersTable) {
    return;
  }


  const query =
    search?.value
      ?.trim()
      .toLowerCase() || "";


  const filtered =
    users.filter(user => {

      if (!query) {
        return true;
      }


      return (

        String(user.email || "")
          .toLowerCase()
          .includes(query)

        ||

        String(user.id || "")
          .toLowerCase()
          .includes(query)

      );

    });


  if (userCount) {

    userCount.textContent =
      `${filtered.length} user${
        filtered.length === 1
          ? ""
          : "s"
      }`;

  }


  if (!filtered.length) {

    usersTable.innerHTML = `
      <tr>
        <td colspan="4">
          <div class="empty">
            No users found.
          </div>
        </td>
      </tr>
    `;

    return;
  }


  usersTable.innerHTML =
    filtered.map(user => `

      <tr>

        <td>

          <strong>
            ${escapeHtml(
              user.email ||
              "No email"
            )}
          </strong>

        </td>


        <td>

          <span class="muted">
            ${escapeHtml(
              user.id || ""
            )}
          </span>

        </td>


        <td>

          <strong>
            ${
              listings.filter(
                product =>
                  String(
                    product.seller_id
                  ) ===
                  String(user.id)
              ).length
            }
          </strong>

        </td>


        <td>

          ${escapeHtml(
            dateTime(
              user.created_at
            )
          )}

        </td>

      </tr>

    `).join("");
}


/* =========================================================
   LISTINGS
========================================================= */

function renderListings() {

  if (!listingsTable) {
    return;
  }


  const query =
    search?.value
      ?.trim()
      .toLowerCase() || "";


  const selectedFilter =
    filter?.value || "all";


  const filtered =
    listings.filter(product => {

      const promotion =
        product.promotion_type &&
        product.promotion_type !==
          "ordinary"

          ? product.promotion_type
          : "ordinary";


      if (
        selectedFilter !==
          "all" &&

        promotion !==
          selectedFilter
      ) {

        return false;

      }


      if (!query) {
        return true;
      }


      return (

        String(
          product.title || ""
        )
          .toLowerCase()
          .includes(query)

        ||

        String(
          product.name || ""
        )
          .toLowerCase()
          .includes(query)

        ||

        String(
          product.seller_id || ""
        )
          .toLowerCase()
          .includes(query)

        ||

        String(
          product.location || ""
        )
          .toLowerCase()
          .includes(query)

        ||

        String(
          product.category || ""
        )
          .toLowerCase()
          .includes(query)

      );

    });


  if (listingCount) {

    listingCount.textContent =
      `${filtered.length} listing${
        filtered.length === 1
          ? ""
          : "s"
      }`;

  }


  if (!filtered.length) {

    listingsTable.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty">
            No listings found.
          </div>
        </td>
      </tr>
    `;

    return;
  }


  listingsTable.innerHTML =
    filtered.map(product => {

      const promotion =
        product.promotion_type &&
        product.promotion_type !==
          "ordinary"

          ? product.promotion_type
          : "ordinary";


      let promotionClass = "";


      if (
        promotion ===
        "boost"
      ) {

        promotionClass =
          "boost";

      }


      if (
        promotion ===
        "premium"
      ) {

        promotionClass =
          "premium";

      }


      const statusClass =
        product.status ===
        "active"

          ? "active"

          : "";


      return `

        <tr>

          <td>

            <strong>
              ${escapeHtml(
                product.title ||
                product.name ||
                "Untitled"
              )}
            </strong>

            <div class="muted">
              ID:
              ${escapeHtml(
                product.id || ""
              )}
            </div>

          </td>


          <td>

            <strong>
              ${money(
                product.price
              )}
            </strong>

          </td>


          <td>

            ${escapeHtml(
              product.seller_id ||
              "Unknown seller"
            )}

          </td>


          <td>

            <span class="badge ${statusClass}">
              ${escapeHtml(
                product.status ||
                "unknown"
              )}
            </span>

          </td>


          <td>

            <span class="badge ${promotionClass}">

              ${escapeHtml(
                promotion
              )}

            </span>


            ${
              product.promotion_expires_at
                ? `
                  <div class="muted">
                    Expires:
                    ${escapeHtml(
                      dateTime(
                        product.promotion_expires_at
                      )
                    )}
                  </div>
                `
                : ""
            }

          </td>


          <td>

            ${escapeHtml(
              product.location ||
              "—"
            )}

          </td>


          <td>

            ${escapeHtml(
              dateTime(
                product.created_at
              )
            )}

          </td>

        </tr>

      `;

    }).join("");
}


/* =========================================================
   SEARCH
========================================================= */

if (search) {

  search.addEventListener(
    "input",
    () => {

      renderUsers();

      renderListings();

    }
  );

}


/* =========================================================
   FILTER
========================================================= */

if (filter) {

  filter.addEventListener(
    "change",
    () => {

      renderListings();

    }
  );

}


/* =========================================================
   REFRESH
========================================================= */

if (refreshBtn) {

  refreshBtn.addEventListener(
    "click",
    async () => {

      refreshBtn.disabled =
        true;

      refreshBtn.textContent =
        "Loading...";


      try {

        await loadData();

      } finally {

        refreshBtn.disabled =
          false;

        refreshBtn.textContent =
          "Refresh";

      }

    }
  );

}


/* =========================================================
   LOGOUT
========================================================= */

if (logoutBtn) {

  logoutBtn.addEventListener(
    "click",
    async () => {

      logoutBtn.disabled =
        true;

      logoutBtn.textContent =
        "Logging out...";


      const {
        error
      } =
        await supabase.auth.signOut();


      if (error) {

        alert(
          error.message ||
          "Could not log out."
        );


        logoutBtn.disabled =
          false;

        logoutBtn.textContent =
          "Logout";

        return;

      }


      window.location.href =
        "account.html";

    }
  );

}


/* =========================================================
   START
========================================================= */

loadData();
