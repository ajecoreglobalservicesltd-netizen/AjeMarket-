import { supabase, esc, user, money } from "./supabase.js";

const root = document.querySelector("#messages");

let currentUser = null;
let currentConversation = null;

async function start() {
  currentUser = await user();

  if (!currentUser) {
    root.innerHTML = `
      <div class="notice">
        Please <a href="account.html">sign in</a> to use messages.
      </div>
    `;
    return;
  }

  const params = new URLSearchParams(
    window.location.search
  );

  const conversationId =
    params.get("conversation");

  if (conversationId) {
    await openConversation(conversationId);
  } else {
    await showConversations();
  }
}

async function showConversations() {
  const { data, error } = await supabase
    .from("conversations")
    .select(
      "id,product_id,buyer_id,seller_id,created_at,updated_at"
    )
    .or(
      `buyer_id.eq.${currentUser.id},seller_id.eq.${currentUser.id}`
    )
    .order("updated_at", {
      ascending: false
    });

  if (error) {
    root.innerHTML = `
      <div class="empty">
        ${esc(error.message)}
      </div>
    `;
    return;
  }

  if (!data || !data.length) {
    root.innerHTML = `
      <div class="notice">
        <h3>No conversations yet.</h3>

        <p class="muted">
          Open a product and tap
          "Message Seller" to start
          a conversation.
        </p>

        <a class="btn" href="index.html">
          Browse marketplace
        </a>
      </div>
    `;
    return;
  }

  const productIds = [
    ...new Set(
      data.map(c => c.product_id)
    )
  ];

  const otherUserIds = [
    ...new Set(
      data.map(c =>
        String(c.buyer_id) ===
        String(currentUser.id)
          ? c.seller_id
          : c.buyer_id
      )
    )
  ];

  let products = [];
  let profiles = [];

  if (productIds.length) {
    const { data: productData } =
      await supabase
        .from("products")
        .select(
          "id,title,name,price,image_url"
        )
        .in("id", productIds);

    products = productData || [];
  }

  if (otherUserIds.length) {
    const { data: profileData } =
      await supabase
        .from("profiles")
        .select(
          "id,full_name,phone,avatar_url"
        )
        .in("id", otherUserIds);

    profiles = profileData || [];
  }

  root.innerHTML = `
    <div class="messages-box">

      <h3>Your conversations</h3>

      <div class="conversation-list">

        ${data.map(c => {

          const otherId =
            String(c.buyer_id) ===
            String(currentUser.id)
              ? c.seller_id
              : c.buyer_id;

          const profile =
            profiles.find(
              p =>
                String(p.id) ===
                String(otherId)
            );

          const product =
            products.find(
              p =>
                String(p.id) ===
                String(c.product_id)
            );

          const personName =
            profile?.full_name ||
            "AjeMarket user";

          const productName =
            product?.title ||
            product?.name ||
            "Product";

          return `
            <a
              class="conversation-item"
              href="messages.html?conversation=${c.id}"
            >

              <b>
                ${esc(personName)}
              </b>

              <div>
                ${esc(productName)}
              </div>

              ${
                product?.price != null
                  ? `
                    <small class="muted">
                      ${money(product.price)}
                    </small>
                  `
                  : ""
              }

              <small class="muted">
                ${new Date(
                  c.updated_at ||
                  c.created_at
                ).toLocaleString()}
              </small>

            </a>
          `;
        }).join("")}

      </div>

    </div>
  `;
}

