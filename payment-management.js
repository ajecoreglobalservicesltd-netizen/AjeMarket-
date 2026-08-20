import { supabase, esc, money } from "./supabase.js";

const rows = document.querySelector("#paymentRows");
const statusBox = document.querySelector("#status");

const searchInput = document.querySelector("#searchInput");
const statusFilter = document.querySelector("#statusFilter");
const promotionFilter = document.querySelector("#promotionFilter");

const refreshBtn = document.querySelector("#refreshBtn");
const logoutBtn = document.querySelector("#logoutBtn");

const modal = document.querySelector("#paymentModal");
const closeModal = document.querySelector("#closeModal");
const paymentDetails = document.querySelector("#paymentDetails");

const totalTransactions =
  document.querySelector("#totalTransactions");

const successfulPayments =
  document.querySelector("#successfulPayments");

const pendingPayments =
  document.querySelector("#pendingPayments");

const failedPayments =
  document.querySelector("#failedPayments");

const successfulRevenue =
  document.querySelector("#successfulRevenue");

const boostRevenue =
  document.querySelector("#boostRevenue");

const premiumRevenue =
  document.querySelector("#premiumRevenue");

const last30Revenue =
  document.querySelector("#last30Revenue");

const shownCount =
  document.querySelector("#shownCount");

let payments = [];
let products = [];
let profiles = [];


/* =========================================================
   HELPERS
========================================================= */

function formatDate(value) {
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


function formatShortDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}


function normalizeStatus(status) {
  return String(status || "")
    .trim()
    .toLowerCase();
}


function statusClass(status) {
  const value = normalizeStatus(status);

  if (value === "successful") {
    return "payment-success";
  }

  if (value === "pending") {
    return "payment-pending";
  }

  if (
    value === "failed" ||
    value === "abandoned"
  ) {
    return "payment-failed";
  }

  return "payment-unknown";
}


function getProduct(payment) {
  return products.find(
    product =>
      String(product.id) ===
      String(payment.product_id)
  );
}


function getSeller(payment) {
  return profiles.find(
    profile =>
      String(profile.id) ===
      String(payment.seller_id)
  );
}


/* =========================================================
   LOAD DATA
========================================================= */

async function loadPayments() {

  statusBox.textContent =
    "Loading payment records...";

  rows.innerHTML = `
    <tr>
      <td colspan="9">
        Loading payment records...
      </td>
    </tr>
  `;

  const [
    paymentsResult,
    productsResult,
    profilesResult
  ] = await Promise.all([

    supabase
      .from("promotion_payments")
      .select("*")
      .order("created_at", {
        ascending: false
      }),

    supabase
      .from("products")
      .select(
        "id,title,name,seller_id,price"
      ),

    supabase
      .from("profiles")
      .select(
        "id,full_name,phone"
      )
  ]);


  if (paymentsResult.error) {
    console.error(
      "Payment loading error:",
      paymentsResult.error
    );

    statusBox.textContent =
      paymentsResult.error.message;

    rows.innerHTML = `
      <tr>
        <td colspan="9">
          ${esc(paymentsResult.error.message)}
        </td>
      </tr>
    `;

    return;
  }


  if (productsResult.error) {
    console.error(
      "Product loading error:",
      productsResult.error
    );
  }


  if (profilesResult.error) {
    console.error(
      "Profile loading error:",
      profilesResult.error
    );
  }


  payments =
    paymentsResult.data || [];

  products =
    productsResult.data || [];

  profiles =
    profilesResult.data || [];


  updateSummary();

  renderPayments();

  statusBox.textContent =
    `Payment system online • Last updated: ${formatDate(new Date())}`;
}


/* =========================================================
   SUMMARY
========================================================= */

