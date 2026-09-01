import { supabase, esc, money, requireUser } from "./supabase.js";

const root = document.querySelector("#dash");
const messageNotification = document.querySelector("#messageNotification");

const BOOST_PRICE = 2000;
const PREMIUM_PRICE = 5000;

const FUNCTION_URL =
  "https://zeyoecwbndiocsaqlnuk.supabase.co/functions/v1/swift-handler";

const LISTING_FEES = {
  vehicle: 5000,
  property: 10000,
  business: 15000
};

let currentUser = null;
let messageChannel = null;
let notificationTimer = null;

function listingFeeFor(product) {
  const type = product?.listing_type;

  if (type === "vehicle") return LISTING_FEES.vehicle;
  if (type === "property") return LISTING_FEES.property;
  if (type === "business") return LISTING_FEES.business;

  return Number(product?.listing_fee || 0);
}

function showMessageDot(count = 0) {
  if (!messageNotification) return;

  if (count > 0) {
    messageNotification.classList.remove("hidden");
    messageNotification.title =
      `${count} unread message${count === 1 ? "" : "s"}`;
  } else {
    messageNotification.classList.add("hidden");
    messageNotification.removeAttribute("title");
  }
}

async function updateMessageNotification() {
  if (!currentUser) return;

  try {
    const { count, error } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .neq("sender_id", currentUser.id)
      .eq("is_read", false);

    if (error) {
      console.error("Unread message check failed:", error);
      return;
    }

    showMessageDot(count || 0);
  } catch (error) {
    console.error("Unread message notification error:", error);
  }
}

