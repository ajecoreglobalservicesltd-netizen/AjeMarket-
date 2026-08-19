import { supabase, esc, money, requireUser } from "./supabase.js";

const root = document.querySelector("#dash");

const BOOST_PRICE = 2000;
const PREMIUM_PRICE = 5000;

const FUNCTION_URL =
  "https://zeyoecwbndiocsaqlnuk.supabase.co/functions/v1/swift-handler";

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
      result?.error || result?.message || "Payment request failed."
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
      alert(result.message || "Promotion activated successfully.");

      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );

      location.reload();
      return true;
    }

    throw new Error(result?.error || "Payment could not be verified.");
  } catch (error) {
    console.error("Payment verification error:", error);
    alert(error?.message || "Payment verification failed.");
    return false;
  }
}

async function checkReturnedPayment() {
  const params = new URLSearchParams(window.location.search);
  const reference = params.get("reference") || params.get("trxref");

  if (!reference) return;

  await new Promise((resolve) => setTimeout(resolve, 500));
  await verifyPayment(reference);
}

/* =========================================================
   MESSAGE NOTIFICATION
========================================================= */

async function getUnreadMessageCount(u) {
  const { data, error } = await supabase
    .from("messages")
    .select("id, sender_id, is_read")
    .neq("sender_id", u.id)
    .eq("is_read", false);

  if (error) {
    console.error("Unread message check failed:", error.message);
    return 0;
  }

  return data?.length || 0;
}

async function addMessageNotification(u) {
  const nav = document.querySelector("nav");
  if (!nav) return;

  const messagesLink = [...nav.querySelectorAll("a")].find(
    (a) => a.getAttribute("href") === "messages.html"
  );

  if (!messagesLink) return;

  const unread = await getUnreadMessageCount(u);
  messagesLink.style.position = "relative";

  const oldBadge = messagesLink.querySelector(".message-notification");
  if (oldBadge) oldBadge.remove();

  if (unread > 0) {
    const badge = document.createElement("span");
    badge.className = "message-notification";
    badge.textContent = unread > 99 ? "99+" : unread;
    badge.style.cssText = `
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-width:18px;
      height:18px;
      padding:0 5px;
      margin-left:6px;
      border-radius:999px;
      background:#22c55e;
      color:white;
      font-size:11px;
      font-weight:800;
      line-height:1;
      vertical-align:middle;
      box-shadow:0 0 0 2px rgba(34,197,94,.15);
    `;
    messagesLink.appendChild(badge);
  }
}

/* =========================================================
   PAYMENT
========================================================= */

async function startPayment(product, type) {
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

    const authorizationUrl = result?.data?.authorization_url;

    if (!authorizationUrl) {
      throw new Error("Paystack payment link was not created.");
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

/* =========================================================
   DASHBOARD
========================================================= */

async function loadDashboard() {
  const u = await requireUser();
  if (!u) return;

  await addMessageNotification(u);

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("seller_id", u.id)
    .order("created_at", { ascending: false });

  if (error) {
    root.textContent = error.message;
    return;
  }

  root.innerHTML = `
    <div class="dashboard-actions">
      <a class="btn" href="sell.html">+ New listing</a>
      <a class="btn secondary" href="messages.html">Messages</a>
    </div>

    <div class="list">
      ${(data || [])
        .map((p) => {
          const promotion = p.promotion_type || "ordinary";
          const activePromotion =
            promotion !== "ordinary" &&
            p.promotion_expires_at &&
            new Date(p.promotion_expires_at) > new Date();

          return `
            <div class="listrow">
              <div>
                <b>${esc(p.title || p.name || "Untitled product")}</b>
                <div class="muted">${money(p.price)}</div>
                <div class="muted">
                  Status: ${esc(p.status || "active")}
                </div>
                <div>
                  ${
                    activePromotion
                      ? `
                        <strong>
                          ${promotion === "premium" ? "Premium" : "Boosted"}
                        </strong>
                        <div class="muted">
                          Expires:
                          ${new Date(
                            p.promotion_expires_at
                          ).toLocaleDateString()}
                        </div>
                      `
                      : `
                        <span class="muted">Ordinary listing</span>
                      `
                  }
                </div>
              </div>

              ${
                activePromotion
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
          `;
        })
        .join("") || "<p class='muted'>No listings yet.</p>"}
    </div>
  `;

  root.querySelectorAll('[data-pay="boost"]').forEach((button) => {
    button.onclick = () => {
      const product = data.find(
        (p) => String(p.id) === String(button.dataset.id)
      );

      if (!product) {
        alert("Product not found.");
        return;
      }

      startPayment(product, "boost");
    };
  });

  root.querySelectorAll('[data-pay="premium"]').forEach((button) => {
    button.onclick = () => {
      const product = data.find(
        (p) => String(p.id) === String(button.dataset.id)
      );

      if (!product) {
        alert("Product not found.");
        return;
      }

      startPayment(product, "premium");
    };
  });

  root.querySelectorAll(".del").forEach((button) => {
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

/* =========================================================
   START
========================================================= */

async function start() {
  await checkReturnedPayment();
  await loadDashboard();
}

start();