function updateSummary() {

  const total =
    payments.length;

  const successful =
    payments.filter(
      p =>
        normalizeStatus(p.status) ===
        "successful"
    );

  const pending =
    payments.filter(
      p =>
        normalizeStatus(p.status) ===
        "pending"
    );

  const failed =
    payments.filter(
      p => {
        const status =
          normalizeStatus(p.status);

        return (
          status === "failed" ||
          status === "abandoned"
        );
      }
    );


  const revenue =
    successful.reduce(
      (sum, payment) =>
        sum + Number(payment.amount || 0),
      0
    );


  const boost =
    successful
      .filter(
        p =>
          normalizeStatus(
            p.promotion_type
          ) === "boost"
      )
      .reduce(
        (sum, payment) =>
          sum + Number(payment.amount || 0),
        0
      );


  const premium =
    successful
      .filter(
        p =>
          normalizeStatus(
            p.promotion_type
          ) === "premium"
      )
      .reduce(
        (sum, payment) =>
          sum + Number(payment.amount || 0),
        0
      );


  const thirtyDaysAgo =
    Date.now() -
    30 *
      24 *
      60 *
      60 *
      1000;


  const last30 =
    successful
      .filter(
        payment => {
          const created =
            new Date(
              payment.created_at
            ).getTime();

          return (
            created >=
            thirtyDaysAgo
          );
        }
      )
      .reduce(
        (sum, payment) =>
          sum + Number(payment.amount || 0),
        0
      );


  totalTransactions.textContent =
    total;

  successfulPayments.textContent =
    successful.length;

  pendingPayments.textContent =
    pending.length;

  failedPayments.textContent =
    failed.length;

  successfulRevenue.textContent =
    money(revenue);

  boostRevenue.textContent =
    money(boost);

  premiumRevenue.textContent =
    money(premium);

  last30Revenue.textContent =
    money(last30);
}


/* =========================================================
   FILTER
========================================================= */

function getFilteredPayments() {

  const search =
    String(
      searchInput.value || ""
    )
      .trim()
      .toLowerCase();


  const selectedStatus =
    normalizeStatus(
      statusFilter.value
    );


  const selectedPromotion =
    normalizeStatus(
      promotionFilter.value
    );


  return payments.filter(
    payment => {

      const product =
        getProduct(payment);

      const seller =
        getSeller(payment);


      const productText =
        `${product?.title || ""} ${
          product?.name || ""
        }`.toLowerCase();


      const sellerText =
        `${seller?.full_name || ""}`.toLowerCase();


      const reference =
        String(
          payment.paystack_reference || ""
        ).toLowerCase();


      const searchMatches =
        !search ||
        reference.includes(search) ||
        productText.includes(search) ||
        sellerText.includes(search) ||
        String(
          payment.seller_id || ""
        )
          .toLowerCase()
          .includes(search);


      const statusMatches =
        selectedStatus === "all" ||
        normalizeStatus(
          payment.status
        ) === selectedStatus;


      const promotionMatches =
        selectedPromotion === "all" ||
        normalizeStatus(
          payment.promotion_type
        ) === selectedPromotion;


      return (
        searchMatches &&
        statusMatches &&
        promotionMatches
      );
    }
  );
}


/* =========================================================
   RENDER PAYMENTS
========================================================= */

function renderPayments() {

  const filtered =
    getFilteredPayments();


  shownCount.textContent =
    `${filtered.length} shown`;


  if (!filtered.length) {

    rows.innerHTML = `
      <tr>
        <td colspan="9">
          No payment records match your search.
        </td>
      </tr>
    `;

    return;
  }


  rows.innerHTML =
    filtered
      .map(
        payment => {

          const product =
            getProduct(payment);

          const seller =
            getSeller(payment);

          const promotion =
            normalizeStatus(
              payment.promotion_type
            );

          const status =
            normalizeStatus(
              payment.status
            );


          const productName =
            product?.title ||
            product?.name ||
            "Unknown product";


          const sellerName =
            seller?.full_name ||
            payment.seller_id ||
            "Unknown seller";


          const expires =
            payment.expires_at
              ? formatShortDate(
                  payment.expires_at
                )
              : "—";


          return `
            <tr>

              <td>
                ${formatDate(
                  payment.created_at
                )}
              </td>

              <td>
                <span class="promotion-badge ${promotion}">
                  ${
                    promotion === "premium"
                      ? "Premium"
                      : "Boost"
                  }
                </span>
              </td>

              <td>
                <strong>
                  ${money(
                    payment.amount
                  )}
                </strong>
              </td>

              <td>
                <span class="payment-status ${statusClass(
                  status
                )}">
                  ${esc(
                    status || "unknown"
                  )}
                </span>
              </td>

              <td>
                <strong>
                  ${esc(productName)}
                </strong>

                <small>
                  ID:
                  ${esc(
                    String(
                      payment.product_id || "—"
                    )
                  )}
                </small>
              </td>

              <td>
                <strong>
                  ${esc(sellerName)}
                </strong>

                ${
                  seller?.phone
                    ? `<small>${esc(
                        seller.phone
                      )}</small>`
                    : ""
                }
              </td>

              <td>
                <code>
                  ${esc(
                    payment.paystack_reference ||
                      "—"
                  )}
                </code>
              </td>

              <td>
                ${expires}
              </td>

              <td>

                <button
                  class="btn small"
                  data-view="${esc(
                    String(payment.id)
                  )}"
                >
                  View
                </button>

              </td>

            </tr>
          `;
        }
      )
      .join("");


  rows
    .querySelectorAll(
      "[data-view]"
    )
    .forEach(
      button => {

        button.onclick = () => {

          const payment =
            payments.find(
              p =>
                String(p.id) ===
                String(
                  button.dataset.view
                )
            );

          if (payment) {
            showPaymentDetails(
              payment
            );
          }
        };
      }
    );
}


