import { supabase, esc, user, money } from "./supabase.js";

const root = document.querySelector("#messages");

let currentUser = null;
let currentConversation = null;
let realtimeChannel = null;
let conversationChannel = null;

/* =========================================================
   HELPERS
========================================================= */

function getOtherUserId(conversation) {
  if (
    String(conversation.buyer_id) ===
    String(currentUser.id)
  ) {
    return conversation.seller_id;
  }

  return conversation.buyer_id;
}

function formatTime(date) {
  return new Date(date).toLocaleString();
}

function messageStatus(message) {
  const mine =
    String(message.sender_id) ===
    String(currentUser.id);

  if (!mine) return "";

  if (message.is_read) {
    return `
      <span
        class="message-status read"
        title="Read"
      >
        ✓✓
      </span>
    `;
  }

  if (message.delivered_at) {
    return `
      <span
        class="message-status delivered"
        title="Delivered"
      >
        ✓✓
      </span>
    `;
  }

  return `
    <span
      class="message-status sent"
      title="Sent"
    >
      ✓
    </span>
  `;
}

/* =========================================================
   START
========================================================= */

async function start() {
  currentUser = await user();

  if (!currentUser) {
    root.innerHTML = `
      <div class="notice">
        Please
        <a href="account.html">sign in</a>
        to use messages.
      </div>
    `;
    return;
  }

  const params =
    new URLSearchParams(
      window.location.search
    );

  const conversationId =
    params.get("conversation");

  if (conversationId) {
    await openConversation(
      conversationId
    );
  } else {
    await showConversations();
    subscribeToConversationChanges();
  }
}

/* =========================================================
   CONVERSATION LIST
========================================================= */

