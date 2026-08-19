import { supabase } from "./supabase.js";

const dashboardContent =
  document.querySelector("#dashboardContent");

const errorBox =
  document.querySelector("#errorBox");

const lastUpdated =
  document.querySelector("#lastUpdated");

const refreshBtn =
  document.querySelector("#refreshBtn");

const logoutBtn =
  document.querySelector("#logoutBtn");


// =========================================================
// HELPERS
// =========================================================

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function money(value) {
  const number = Number(value || 0);

  return "₦" + number.toLocaleString("en-NG");
}


function number(value) {
  return Number(value || 0).toLocaleString("en-NG");
}


function dateTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
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


// =========================================================
// AUTHENTICATION
// =========================================================

async function getCurrentSession() {
  const {
    data,
    error
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data?.session || null;
}


async function requireAdminSession() {
  const session = await getCurrentSession();

  if (!session?.user) {
    window.location.href = "account.html";
    return null;
  }

  return session;
}


// =========================================================
// LOAD ADMIN DATA
// =========================================================

async function loadAdminData() {

  hideError();

  dashboardContent.innerHTML = `
    <div class="loading">
      Loading AjeMarket statistics...
    </div>
  `;

  const session =
    await requireAdminSession();

  if (!session) {
    return;
  }


  const {
    data,
    error
  } = await supabase.rpc(
    "admin_dashboard_overview"
  );


  if (error) {

    console.error(
      "Admin dashboard error:",
      error
    );

    dashboardContent.innerHTML = "";

    showError(
      error.message ||
      "Unable to load the administrator dashboard."
    );

    return;
  }


  if (!data) {

    dashboardContent.innerHTML = "";

    showError(
      "The administrator dashboard returned no data."
    );

    return;
  }


  renderDashboard(data);
}


// =========================================================
// RENDER DASHBOARD
// =========================================================

function renderDashboard(data) {

  const users =
    data.users || {};

  const marketplace =
    data.marketplace || {};

  const payments =
    data.payments || {};

  const messaging =
    data.messaging || {};

  const recentUsers =
    Array.isArray(data.recent_users)
      ? data.recent_users
      : [];

  const recentProducts =
    Array.isArray(data.recent_products)
      ? data.recent_products
      : [];

  const recentPayments =
    Array.isArray(data.recent_payments)
      ? data.recent_payments
      : [];


  dashboardContent.innerHTML = `

    <!-- =================================================
         MAIN STATISTICS
         ================================================= -->

    <section class="cards">

      <article class="stat">
        <div class="stat-icon">👥</div>
        <div class="stat-label">Total Users</div>
        <div class="stat-value blue">
          ${number(users.total)}
        </div>
        <div class="stat-note">
          Registered AjeMarket accounts
        </div>
      </article>


      <article class="stat">
        <div class="stat-icon">🏪</div>
        <div class="stat-label">Sellers</div>
        <div class="stat-value green">
          ${number(marketplace.total_sellers)}
        </div>
        <div class="stat-note">
          Users with listings
        </div>
      </article>


      <article class="stat">
        <div class="stat-icon">📦</div>
        <div class="stat-label">Total Listings</div>
        <div class="stat-value purple">
          ${number(marketplace.total_products)}
        </div>
        <div class="stat-note">
          Products in the marketplace
        </div>
      </article>


      <article class="stat">
        <div class="stat-icon">🟢</div>
        <div class="stat-label">Active Listings</div>
        <div class="stat-value green">
          ${number(marketplace.active_products)}
        </div>
        <div class="stat-note">
          Currently active
        </div>
      </article>


      <article class="stat">
        <div class="stat-icon">🏢</div>
        <div class="stat-label">Business Accounts</div>
        <div class="stat-value blue">
          ${number(users.businesses)}
        </div>
        <div class="stat-note">
          Registered business profiles
        </div>
      </article>


      <article class="stat">
        <div class="stat-icon">🚀</div>
        <div class="stat-label">Boosted</div>
        <div class="stat-value orange">
          ${number(marketplace.boosted_products)}
        </div>
        <div class="stat-note">
          Currently active boosts
        </div>
      </article>


      <article class="stat">
        <div class="stat-icon">👑</div>
        <div class="stat-label">Premium</div>
        <div class="stat-value purple">
          ${number(marketplace.premium_products)}
        </div>
        <div class="stat-note">
          Currently active premium listings
        </div>
      </article>


      <article class="stat">
        <div class="stat-icon">💰</div>
        <div class="stat-label">Platform Revenue</div>
        <div class="stat-value green">
          ${money(payments.successful_revenue)}
        </div>
        <div class="stat-note">
          Successful promotion payments
        </div>
      </article>

    </section>


    <!-- =================================================
         SECONDARY STATISTICS
         ================================================= -->

    <section class="grid-2">

      <article class="panel">

        <div class="panel-head">
          👥 User Growth
        </div>

        <div class="panel-body">

          <div class="mini-grid">

            <div class="mini">
              <div class="mini-label">
                New users — 7 days
              </div>

              <div class="mini-value blue">
                ${number(users.new_7_days)}
              </div>
            </div>


            <div class="mini">
              <div class="mini-label">
                New users — 30 days
              </div>

              <div class="mini-value green">
                ${number(users.new_30_days)}
              </div>
            </div>

          </div>

        </div>

      </article>


      <article class="panel">

        <div class="panel-head">
          💳 Payment Overview
        </div>

        <div class="panel-body">

          <div class="mini-grid">

            <div class="mini">
              <div class="mini-label">
                Successful payments
              </div>

              <div class="mini-value green">
                ${number(payments.successful_count)}
              </div>
            </div>


            <div class="mini">
              <div class="mini-label">
                Pending payments
              </div>

              <div class="mini-value orange">
                ${number(payments.pending_count)}
              </div>
            </div>


            <div class="mini">
              <div class="mini-label">
                Boost revenue
              </div>

              <div class="mini-value">
                ${money(payments.boost_revenue)}
              </div>
            </div>


            <div class="mini">
              <div class="mini-label">
                Premium revenue
              </div>

              <div class="mini-value purple">
                ${money(payments.premium_revenue)}
              </div>
            </div>


            <div class="mini">
              <div class="mini-label">
                Last 30 days
              </div>

              <div class="mini-value green">
                ${money(payments.last_30_days_revenue)}
              </div>
            </div>

          </div>

        </div>

      </article>


      <article class="panel">

        <div class="panel-head">
          💬 Messaging
        </div>

        <div class="panel-body">

          <div class="mini-grid">

            <div class="mini">
              <div class="mini-label">
                Conversations
              </div>

              <div class="mini-value blue">
                ${number(messaging.conversations)}
              </div>
            </div>


            <div class="mini">
              <div class="mini-label">
                Total messages
              </div>

              <div class="mini-value">
                ${number(messaging.messages)}
              </div>
            </div>


            <div class="mini">
              <div class="mini-label">
                Unread messages
              </div>

              <div class="mini-value orange">
                ${number(messaging.unread_messages)}
              </div>
            </div>

          </div>

        </div>

      </article>


      <article class="panel">

        <div class="panel-head">
          📊 Marketplace Activity
        </div>

        <div class="panel-body">

          <div class="mini-grid">

            <div class="mini">
              <div class="mini-label">
                Sellers
              </div>

              <div class="mini-value green">
                ${number(marketplace.total_sellers)}
              </div>
            </div>


            <div class="mini">
              <div class="mini-label">
                Active listings
              </div>

              <div class="mini-value blue">
                ${number(marketplace.active_products)}
              </div>
            </div>


            <div class="mini">
              <div class="mini-label">
                Boosted listings
              </div>

              <div class="mini-value orange">
                ${number(marketplace.boosted_products)}
              </div>
            </div>


            <div class="mini">
              <div class="mini-label">
                Premium listings
              </div>

              <div class="mini-value purple">
                ${number(marketplace.premium_products)}
              </div>
            </div>

          </div>

        </div>

      </article>

    </section>


    <!-- =================================================
         RECENT USERS
         ================================================= -->

    <section class="section">

      <div class="section-head">
        <h2>Recent Users</h2>
        <span>Latest registered accounts</span>
      </div>

      <div class="panel">

        <div class="activity">

          ${
            recentUsers.length
              ? recentUsers.map(user => `
                  <div class="activity-row">

                    <div>

                      <div class="activity-title">
                        ${escapeHtml(user.email || "No email")}
                      </div>

                      <div class="activity-meta">
                        User ID:
                        ${escapeHtml(user.id || "")}
                        <br>
                        Registered:
                        ${dateTime(user.created_at)}
                      </div>

                    </div>

                    <span class="badge">
                      User
                    </span>

                  </div>
                `).join("")
              : `
                <div class="empty">
                  No registered users found.
                </div>
              `
          }

        </div>

      </div>

    </section>


    <!-- =================================================
         RECENT LISTINGS
         ================================================= -->

    <section class="section">

      <div class="section-head">
        <h2>Recent Listings</h2>
        <span>Latest products posted</span>
      </div>

      <div class="panel">

        <div class="activity">

          ${
            recentProducts.length
              ? recentProducts.map(product => {

                  const promotion =
                    product.promotion_type &&
                    product.promotion_type !== "ordinary"
                      ? product.promotion_type
                      : "ordinary";

                  const badgeClass =
                    product.status === "active"
                      ? "active"
                      : "";

                  return `
                    <div class="activity-row">

                      <div>

                        <div class="activity-title">
                          ${escapeHtml(
                            product.title ||
                            product.name ||
                            "Untitled listing"
                          )}
                        </div>

                        <div class="activity-meta">
                          Price:
                          ${money(product.price)}
                          <br>
                          Seller:
                          ${escapeHtml(product.seller_id || "")}
                          <br>
                          Created:
                          ${dateTime(product.created_at)}
                        </div>

                      </div>

                      <div>

                        <span class="badge ${badgeClass}">
                          ${escapeHtml(
                            product.status || "unknown"
                          )}
                        </span>

                        <br>

                        <span class="badge">
                          ${escapeHtml(promotion)}
                        </span>

                      </div>

                    </div>
                  `;
                }).join("")
              : `
                <div class="empty">
                  No listings found.
                </div>
              `
          }

        </div>

      </div>

    </section>


    <!-- =================================================
         RECENT PAYMENTS
         ================================================= -->

    <section class="section">

      <div class="section-head">
        <h2>Recent Payments</h2>
        <span>Paystack promotion transactions</span>
      </div>

      <div class="panel">

        <div class="activity">

          ${
            recentPayments.length
              ? recentPayments.map(payment => {

                  const successful =
                    payment.status === "successful";

                  return `
                    <div class="activity-row">

                      <div>

                        <div class="activity-title">
                          ${escapeHtml(
                            payment.promotion_type ||
                            "Promotion"
                          )}
                          payment —
                          ${money(payment.amount)}
                        </div>

                        <div class="activity-meta">
                          Seller:
                          ${escapeHtml(
                            payment.seller_id || ""
                          )}
                          <br>
                          Reference:
                          ${escapeHtml(
                            payment.paystack_reference || ""
                          )}
                          <br>
                          Date:
                          ${dateTime(payment.created_at)}
                        </div>

                      </div>

                      <span class="badge ${
                        successful
                          ? "success"
                          : "pending"
                      }">
                        ${escapeHtml(
                          payment.status || "unknown"
                        )}
                      </span>

                    </div>
                  `;
                }).join("")
              : `
                <div class="empty">
                  No promotion payments found.
                </div>
              `
          }

        </div>

      </div>

    </section>

  `;


  lastUpdated.textContent =
    `Last updated: ${new Date().toLocaleString("en-NG")}`;
}


// =========================================================
// REFRESH
// =========================================================

refreshBtn.addEventListener(
  "click",
  async () => {

    refreshBtn.disabled = true;
    refreshBtn.textContent = "Loading...";

    try {
      await loadAdminData();
    } finally {
      refreshBtn.disabled = false;
      refreshBtn.textContent = "Refresh";
    }
  }
);


// =========================================================
// LOGOUT
// =========================================================

logoutBtn.addEventListener(
  "click",
  async () => {

    logoutBtn.disabled = true;
    logoutBtn.textContent = "Logging out...";

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
      logoutBtn.textContent = "Logout";

      return;
    }

    window.location.href =
      "account.html";
  }
);


// =========================================================
// INITIAL LOAD
// =========================================================

loadAdminData();


// =========================================================
// AUTO REFRESH
// Refresh dashboard every 30 seconds.
// =========================================================

setInterval(
  () => {
    loadAdminData();
  },
  30000
);