function startMessageNotification() {
  updateMessageNotification();

  notificationTimer = setInterval(updateMessageNotification, 15000);

  try {
    messageChannel = supabase
      .channel(`dashboard-messages-${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages"
        },
        payload => {
          if (
            payload?.new &&
            String(payload.new.sender_id) !== String(currentUser.id)
          ) {
            updateMessageNotification();
          }
        }
      )
      .subscribe();
  } catch (error) {
    console.warn("Realtime notification unavailable:", error);
  }
}

function cleanupMessageNotification() {
  if (notificationTimer) {
    clearInterval(notificationTimer);
    notificationTimer = null;
  }

  if (messageChannel) {
    supabase.removeChannel(messageChannel);
    messageChannel = null;
  }
}

async function callFunction(body) {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Please sign in again.");
  }

  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify(body)
  });

  const text = await response.text();
  let result = {};

  try {
    result = JSON.parse(text);
  } catch {
    throw new Error("The payment server returned an invalid response.");
  }

  if (!response.ok) {
    throw new Error(
      result?.error ||
      result?.message ||
      "Payment request failed."
    );
  }

  return result;
}

async function verifyPayment(reference) {
  try {
    const result = await callFunction({
      action: "verify",
      reference
    });

    if (result?.success) {
      alert(result.message || "Payment processed successfully.");

      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );

      location.reload();
      return true;
    }

    throw new Error(
      result?.error ||
      "Payment could not be verified."
    );
  } catch (error) {
    console.error("Payment verification error:", error);
    alert(error?.message || "Payment verification failed.");
    return false;
  }
}

async function checkReturnedPayment() {
  const params = new URLSearchParams(window.location.search);
  const reference =
    params.get("reference") ||
    params.get("trxref");

  if (!reference) return;

  await new Promise(resolve => setTimeout(resolve, 700));
  await verifyPayment(reference);
}

async function startPromotionPayment(product, type) {
  const button = document.querySelector(
    `[data-pay="${type}"][data-id="${product.id}"]`
  );

  if (button) {
    button.disabled = true;
    button.textContent = "Loading...";
  }

  try {
    const result = await callFunction({
      action: "initialize",
      product_id: product.id,
      promotion_type: type
    });

    const authorizationUrl =
      result?.data?.authorization_url;

    if (!authorizationUrl) {
      throw new Error(
        "Paystack payment link was not created."
      );
    }

    window.location.href = authorizationUrl;
  } catch (error) {
    console.error("Payment initialization error:", error);
    alert(error?.message || "Payment could not be started.");

    if (button) {
      button.disabled = false;
      button.textContent =
        type === "premium"
          ? `Premium ₦${PREMIUM_PRICE.toLocaleString()}`
          : `Boost ₦${BOOST_PRICE.toLocaleString()}`;
    }
  }
}

async function startListingPayment(product) {
  const button = document.querySelector(
    `[data-listing-pay="${product.id}"]`
  );

  const amount = listingFeeFor(product);

  if (!amount) {
    alert("This listing does not require a listing fee.");
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = "Loading...";
  }

  try {
    const result = await callFunction({
      action: "initialize_listing",
      product_id: product.id,
      listing_type: product.listing_type
    });

    const authorizationUrl =
      result?.data?.authorization_url;

    if (!authorizationUrl) {
      throw new Error(
        "Paystack payment link was not created."
      );
    }

    window.location.href = authorizationUrl;
  } catch (error) {
    console.error("Listing payment initialization error:", error);
    alert(
      error?.message ||
      "Listing payment could not be started."
    );

    if (button) {
      button.disabled = false;
      button.textContent =
        `Pay ₦${amount.toLocaleString("en-NG")} & Publish`;
    }
  }
}

async function loadDashboard() {
  const u = await requireUser();
  if (!u) return;

  currentUser = u;
  startMessageNotification();

  const {
    data,
    error
  } = await supabase
    .from("products")
    .select("*")
    .eq("seller_id", u.id)
    .order("created_at", {
      ascending: false
    });

  if (error) {
    root.textContent = error.message;
    return;
  }

  root.innerHTML = `
    <a class="btn" href="sell.html">
      + New listing
    </a>

    <div class="list">
      ${
        (data || [])
          .map(p => {
            const promotion =
              p.promotion_type || "ordinary";

            const activePromotion =
              promotion !== "ordinary" &&
              p.promotion_expires_at &&
              new Date(p.promotion_expires_at) > new Date();

            const isPendingPayment =
              p.status === "pending_payment" &&
              p.listing_fee_paid !== true;

            const listingAmount =
              listingFeeFor(p);

            return `
              <div class="listrow">
                <div>
                  <b>${esc(p.title)}</b>

                  <div class="muted">
                    ${money(p.price)}
                  </div>

                  <div class="muted">
                    Status: ${esc(p.status || "active")}
                  </div>

                  ${
                    isPendingPayment
                      ? `
                        <div class="notice paid" style="margin-top:10px">
                          🔒 Payment required before buyers can see this listing.
                        </div>
                      `
                      : ""
                  }

                  <div>
                    ${
                      activePromotion
                        ? `
                          <strong>
                            ${
                              promotion === "premium"
                                ? "Premium"
                                : "Boosted"
                            }
                          </strong>

                          <div class="muted">
                            Expires:
                            ${new Date(
                              p.promotion_expires_at
                            ).toLocaleDateString()}
                          </div>
                        `
                        : `
                          <span class="muted">
                            ${
                              isPendingPayment
                                ? "Waiting for listing payment"
                                : "Ordinary listing"
                            }
                          </span>
                        `
                    }
                  </div>
                </div>

                <div>
                  ${
                    isPendingPayment
                      ? `
                        <button
                          class="btn small"
                          data-listing-pay="${p.id}"
                        >
                          Pay ₦${listingAmount.toLocaleString("en-NG")} & Publish
                        </button>
                      `
                      : activePromotion
                        ? ""
                        : `
                          <button
                            class="btn small"
                            data-pay="boost"
                            data-id="${p.id}"
                          >
                            Boost ₦${BOOST_PRICE.toLocaleString()}
                          </button>

                          <button
                            class="btn small"
                            data-pay="premium"
                            data-id="${p.id}"
                          >
                            Premium ₦${PREMIUM_PRICE.toLocaleString()}
                          </button>
                        `
                  }

                  <button
                    data-id="${p.id}"
                    class="btn small danger del"
                  >
                    Delete
                  </button>
                </div>
              </div>
            `;
          })
          .join("") ||
        "<p class='muted'>No listings yet.</p>"
      }
    </div>
  `;

  root
    .querySelectorAll("[data-listing-pay]")
    .forEach(button => {
      button.onclick = () => {
        const product =
          data.find(
            p =>
              String(p.id) ===
              String(button.dataset.listingPay)
          );

        if (!product) {
          alert("Listing not found.");
          return;
        }

        startListingPayment(product);
      };
    });

  root
    .querySelectorAll('[data-pay="boost"]')
    .forEach(button => {
      button.onclick = () => {
        const product =
          data.find(
            p =>
              String(p.id) ===
              String(button.dataset.id)
          );

        if (!product) {
          alert("Product not found.");
          return;
        }

        startPromotionPayment(product, "boost");
      };
    });

  root
    .querySelectorAll('[data-pay="premium"]')
    .forEach(button => {
      button.onclick = () => {
        const product =
          data.find(
            p =>
              String(p.id) ===
              String(button.dataset.id)
          );

        if (!product) {
          alert("Product not found.");
          return;
        }

        startPromotionPayment(product, "premium");
      };
    });

  root
    .querySelectorAll(".del")
    .forEach(button => {
      button.onclick = async () => {
        if (!confirm("Delete this listing?")) return;

        const { error } = await supabase
          .from("products")
          .delete()
          .eq("id", button.dataset.id)
          .eq("seller_id", u.id);

        if (error) {
          alert(error.message);
          return;
        }

        location.reload();
      };
    });
}

async function start() {
  await checkReturnedPayment();
  await loadDashboard();
}

start();

window.addEventListener(
  "beforeunload",
  cleanupMessageNotification
);