async function showConversations() {
  const {
    data,
    error
  } = await supabase
    .from("conversations")
    .select(
      "id,product_id,buyer_id,seller_id,created_at,updated_at"
    )
    .or(
      `buyer_id.eq.${currentUser.id},seller_id.eq.${currentUser.id}`
    )
    .order(
      "updated_at",
      {
        ascending: false
      }
    );

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

        <a
          class="btn"
          href="index.html"
        >
          Browse marketplace
        </a>
      </div>
    `;

    updateMessagesNotification(0);
    return;
  }

  const productIds = [
    ...new Set(
      data.map(
        c => c.product_id
      )
    )
  ];

  const otherUserIds = [
    ...new Set(
      data.map(
        c =>
          getOtherUserId(c)
      )
    )
  ];

  let products = [];
  let profiles = [];

  if (productIds.length) {
    const {
      data: productData
    } = await supabase
      .from("products")
      .select(
        "id,title,name,price,image_url"
      )
      .in(
        "id",
        productIds
      );

    products =
      productData || [];
  }

  if (otherUserIds.length) {
    const {
      data: profileData
    } = await supabase
      .from("profiles")
      .select(
        "id,full_name,phone,avatar_url"
      )
      .in(
        "id",
        otherUserIds
      );

    profiles =
      profileData || [];
  }

  /*
    Get unread message counts.
  */

  const conversationIds =
    data.map(c => c.id);

  let unreadRows = [];

  if (conversationIds.length) {
    const {
      data: unreadData
    } = await supabase
      .from("messages")
      .select(
        "conversation_id,sender_id"
      )
      .in(
        "conversation_id",
        conversationIds
      )
      .eq(
        "is_read",
        false
      )
      .neq(
        "sender_id",
        currentUser.id
      );

    unreadRows =
      unreadData || [];
  }

  const unreadCounts = {};

  unreadRows.forEach(
    message => {
      unreadCounts[
        message.conversation_id
      ] =
        (
          unreadCounts[
            message.conversation_id
          ] || 0
        ) + 1;
    }
  );

  const totalUnread =
    unreadRows.length;

  updateMessagesNotification(
    totalUnread
  );

  root.innerHTML = `
    <div class="messages-box">

      <h3>Your conversations</h3>

      <div class="conversation-list">

        ${data.map(c => {

          const otherId =
            getOtherUserId(c);

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

          const unread =
            unreadCounts[
              c.id
            ] || 0;

          return `
            <a
              class="conversation-item ${
                unread > 0
                  ? "has-unread"
                  : ""
              }"
              href="messages.html?conversation=${c.id}"
            >

              <div
                class="conversation-name"
              >

                <b>
                  ${esc(
                    personName
                  )}
                </b>

                ${
                  unread > 0
                    ? `
                      <span
                        class="unread-dot"
                        title="${unread} unread message${
                          unread === 1
                            ? ""
                            : "s"
                        }"
                      >
                      </span>
                    `
                    : ""
                }

              </div>

              <div>
                ${esc(
                  productName
                )}
              </div>

              ${
                product?.price != null
                  ? `
                    <small class="muted">
                      ${money(
                        product.price
                      )}
                    </small>
                  `
                  : ""
              }

              <small class="muted">
                ${formatTime(
                  c.updated_at ||
                  c.created_at
                )}
              </small>

            </a>
          `;

        }).join("")}

      </div>

    </div>
  `;
}

/* =========================================================
   OPEN CONVERSATION
========================================================= */

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
    .eq(
      "id",
      conversationId
    )
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
    String(
      conversation.buyer_id
    ) ===
    String(
      currentUser.id
    );

  const isSeller =
    String(
      conversation.seller_id
    ) ===
    String(
      currentUser.id
    );

  if (!isBuyer && !isSeller) {
    root.innerHTML = `
      <div class="empty">
        You do not have access
        to this conversation.
      </div>
    `;
    return;
  }

  currentConversation =
    conversation;

  let product = null;
  let profile = null;

  const {
    data: productData
  } = await supabase
    .from("products")
    .select(
      "id,title,name,price,image_url"
    )
    .eq(
      "id",
      conversation.product_id
    )
    .maybeSingle();

  product =
    productData;

  const otherUserId =
    isBuyer
      ? conversation.seller_id
      : conversation.buyer_id;

  const {
    data: profileData
  } = await supabase
    .from("profiles")
    .select(
      "id,full_name,phone,avatar_url"
    )
    .eq(
      "id",
      otherUserId
    )
    .maybeSingle();

  profile =
    profileData;

  const personName =
    profile?.full_name ||
    "AjeMarket user";

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
            Chat with
            ${esc(personName)}
          </b>

          <div class="muted">
            ${esc(productName)}

            ${
              product?.price != null
                ? `
                  · ${money(
                    product.price
                  )}
                `
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
                src="${esc(
                  product.image_url
                )}"
                alt="${esc(
                  productName
                )}"
              >

              <div>
                <b>
                  ${esc(
                    productName
                  )}
                </b>

                ${
                  product?.price != null
                    ? `
                      <div class="muted">
                        ${money(
                          product.price
                        )}
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
  ).onsubmit =
    sendMessage;

  /*
    Mark existing incoming
    messages as read.
  */

  await markConversationRead();

  await loadMessages();

  subscribeToMessages();

  /*
    Update notification immediately
    because this conversation is now
    being viewed.
  */

  updateMessagesNotification();
}

/* =========================================================
   LOAD MESSAGES
========================================================= */

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
      "id,conversation_id,sender_id,message,is_read,delivered_at,created_at"
    )
    .eq(
      "conversation_id",
      currentConversation.id
    )
    .order(
      "created_at",
      {
        ascending: true
      }
    );

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

  chat.innerHTML =
    data
      .map(message => {

        const mine =
          String(
            message.sender_id
          ) ===
          String(
            currentUser.id
          );

        return `
          <div
            class="chat-message ${
              mine
                ? "mine"
                : "theirs"
            }"
            data-message-id="${
              message.id
            }"
          >

            <div class="chat-bubble">

              ${esc(
                message.message
              )}

              ${
                mine
                  ? `
                    <span
                      class="message-checks"
                    >
                      ${messageStatus(
                        message
                      )}
                    </span>
                  `
                  : ""
              }

            </div>

            <small class="muted">
              ${formatTime(
                message.created_at
              )}
            </small>

          </div>
        `;
      })
      .join("");

  chat.scrollTop =
    chat.scrollHeight;
}

/* =========================================================
   SEND MESSAGE
========================================================= */

