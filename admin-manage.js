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
let listings = [];


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
   AUTH
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
   LOAD DATA
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

  const {
    data,
    error
  } = await supabase.rpc(
    "admin_users_list"
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

  users =
    Array.isArray(data?.users)
      ? data.users
      : [];

  listings =
    Array.isArray(data?.listings)
      ? data.listings
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

  const query =
    search.value
      .trim()
      .toLowerCase();

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

  userCount.textContent =
    `${filtered.length} user${filtered.length === 1 ? "" : "s"}`;

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
              user.email || "No email"
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
            ${Number(
              user.listings || 0
            )}
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

  const query =
    search.value
      .trim()
      .toLowerCase();

  const selectedFilter =
    filter.value;

  const filtered =
    listings.filter(product => {

      const promotion =
        product.promotion_type &&
        product.promotion_type !== "ordinary"
          ? product.promotion_type
          : "ordinary";

      if (
        selectedFilter !== "all" &&
        promotion !== selectedFilter
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (

        String(product.title || "")
          .toLowerCase()
          .includes(query)

        ||

        String(product.name || "")
          .toLowerCase()
          .includes(query)

        ||

        String(product.seller_email || "")
          .toLowerCase()
          .includes(query)

        ||

        String(product.seller_id || "")
          .toLowerCase()
          .includes(query)

        ||

        String(product.location || "")
          .toLowerCase()
          .includes(query)

      );

    });

  listingCount.textContent =
    `${filtered.length} listing${filtered.length === 1 ? "" : "s"}`;

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
        product.promotion_type !== "ordinary"
          ? product.promotion_type
          : "ordinary";

      let promotionClass = "";

      if (promotion === "boost") {
        promotionClass = "boost";
      }

      if (promotion === "premium") {
        promotionClass = "premium";
      }


      const isActive =
        product.status === "active";


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
              ${money(product.price)}
            </strong>
          </td>


          <td>

            ${escapeHtml(
              product.seller_email ||
              "Unknown seller"
            )}

            <div class="muted">
              ${escapeHtml(
                product.seller_id || ""
              )}
            </div>

          </td>


          <td>

            <span class="badge ${
              isActive
                ? "active"
                : ""
            }">

              ${escapeHtml(
                product.status ||
                "unknown"
              )}

            </span>


            <div style="
              margin-top:10px;
              display:flex;
              gap:8px;
              flex-wrap:wrap;
            ">

              ${
                isActive
                  ? `
                    <button
                      type="button"
                      class="admin-action-btn danger"
                      data-action="deactivate"
                      data-id="${escapeHtml(
                        product.id
                      )}"
                      style="
                        padding:8px 12px;
                        border:0;
                        border-radius:8px;
                        cursor:pointer;
                        background:#8f2637;
                        color:#fff;
                        font-weight:700;
                      "
                    >
                      Deactivate
                    </button>
                  `
                  : `
                    <button
                      type="button"
                      class="admin-action-btn success"
                      data-action="activate"
                      data-id="${escapeHtml(
                        product.id
                      )}"
                      style="
                        padding:8px 12px;
                        border:0;
                        border-radius:8px;
                        cursor:pointer;
                        background:#16a085;
                        color:#fff;
                        font-weight:700;
                      "
                    >
                      Activate
                    </button>
                  `
              }

            </div>

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
   LISTING MODERATION
========================================================= */

listingsTable.addEventListener(
  "click",
  async (event) => {

    const button =
      event.target.closest(
        "[data-action][data-id]"
      );

    if (!button) {
      return;
    }

    const productId =
      button.dataset.id;

    const action =
      button.dataset.action;

    const newStatus =
      action === "activate"
        ? "active"
        : "inactive";


    const confirmed =
      confirm(
        newStatus === "active"
          ? "Activate this listing?"
          : "Deactivate this listing?"
      );


    if (!confirmed) {
      return;
    }


    button.disabled = true;

    button.textContent =
      "Saving...";


    try {

      const {
        data,
        error
      } = await supabase.rpc(
        "admin_set_listing_status",
        {
          p_product_id:
            productId,

          p_status:
            newStatus
        }
      );


      if (error) {
        throw error;
      }


      if (
        !data ||
        data.success !== true
      ) {
        throw new Error(
          "The listing status could not be confirmed."
        );
      }


      const listing =
        listings.find(
          item =>
            item.id === productId
        );


      if (listing) {
        listing.status =
          newStatus;
      }


      renderListings();


      status.textContent =
        newStatus === "active"
          ? "Listing activated successfully."
          : "Listing deactivated successfully.";


    } catch (error) {

      console.error(
        "Listing moderation error:",
        error
      );


      showError(
        error.message ||
        "Unable to change listing status."
      );


      button.disabled = false;

      button.textContent =
        newStatus === "active"
          ? "Activate"
          : "Deactivate";
    }

  }
);


/* =========================================================
   SEARCH / FILTER
========================================================= */

search.addEventListener(
  "input",
  () => {

    renderUsers();

    renderListings();

  }
);


filter.addEventListener(
  "change",
  () => {

    renderListings();

  }
);


/* =========================================================
   REFRESH
========================================================= */

refreshBtn.addEventListener(
  "click",
  async () => {

    refreshBtn.disabled = true;

    refreshBtn.textContent =
      "Loading...";


    try {

      await loadData();

    } finally {

      refreshBtn.disabled = false;

      refreshBtn.textContent =
        "Refresh";

    }

  }
);


/* =========================================================
   LOGOUT
========================================================= */

logoutBtn.addEventListener(
  "click",
  async () => {

    logoutBtn.disabled = true;

    logoutBtn.textContent =
      "Logging out...";


    const {
      error
    } = await supabase.auth.signOut();


    if (error) {

      alert(
        error.message ||
        "Could not log out."
      );


      logoutBtn.disabled = false;

      logoutBtn.textContent =
        "Logout";

      return;
    }


    window.location.href =
      "account.html";

  }
);


/* =========================================================
   START
========================================================= */

loadData();
