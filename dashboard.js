import {
  supabase,
  esc,
  money,
  requireUser
} from "./supabase.js";

const root =
  document.querySelector("#dash");

const messageNotification =
  document.querySelector(
    "#messageNotification"
  );

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
  const type =
    product?.listing_type;

  if (type === "vehicle")
    return LISTING_FEES.vehicle;

  if (type === "property")
    return LISTING_FEES.property;

  if (type === "business")
    return LISTING_FEES.business;

  return Number(
    product?.listing_fee || 0
  );
}


function showMessageDot(
  count = 0
) {
  if (!messageNotification)
    return;

  if (count > 0) {
    messageNotification
      .classList
      .remove("hidden");

    messageNotification.title =
      `${count} unread message${
        count === 1 ? "" : "s"
      }`;
  } else {
    messageNotification
      .classList
      .add("hidden");

    messageNotification
      .removeAttribute("title");
  }
}


async function updateMessageNotification() {
  if (!currentUser)
    return;

  try {

    const {
      count,
      error
    } = await supabase
      .from("messages")
      .select(
        "id",
        {
          count: "exact",
          head: true
        }
      )
      .neq(
        "sender_id",
        currentUser.id
      )
      .eq(
        "is_read",
        false
      );

    if (error) {
      console.error(
        "Unread message check failed:",
        error
      );
      return;
    }

    showMessageDot(
      count || 0
    );

  } catch (error) {

    console.error(
      "Unread message notification error:",
      error
    );

  }
}


function startMessageNotification() {

  updateMessageNotification();

  notificationTimer =
    setInterval(
      updateMessageNotification,
      15000
    );

  try {

    messageChannel =
      supabase
        .channel(
          `dashboard-messages-${currentUser.id}`
        )
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
              String(
                payload.new.sender_id
              ) !==
              String(
                currentUser.id
              )
            ) {
              updateMessageNotification();
            }

          }
        )
        .subscribe();

  } catch (error) {

    console.warn(
      "Realtime notification unavailable:",
      error
    );

  }
}


function cleanupMessageNotification() {

  if (notificationTimer) {

    clearInterval(
      notificationTimer
    );

    notificationTimer = null;

  }

  if (messageChannel) {

    supabase.removeChannel(
      messageChannel
    );

    messageChannel = null;

  }
}


