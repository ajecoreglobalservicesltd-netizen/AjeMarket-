{ supabase, esc, user } from "./supabase.js";

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
        Database error:<br>
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

  root.innerHTML = `
    <div class="messages-box">

      <h3>Your conversations</h3>

      <div class="conversation-list">

        ${data.map(c => {

          const otherPerson =
            String(c.buyer_id) ===
            String(currentUser.id)
              ? "Seller"
              : "Buyer";

          return `
            <a
              class="conversation-item"
              href="messages.html?conversation=${c.id}"
            >

              <b>
                ${otherPerson}
              </b>

              <div class="muted">
                Product ID:
                ${esc(c.product_id)}
              </div>

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
  const { data: conversation, error } =
    await supabase
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
            Buyer & Seller Chat
          </b>

          <div class="muted">
            Product:
            ${esc(conversation.product_id)}
          </div>
        </div>

      </div>

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

  const { data, error } =
    await supabase
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

  chat.innerHTML = data.map(message => {

    const mine =
      String(message.sender_id) ===
      String(currentUser.id);

    return `
      <div
        class="chat-message ${
          mine ? "mine" : "theirs"
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

  }).join("");

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