/* =========================================================
   PAYMENT DETAILS
========================================================= */

function showPaymentDetails(
  payment
) {

  const product =
    getProduct(payment);

  const seller =
    getSeller(payment);


  const status =
    normalizeStatus(
      payment.status
    );


  paymentDetails.innerHTML = `

    <div class="detail-grid">

      <div>
        <span>Status</span>
        <strong class="payment-status ${statusClass(
          status
        )}">
          ${esc(status)}
        </strong>
      </div>

      <div>
        <span>Promotion</span>
        <strong>
          ${esc(
            payment.promotion_type ||
              "—"
          )}
        </strong>
      </div>

      <div>
        <span>Amount</span>
        <strong>
          ${money(payment.amount)}
        </strong>
      </div>

      <div>
        <span>Product</span>
        <strong>
          ${esc(
            product?.title ||
              product?.name ||
              "Unknown"
          )}
        </strong>
      </div>

      <div>
        <span>Seller</span>
        <strong>
          ${esc(
            seller?.full_name ||
              payment.seller_id ||
              "Unknown"
          )}
        </strong>
      </div>

      <div>
        <span>Reference</span>
        <code>
          ${esc(
            payment.paystack_reference ||
              "—"
          )}
        </code>
      </div>

      <div>
        <span>Created</span>
        <strong>
          ${formatDate(
            payment.created_at
          )}
        </strong>
      </div>

      <div>
        <span>Started</span>
        <strong>
          ${formatDate(
            payment.starts_at
          )}
        </strong>
      </div>

      <div>
        <span>Expires</span>
        <strong>
          ${formatDate(
            payment.expires_at
          )}
        </strong>
      </div>

    </div>

    <div class="payment-note">

      ${
        status === "successful"
          ? `
            <strong>Confirmed payment</strong>
            <p>
              This transaction is included in AjeMarket revenue.
              The promotion was activated after Paystack verification.
            </p>
          `
          : status === "pending"
          ? `
            <strong>Payment not yet confirmed</strong>
            <p>
              This transaction is NOT included in successful revenue.
              Do not manually mark it successful.
            </p>
          `
          : `
            <strong>Payment not successful</strong>
            <p>
              This transaction is excluded from successful revenue.
            </p>
          `
      }

    </div>
  `;


  modal.classList.remove(
    "hidden"
  );
}


/* =========================================================
   EVENTS
========================================================= */

searchInput.addEventListener(
  "input",
  renderPayments
);

statusFilter.addEventListener(
  "change",
  renderPayments
);

promotionFilter.addEventListener(
  "change",
  renderPayments
);


refreshBtn.onclick =
  async () => {
    await loadPayments();
  };


closeModal.onclick =
  () => {
    modal.classList.add(
      "hidden"
    );
  };


modal.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      modal
    ) {
      modal.classList.add(
        "hidden"
      );
    }

  }
);


logoutBtn.onclick =
  async () => {

    await supabase.auth.signOut();

    location.href =
      "account.html";
  };


/* =========================================================
   START
========================================================= */

loadPayments();