async function callFunction(body) {

  const {
    data: { session }
  } =
    await supabase.auth
      .getSession();

  if (!session?.access_token) {
    throw new Error(
      "Please sign in again."
    );
  }

  const response =
    await fetch(
      FUNCTION_URL,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          Authorization:
            `Bearer ${session.access_token}`
        },
        body:
          JSON.stringify(body)
      }
    );

  const text =
    await response.text();

  let result = {};

  try {
    result =
      JSON.parse(text);
  } catch {
    throw new Error(
      "The payment server returned an invalid response."
    );
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


async function verifyPayment(
  reference
) {

  try {

    const result =
      await callFunction({
        action: "verify",
        reference
      });

    if (result?.success) {

      alert(
        result.message ||
        "Payment processed successfully."
      );

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

    console.error(
      "Payment verification error:",
      error
    );

    alert(
      error?.message ||
      "Payment verification failed."
    );

    return false;
  }
}


async function checkReturnedPayment() {

  const params =
    new URLSearchParams(
      window.location.search
    );

  const reference =
    params.get("reference") ||
    params.get("trxref");

  if (!reference)
    return;

  await new Promise(
    resolve =>
      setTimeout(
        resolve,
        700
      )
  );

  await verifyPayment(
    reference
  );
}


async function startPromotionPayment(
  product,
  type
) {

  const button =
    document.querySelector(
      `[data-pay="${type}"][data-id="${product.id}"]`
    );

  if (button) {
    button.disabled = true;
    button.textContent =
      "Loading...";
  }

  try {

    const result =
      await callFunction({
        action: "initialize",
        product_id:
          product.id,
        promotion_type:
          type
      });

    const authorizationUrl =
      result?.data?.authorization_url;

    if (!authorizationUrl) {
      throw new Error(
        "Paystack payment link was not created."
      );
    }

    window.location.href =
      authorizationUrl;

  } catch (error) {

    console.error(
      "Payment initialization error:",
      error
    );

    alert(
      error?.message ||
      "Payment could not be started."
    );

    if (button) {

      button.disabled = false;

      button.textContent =
        type === "premium"
          ? `Premium ₦${PREMIUM_PRICE.toLocaleString()}`
          : `Boost ₦${BOOST_PRICE.toLocaleString()}`;

    }
  }
}


async function loadDashboard() {

  const u =
    await requireUser();

  if (!u)
    return;

  currentUser = u;

  startMessageNotification();

  const {
    data,
    error
  } =
    await supabase
      .from("products")
      .select("*")
      .eq(
        "seller_id",
        u.id
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );

  if (error) {
    root.textContent =
      error.message;
    return;
  }

  /*
    IMPORTANT:

    Old versions of AjeMarket created a
    pending_payment product before Paystack.

    Those unpaid rows are now hidden from
    the seller dashboard.

    New paid listings will not have a
    products row at all until payment succeeds.
  */

  const visibleListings =
    (data || []).filter(
      p =>
        !(
          String(
            p?.status || ""
          ).toLowerCase() ===
            "pending_payment" &&
          p?.listing_fee_paid !== true
        )
    );

  root.innerHTML = `
    <div class="dashboard-actions">
      <a class="btn" href="sell.html">
        + New listing
      </a>

      <a
        class="btn secondary"
        href="messages.html"
      >
        Messages
      </a>
    </div>

    <div class="list">

      ${
        visibleListings
          .map(p => {

            const promotion =
              p.promotion_type ||
              "ordinary";

            const activePromotion =
              promotion !==
                "ordinary" &&
              p.promotion_expires_at &&
              new Date(
                p.promotion_expires_at
              ) > new Date();

            const sold =
              p.sold === true ||
              p.is_sold === true ||
              p.sold === "true";

            return `
              <div class="listrow">

                <div>

                  <b>
                    ${esc(
                      p.title ||
                      p.name ||
                      "Untitled product"
                    )}
                  </b>

                  <div class="muted">
                    ${money(p.price)}
                  </div>

                  <div class="muted">
                    Status:
                    ${esc(
                      p.status ||
                      "active"
                    )}
                  </div>

                  <div style="margin-top:6px">

                    ${
                      sold
                        ? `
                          <strong class="sold-badge">
                            SOLD
                          </strong>
                        `
                        : `
                          <span class="muted">
                            Available
                          </span>
                        `
                    }

                  </div>

                  <div>

                    ${
                      activePromotion
                        ? `
                          <strong>
                            ${
                              promotion ===
                              "premium"
                                ? "Premium"
                                : "Boosted"
                            }
                          </strong>

                          <div class="muted">
                            Expires:
                            ${
                              new Date(
                                p.promotion_expires_at
                              ).toLocaleDateString()
                            }
                          </div>
                        `
                        : `
                          <span class="muted">
                            Ordinary listing
                          </span>
                        `
                    }

                  </div>

                </div>

                <div class="dashboard-list-actions">

                  <a
                    class="btn small secondary"
                    href="edit.html?id=${encodeURIComponent(
                      p.id
                    )}"
                  >
                    Edit
                  </a>

                  <button
                    type="button"
                    class="btn small ${
                      sold
                        ? "secondary"
                        : ""
                    }"
                    data-sold-id="${esc(
                      p.id
                    )}"
                  >
                    ${
                      sold
                        ? "Mark as Available"
                        : "Mark as SOLD"
                    }
                  </button>

                  ${
                    activePromotion
                      ? ""
                      : `
                        <button
                          type="button"
                          class="btn small"
                          data-pay="boost"
                          data-id="${esc(
                            p.id
                          )}"
                        >
                          Boost ₦${BOOST_PRICE.toLocaleString()}
                        </button>

                        <button
                          type="button"
                          class="btn small"
                          data-pay="premium"
                          data-id="${esc(
                            p.id
                          )}"
                        >
                          Premium ₦${PREMIUM_PRICE.toLocaleString()}
                        </button>
                      `
                  }

                  <button
                    type="button"
                    data-id="${esc(
                      p.id
                    )}"
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
    .querySelectorAll(
      "[data-sold-id]"
    )
    .forEach(button => {

      button.onclick = async () => {

        const product =
          visibleListings.find(
            p =>
              String(p.id) ===
              String(
                button.dataset
                  .soldId
              )
          );

        if (!product) {
          alert(
            "Product not found."
          );
          return;
        }

        const sold =
          !(
            product.sold === true ||
            product.is_sold === true ||
            product.sold === "true"
          );

        const message =
          sold
            ? "Mark this product as SOLD? Buyers and admin will see that it has been sold."
            : "Mark this product as available again?";

        if (!confirm(message))
          return;

        button.disabled = true;
        button.textContent =
          "Saving...";

        try {

          const {
            data: updated,
            error
          } =
            await supabase
              .from("products")
              .update({
                sold
              })
              .eq(
                "id",
                product.id
              )
              .eq(
                "seller_id",
                currentUser.id
              )
              .select("*")
              .single();

          if (error)
            throw error;

          if (!updated)
            throw new Error(
              "The product status could not be confirmed."
            );

          await loadDashboard();

        } catch (error) {

          console.error(
            "Sold status update error:",
            error
          );

          alert(
            error?.message ||
            "Could not update the sold status."
          );

          button.disabled =
            false;

          button.textContent =
            sold
              ? "Mark as SOLD"
              : "Mark as Available";
        }

      };

    });


  root
    .querySelectorAll(
      '[data-pay="boost"]'
    )
    .forEach(button => {

      button.onclick = () => {

        const product =
          visibleListings.find(
            p =>
              String(p.id) ===
              String(
                button.dataset.id
              )
          );

        if (!product) {
          alert(
            "Product not found."
          );
          return;
        }

        startPromotionPayment(
          product,
          "boost"
        );

      };

    });


  root
    .querySelectorAll(
      '[data-pay="premium"]'
    )
    .forEach(button => {

      button.onclick = () => {

        const product =
          visibleListings.find(
            p =>
              String(p.id) ===
              String(
                button.dataset.id
              )
          );

        if (!product) {
          alert(
            "Product not found."
          );
          return;
        }

        startPromotionPayment(
          product,
          "premium"
        );

      };

    });


  root
    .querySelectorAll(
      ".del"
    )
    .forEach(button => {

      button.onclick =
        async () => {

          if (
            !confirm(
              "Delete this listing?"
            )
          ) {
            return;
          }

          const {
            error
          } =
            await supabase
              .from("products")
              .delete()
              .eq(
                "id",
                button.dataset.id
              )
              .eq(
                "seller_id",
                currentUser.id
              );

          if (error) {
            alert(
              error.message
            );
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
