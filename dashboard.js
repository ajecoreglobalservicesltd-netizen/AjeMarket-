import { supabase, esc, money, requireUser } from "./supabase.js";

const root = document.querySelector("#dash");

const BOOST_PRICE = 2000;
const PREMIUM_PRICE = 5000;

async function startPayment(product, type, amount, u) {
  const button = document.querySelector(
    `[data-pay="${type}"][data-id="${product.id}"]`
  );

  if (button) {
    button.disabled = true;
    button.textContent = "Loading…";
  }

  try {
    // Create a pending payment record first
    const { data: payment, error: paymentError } =
      await supabase
        .from("promotion_payments")
        .insert({
          product_id: product.id,
          seller_id: u.id,
          promotion_type: type,
          amount: amount,
          status: "pending"
        })
        .select()
        .single();

    if (paymentError) {
      throw paymentError;
    }

    // Call our Supabase Edge Function
    const {
      data: { session }
    } = await supabase.auth.getSession();

    const response = await fetch(
      "https://zeyoecwbndiocsaqlnuk.supabase.co/functions/v1/swift-handler",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? {
                Authorization:
                  `Bearer ${session.access_token}`
              }
            : {})
        },

        body: JSON.stringify({
          email: u.email,
          amount: amount,
          product_id: product.id,
          promotion_type: type
        })
      }
    );

    const result = await response.json();

    if (!response.ok || !result?.data?.authorization_url) {
      throw new Error(
        result?.error ||
        result?.message ||
        "Unable to start Paystack payment."
      );
    }

    // Save Paystack reference
    const reference =
      result.data.reference || null;

    if (reference) {
      await supabase
        .from("promotion_payments")
        .update({
          paystack_reference: reference
        })
        .eq("id", payment.id);
    }

    // Send seller to Paystack
    window.location.href =
      result.data.authorization_url;

  } catch (error) {
    console.error(error);

    alert(
      error?.message ||
      "Payment could not be started."
    );

    if (button) {
      button.disabled = false;
      button.textContent =
        type === "premium"
          ? "Premium"
          : "Boost";
    }
  }
}

async function loadDashboard() {
  const u = await requireUser();

  if (!u) return;

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
              p.promotion_type ||
              "ordinary";

            const activePromotion =
              promotion !== "ordinary" &&
              p.promotion_expires_at &&
              new Date(
                p.promotion_expires_at
              ) > new Date();

            return `
              <div class="listrow">

                <div>
                  <b>${esc(p.title)}</b>

                  <div class="muted">
                    ${money(p.price)}
                  </div>

                  <div class="muted">
                    Status:
                    ${esc(p.status || "active")}
                  </div>

                  <div>
                    ${
                      activePromotion
                        ? `
                          <strong>
                            ${
                              promotion === "premium"
                                ? "⭐ Premium"
                                : "🚀 Boosted"
                            }
                          </strong>
                        `
                        : `
                          <span class="muted">
                            Ordinary listing
                          </span>
                        `
                    }
                  </div>

                </div>

                ${
                  activePromotion
                    ? `
                      <span class="muted">
                        Expires:
                        ${new Date(
                          p.promotion_expires_at
                        ).toLocaleDateString()}
                      </span>
                    `
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
            `;
          })
          .join("")
          ||
          "<p class='muted'>No listings yet.</p>"
      }

    </div>
  `;

  // Boost buttons
  root
    .querySelectorAll(
      '[data-pay="boost"]'
    )
    .forEach(button => {

      button.onclick = () => {

        const product =
          data.find(
            p => p.id === button.dataset.id
          );

        if (!product) return;

        startPayment(
          product,
          "boost",
          BOOST_PRICE,
          u
        );
      };
    });

  // Premium buttons
  root
    .querySelectorAll(
      '[data-pay="premium"]'
    )
    .forEach(button => {

      button.onclick = () => {

        const product =
          data.find(
            p => p.id === button.dataset.id
          );

        if (!product) return;

        startPayment(
          product,
          "premium",
          PREMIUM_PRICE,
          u
        );
      };
    });

  // Delete buttons
  root
    .querySelectorAll(".del")
    .forEach(button => {

      button.onclick = async () => {

        if (
          !confirm(
            "Delete this listing?"
          )
        ) {
          return;
        }

        const { error } =
          await supabase
            .from("products")
            .delete()
            .eq(
              "id",
              button.dataset.id
            )
            .eq(
              "seller_id",
              u.id
            );

        if (error) {
          alert(error.message);
          return;
        }

        location.reload();
      };
    });
}

loadDashboard();
