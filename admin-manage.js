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
  const amount = Number(value || 0);

  return "₦" + amount.toLocaleString("en-NG");
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
  if (!errorBox) return;

  errorBox.textContent = message;
  errorBox.style.display = "block";
}


function hideError() {
  if (!errorBox) return;

  errorBox.textContent = "";
  errorBox.style.display = "none";
}


/* =========================================================
   ADMIN SESSION
========================================================= */

async function requireAdmin() {

  const {
    data,
    error
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  const user = data?.session?.user;

  if (!user) {
    window.location.href = "account.html";
    return false;
  }

  return true;
}


/* =========================================================
   LOAD ADMIN DATA
========================================================= */

async function loadData() {

  hideError();

  if (status) {
    status.textContent =
      "Loading management data...";
  }

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

    if (status) {
      status.textContent =
        "Unable to load data.";
    }

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


  if (status) {
    status.textContent =
      `Admin system online • Updated ${new Date().toLocaleString("en-NG")}`;
  }
}


/* =========================================================
   USER SEARCH
========================================================= */

function getSearchQuery() {

  return search?.value
    ?.trim()
    .toLowerCase() || "";
}


/* =========================================================
   RENDER USERS
========================================================= */

function renderUsers() {

  if (!usersTable) return;

  const query =
    getSearchQuery();


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

        ||

        String(user.full_name || "")
          .toLowerCase()
          .includes(query)

      );

    });


  if (userCount) {

    userCount.textContent =
      `${filtered.length} user${filtered.length === 1 ? "" : "s"}`;

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

        <td data-label="User">

          <strong>
            ${escapeHtml(
              user.email ||
              user.full_name ||
              "No email"
            )}
          </strong>

          ${
            user.full_name
              ? `
                <div class="muted">
                  ${escapeHtml(
                    user.full_name
                  )}
                </div>
              `
              : ""
          }

        </td>


        <td data-label="User ID">

          <span class="muted admin-id">
            ${escapeHtml(
              user.id || ""
            )}
          </span>

        </td>


        <td data-label="Listings">

          <strong>
            ${Number(
              user.listings || 0
            )}
          </strong>

        </td>


        <td data-label="Registered">

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
   RENDER LISTINGS
========================================================= */

function renderListings() {

  if (!listingsTable) return;


  const query =
    getSearchQuery();


  const selectedFilter =
    filter?.value || "all";


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


  if (listingCount) {

    listingCount.textContent =
      `${filtered.length} listing${filtered.length === 1 ? "" : "s"}`;

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


      const statusClass =
        product.status === "active"
          ? "active"
          : "";


      return `

        <tr>

          <td data-label="Product">

            <strong>
              ${escapeHtml(
                product.title ||
                product.name ||
                "Untitled"
              )}
            </strong>

            <div class="muted admin-id">
              ID:
              ${escapeHtml(
                product.id || ""
              )}
            </div>

          </td>


          <td data-label="Price">

            <strong>
              ${money(
                product.price
              )}
            </strong>

          </td>


          <td data-label="Seller">

            <strong>
              ${escapeHtml(
                product.seller_email ||
                "Unknown seller"
              )}
            </strong>

            <div class="muted admin-id">
              ${escapeHtml(
                product.seller_id || ""
              )}
            </div>

          </td>


          <td data-label="Status">

            <span class="badge ${statusClass}">

              ${escapeHtml(
                product.status ||
                "unknown"
              )}

            </span>

          </td>


          <td data-label="Promotion">

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

      refreshBtn.disabled = true;

      refreshBtn.textContent =
        "Loading...";


      try {

        await loadData();

      } catch (error) {

        console.error(
          "Refresh error:",
          error
        );

        showError(
          error.message ||
          "Unable to refresh admin data."
        );

      } finally {

        refreshBtn.disabled = false;

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

      logoutBtn.disabled = true;

      logoutBtn.textContent =
        "Logging out...";


      const {
        error
      } = await supabase.auth.signOut();


      if (error) {

        console.error(
          "Admin logout error:",
          error
        );

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

}


/* =========================================================
   INITIAL LOAD
========================================================= */

loadData();