async function openConversation(
  conversationId
) {
  const {
    data: conversation,
    error
  } = await supabase
    .from("conversations")
    .select(
      "id,product_id,buyer_id,seller_id"
    )
    .eq("id", conversationId)
    .maybeSingle();

  if (error) {
    root.innerHTML = `
      <div class="empty">
        ${esc(error.message)}
      </div>
    `;
    return;
  }

  if (!conversation) {
    root.innerHTML = `
      <div class="empty">
        Conversation not found.
      </div>
    `;
    return;
  }

  const isBuyer =
    String(conversation.buyer_id) ===
    String(currentUser.id);

  const isSeller =
    String(conversation.seller_id) ===
    String(currentUser.id);

  if (!isBuyer && !isSeller) {
    root.innerHTML = `
      <div class="empty">
        You do not have access to this conversation.
      </div>
    `;
    return;
  }

  currentConversation =
    conversation;

  let product = null;
  let profile = null;

  const { data: productData } =
    await supabase
      .from("products")
      .select(
        "id,title,name,price,image_url"
      )
      .eq(
        "id",
        conversation.product_id
      )
      .maybeSingle();

  product = productData;

  const otherUserId =
    isBuyer
      ? conversation.seller_id
      : conversation.buyer_id;

  const { data: profileData } =
    await supabase
      .from("profiles")
      .select(
        "id,full_name,phone,avatar_url"
      )
      .eq(
        "id",
        otherUserId
      )
      .maybeSingle();

  profile = profileData;

  const personName =
    profile?.full_name ||
    (isBuyer
      ? "AjeMarket seller"
      : "AjeMarket buyer");

  const productName =
    product?.title ||
    product?.name ||
    "Product";

  root.innerHTML = `
    <div class="chat-container">

      <div class="chat-top">

        <a
          class="btn small"
          href="messages.html"
        >
          ← Back
        </a>

        <div>
          <b>
            Chat with ${esc(personName)}
          </b>

          <div class="muted">
            ${esc(productName)}
            ${
              product?.price != null
                ? ` · ${money(product.price)}`
                : ""
            }
          </div>
        </div>

      </div>

      ${
        product?.image_url
          ? `
            <div class="chat-product">
              <img
                src="${esc(product.image_url)}"
                alt="${esc(productName)}"
              >

              <div>
                <b>
                  ${esc(productName)}
                </b>

                ${
                  product?.price != null
                    ? `
                      <div class="muted">
                        ${money(product.price)}
                      </div>
                    `
                    : ""
                }
              </div>
            </div>
          `
          : ""
      }

      <div
        id="chatMessages"
        class="chat-messages"
      >
        Loading messages...
      </div>

      <form
        id="messageForm"
        class="message-form"
      >

        <input
          id="messageInput"
          type="text"
          maxlength="2000"
          placeholder="Write a message..."
          autocomplete="off"
          required
        >

        <button
          class="btn"
          type="submit"
        >
          Send
        </button>

      </form>

    </div>
  `;

  document.querySelector(
    "#messageForm"
  ).onsubmit = sendMessage;

  await loadMessages();
}

async function loadMessages() {
  if (!currentConversation) {
    return;
  }

  const {
    data,
    error
  } = await supabase
    .from("messages")
    .select(
      "id,conversation_id,sender_id,message,is_read,created_at"
    )
    .eq(
      "conversation_id",
      currentConversation.id
    )
    .order("created_at", {
      ascending: true
    });

  const chat =
    document.querySelector(
      "#chatMessages"
    );

  if (!chat) {
    return;
  }

  if (error) {
    chat.innerHTML = `
      <div class="empty">
        ${esc(error.message)}
      </div>
    `;
    return;
  }

  if (!data || !data.length) {
    chat.innerHTML = `
      <div class="empty">
        No messages yet.<br>
        Start the conversation below.
      </div>
    `;
    return;
  }

  chat.innerHTML = data
    .map(message => {

      const mine =
        String(message.sender_id) ===
        String(currentUser.id);

      return `
        <div
          class="chat-message ${
            mine
              ? "mine"
              : "theirs"
          }"
        >

          <div class="chat-bubble">
            ${esc(message.message)}
          </div>

          <small class="muted">
            ${new Date(
              message.created_at
            ).toLocaleString()}
          </small>

        </div>
      `;
    })
    .join("");

  chat.scrollTop =
    chat.scrollHeight;
}

async function sendMessage(event) {
  event.preventDefault();

  const input =
    document.querySelector(
      "#messageInput"
    );

  const button =
    event.submitter;

  if (!input) {
    return;
  }

  const text =
    input.value.trim();

  if (!text) {
    return;
  }

  input.disabled = true;

  if (button) {
    button.disabled = true;
    button.textContent =
      "Sending...";
  }

  const { error } =
    await supabase
      .from("messages")
      .insert({
        conversation_id:
          currentConversation.id,
        sender_id:
          currentUser.id,
        message: text
      });

  if (error) {
    alert(
      "Message failed: " +
      error.message
    );

    input.disabled = false;

    if (button) {
      button.disabled = false;
      button.textContent =
        "Send";
    }

    return;
  }

  input.value = "";
  input.disabled = false;

  if (button) {
    button.disabled = false;
    button.textContent =
      "Send";
  }

  await loadMessages();
}

start();