async function sendMessage(
  event
) {
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

  input.disabled =
    true;

  if (button) {
    button.disabled =
      true;

    button.textContent =
      "Sending...";
  }

  const {
    data,
    error
  } = await supabase
    .from("messages")
    .insert({
      conversation_id:
        currentConversation.id,

      sender_id:
        currentUser.id,

      message:
        text
    })
    .select()
    .single();

  if (error) {
    alert(
      "Message failed: " +
      error.message
    );

    input.disabled =
      false;

    if (button) {
      button.disabled =
        false;

      button.textContent =
        "Send";
    }

    return;
  }

  input.value = "";

  input.disabled =
    false;

  if (button) {
    button.disabled =
      false;

    button.textContent =
      "Send";
  }

  /*
    Realtime normally displays
    the message automatically.
    We load again as a safety fallback.
  */

  await loadMessages();

  updateMessagesNotification();
}

/* =========================================================
   MARK MESSAGES AS READ
========================================================= */

async function markConversationRead() {
  if (!currentConversation) {
    return;
  }

  await supabase
    .from("messages")
    .update({
      is_read: true
    })
    .eq(
      "conversation_id",
      currentConversation.id
    )
    .neq(
      "sender_id",
      currentUser.id
    )
    .eq(
      "is_read",
      false
    );
}

/* =========================================================
   MARK MESSAGE DELIVERED
========================================================= */

async function markMessageDelivered(
  message
) {
  if (
    !message ||
    String(
      message.sender_id
    ) ===
      String(
        currentUser.id
      )
  ) {
    return;
  }

  if (message.delivered_at) {
    return;
  }

  await supabase
    .from("messages")
    .update({
      delivered_at:
        new Date().toISOString()
    })
    .eq(
      "id",
      message.id
    )
    .neq(
      "sender_id",
      currentUser.id
    );
}

/* =========================================================
   REALTIME CHAT
========================================================= */

function subscribeToMessages() {
  if (!currentConversation) {
    return;
  }

  if (realtimeChannel) {
    supabase.removeChannel(
      realtimeChannel
    );
  }

  realtimeChannel =
    supabase
      .channel(
        `chat-${currentConversation.id}-${Date.now()}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter:
            `conversation_id=eq.${currentConversation.id}`
        },
        async payload => {

          /*
            A new message arrived.
          */

          if (
            payload.eventType ===
            "INSERT"
          ) {

            const message =
              payload.new;

            /*
              If the other person
              sent it, mark it delivered.
            */

            if (
              String(
                message.sender_id
              ) !==
              String(
                currentUser.id
              )
            ) {
              await markMessageDelivered(
                message
              );

              await supabase
                .from("messages")
                .update({
                  is_read: true
                })
                .eq(
                  "id",
                  message.id
                )
                .neq(
                  "sender_id",
                  currentUser.id
                );
            }

            await loadMessages();

            updateMessagesNotification();
          }

          /*
            Somebody read or delivered
            one of our messages.
          */

          if (
            payload.eventType ===
              "UPDATE"
          ) {
            await loadMessages();
          }
        }
      )
      .subscribe();
}

/* =========================================================
   REALTIME CONVERSATIONS
========================================================= */

function subscribeToConversationChanges() {
  if (conversationChannel) {
    supabase.removeChannel(
      conversationChannel
    );
  }

  conversationChannel =
    supabase
      .channel(
        `conversation-list-${currentUser.id}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages"
        },
        async () => {

          /*
            A message anywhere in the
            user's conversations can change
            the order or unread count.
          */

          await showConversations();
        }
      )
      .subscribe();
}

/* =========================================================
   MESSAGE NOTIFICATION
========================================================= */

async function updateMessagesNotification(
  forcedCount = null
) {
  if (!currentUser) {
    return;
  }

  let unreadCount =
    forcedCount;

  if (
    unreadCount === null
  ) {
    const {
      data
    } = await supabase
      .from("messages")
      .select(
        "id",
        {
          count:
            "exact"
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

    unreadCount =
      data?.length || 0;
  }

  const links =
    document.querySelectorAll(
      'a[href="messages.html"]'
    );

  links.forEach(link => {

    const existing =
      link.querySelector(
        ".nav-message-dot"
      );

    if (existing) {
      existing.remove();
    }

    if (unreadCount > 0) {

      const dot =
        document.createElement(
          "span"
        );

      dot.className =
        "nav-message-dot";

      dot.title =
        `${unreadCount} unread message${
          unreadCount === 1
            ? ""
            : "s"
        }`;

      link.appendChild(
        dot
      );
    }
  });
}

/* =========================================================
   START APP
========================================================= */

start();
