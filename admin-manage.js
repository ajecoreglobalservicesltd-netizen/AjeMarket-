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


function getPromotion(product) {
  return product.promotion_type &&
    product.promotion_type !== "ordinary"
    ? product.promotion_type
    : "ordinary";
}


function promotionClass(promotion) {
  if (promotion === "boost") return "boost";
  if (promotion === "premium") return "premium";
  return "";
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

        <td data-label="Email">
          <strong>
            ${escapeHtml(
              user.email || "No email"
            )}
          </strong>
        </td>

        <td data-label="User ID">
          <span class="muted">
            ${escapeHtml(user.id || "")}
          </span>
        </td>

        <td data-label="Listings">
          <strong>
            ${Number(user.listings || 0)}
          </strong>
        </td>

        <td data-label="Joined">
          ${escapeHtml(
            dateTime(user.created_at)
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
        getPromotion(product);

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
        <td colspan="8">
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
        getPromotion(product);

      const promotionCss =
        promotionClass(promotion);

      const title =
        product.title ||
        product.name ||
        "Untitled";

      const currentStatus =
        product.status ||
        "unknown";

      const isActive =
        currentStatus === "active";

      return `

        <tr class="listing-row">

          <td data-label="Product">

            <strong class="listing-title">
              ${escapeHtml(title)}
            </strong>

            <div class="muted listing-id">
              ID:
              ${escapeHtml(product.id || "")}
            </div>

          </td>


          <td data-label="Price">

            <strong class="listing-price">
              ${money(product.price)}
            </strong>

          </td>


          <td data-label="Seller">

            <div class="seller-email">
              ${escapeHtml(
                product.seller_email ||
                "Unknown seller"
              )}
            </div>

            <div class="muted seller-id">
              ${escapeHtml(
                product.seller_id || ""
              )}
            </div>

          </td>


          <td data-label="Status">

            <span class="badge ${
              isActive ? "active" : ""
            }">

              ${escapeHtml(
                currentStatus
              )}

            </span>

            <div class="admin-action">

              <button
                type="button"
                class="listing-status-btn ${
                  isActive
                    ? "deactivate-btn"
                    : "activate-btn"
                }"
                data-product-id="${escapeHtml(
                  product.id || ""
                )}"
                data-current-status="${escapeHtml(
                  currentStatus
                )}"
              >
                ${
                  isActive
                    ? "Deactivate"
                    : "Activate"
                }
              </button>

            </div>

          </td>


          <td data-label="Promotion">

            <span class="badge ${promotionCss}">

              ${escapeHtml(
                promotion
              )}

            </span>

            ${
              product.promotion_expires_at
                ? `
                  <div class="muted promotion-expiry">
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


          <td data-label="Location">

            ${escapeHtml(
              product.location ||
              "—"
            )}

          </td>


          <td data-label="Created">

            ${escapeHtml(
              dateTime(
                product.created_at
              )
            )}

          </td>


          <td data-label="Actions">

            <button
              type="button"
              class="listing-status-btn ${
                isActive
                  ? "deactivate-btn"
                  : "activate-btn"
              }"
              data-product-id="${escapeHtml(
                product.id || ""
              )}"
              data-current-status="${escapeHtml(
                currentStatus
              )}"
            >
              ${
                isActive
                  ? "Deactivate"
                  : "Activate"
              }
            </button>

          </td>

        </tr>

      `;

    }).join("");

  attachListingActions();
}


/* =========================================================
   ACTIVATE / DEACTIVATE LISTING
========================================================= */

function attachListingActions() {

  const buttons =
    document.querySelectorAll(
      ".listing-status-btn"
    );

  buttons.forEach(button => {

    button.addEventListener(
      "click",
      async () => {

        const productId =
          button.dataset.productId;

        const currentStatus =
          button.dataset.currentStatus;

        if (!productId) {
          return;
        }

        const isActive =
          currentStatus === "active";

        const newStatus =
          isActive
            ? "inactive"
            : "active";

        const confirmation =
          isActive
            ? "Deactivate this listing?"
            : "Activate this listing?";

        if (!confirm(confirmation)) {
          return;
        }

        button.disabled = true;

        button.textContent =
          isActive
            ? "Deactivating..."
            : "Activating...";

        const {
          error
        } = await supabase
          .from("products")
          .update({
            status: newStatus
          })
          .eq("id", productId);

        if (error) {

          console.error(
            "Listing status error:",
            error
          );

          alert(
            error.message ||
            "Could not update listing."
          );

          button.disabled = false;

          button.textContent =
            isActive
              ? "Deactivate"
              : "Activate";

          return;
        }

        const listing =
          listings.find(
            item =>
              String(item.id) ===
              String(productId)
          );

        if (listing) {
          listing.status =
            newStatus;
        }

        renderListings();

        status.textContent =
          `Listing ${
            isActive
              ? "deactivated"
              : "activated"
          } successfully.`;

      }
    );

  });
}


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

    } catch (error) {

      console.error(error);

      showError(
        error.message ||
        "Unable to refresh."
      );

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
