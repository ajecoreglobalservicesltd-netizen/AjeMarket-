import { supabase, esc, user, money } from "./supabase.js";

const root = document.querySelector("#messages");

let currentUser = null;
let currentConversation = null;
let messageChannel = null;
let conversationChannel = null;

function formatTime(value) {
  return value ? new Date(value).toLocaleString() : "";
}

function statusMarkup(message) {
  if (String(message.sender_id) !== String(currentUser.id)) return "";

  if (message.read_at || message.is_read === true) {
    return '<span class="message-status read" title="Read">✓✓</span>';
  }

  if (message.delivered_at) {
    return '<span class="message-status delivered" title="Delivered">✓✓</span>';
  }

  return '<span class="message-status sent" title="Sent">✓</span>';
}

function cleanupChannels() {
  if (messageChannel) {
    supabase.removeChannel(messageChannel);
    messageChannel = null;
  }
  if (conversationChannel) {
    supabase.removeChannel(conversationChannel);
    conversationChannel = null;
  }
}

async function markMessagesDelivered(conversationId) {
  if (!currentUser) return;

  const { error } = await supabase
    .from("messages")
    .update({ delivered_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", currentUser.id)
    .is("delivered_at", null);

  if (error) console.warn("Delivery update:", error.message);
}

async function markMessagesRead(conversationId) {
  if (!currentUser) return;

  const { error } = await supabase
    .from("messages")
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq("conversation_id", conversationId)
    .neq("sender_id", currentUser.id)
    .eq("is_read", false);

  if (error) console.warn("Read update:", error.message);
}

async function getProfiles(ids) {
  const unique = [...new Set(ids.filter(Boolean).map(String))];
  if (!unique.length) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id,full_name,phone,avatar_url")
    .in("id", unique);

  if (error) {
    console.warn("Profile lookup:", error.message);
    return [];
  }
  return data || [];
}

async function getProducts(ids) {
  const unique = [...new Set(ids.filter(Boolean).map(String))];
  if (!unique.length) return [];

  const { data, error } = await supabase
    .from("products")
    .select("id,title,name,price,image_url")
    .in("id", unique);

  if (error) {
    console.warn("Product lookup:", error.message);
    return [];
  }
  return data || [];
}

async function getLatestMessageTimes(conversations) {
  if (!conversations.length) return new Map();

  const { data, error } = await supabase
    .from("messages")
    .select("conversation_id,created_at")
    .in("conversation_id", conversations.map(c => c.id))
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Latest message lookup:", error.message);
    return new Map();
  }

  const latest = new Map();
  for (const row of data || []) {
    if (!latest.has(row.conversation_id)) {
      latest.set(row.conversation_id, row.created_at);
    }
  }
  return latest;
}

async function getUnreadCounts(conversations) {
  if (!conversations.length) return new Map();

  const { data, error } = await supabase
    .from("messages")
    .select("conversation_id")
    .in("conversation_id", conversations.map(c => c.id))
    .neq("sender_id", currentUser.id)
    .eq("is_read", false);

  if (error) {
    console.warn("Unread lookup:", error.message);
    return new Map();
  }

  const counts = new Map();
  for (const row of data || []) {
    counts.set(row.conversation_id, (counts.get(row.conversation_id) || 0) + 1);
  }
  return counts;
}

async function showConversations() {
  const { data, error } = await supabase
    .from("conversations")
    .select("id,product_id,buyer_id,seller_id,created_at,updated_at")
    .or(`buyer_id.eq.${currentUser.id},seller_id.eq.${currentUser.id}`)
    .order("updated_at", { ascending: false });

  if (error) {
    root.innerHTML = `<div class="empty">${esc(error.message)}</div>`;
    return;
  }

  if (!data || !data.length) {
    root.innerHTML = `
      <div class="notice">
        <h3>No conversations yet.</h3>
        <p class="muted">Open a product and tap "Message Seller" to start a conversation.</p>
        <a class="btn" href="index.html">Browse marketplace</a>
      </div>
    `;
    return;
  }

  const products = await getProducts(data.map(c => c.product_id));
  const profiles = await getProfiles(data.map(c =>
    String(c.buyer_id) === String(currentUser.id) ? c.seller_id : c.buyer_id
  ));
  const latestTimes = await getLatestMessageTimes(data);
  const unreadCounts = await getUnreadCounts(data);

  const sorted = [...data].sort((a, b) => {
    const at = new Date(latestTimes.get(a.id) || a.updated_at || a.created_at).getTime();
    const bt = new Date(latestTimes.get(b.id) || b.updated_at || b.created_at).getTime();
    return bt - at;
  });

  root.innerHTML = `
    <div class="messages-box">
      <h3>Your conversations</h3>
      <div class="conversation-list">
        ${sorted.map(c => {
          const otherId =
            String(c.buyer_id) === String(currentUser.id)
              ? c.seller_id
              : c.buyer_id;

          const profile = profiles.find(p => String(p.id) === String(otherId));
          const product = products.find(p => String(p.id) === String(c.product_id));
          const personName = profile?.full_name || "AjeMarket user";
          const productName = product?.title || product?.name || "Product";
          const unread = unreadCounts.get(c.id) || 0;
          const latest = latestTimes.get(c.id) || c.updated_at || c.created_at;

          return `
            <a class="conversation-item ${unread ? "has-unread" : ""}"
               href="messages.html?conversation=${encodeURIComponent(c.id)}">
              <div class="conversation-main">
                <b>${esc(personName)}</b>
                ${unread ? `<span class="unread-dot" title="${unread} unread message${unread === 1 ? "" : "s"}">${unread > 9 ? "9+" : unread}</span>` : ""}
                <div>${esc(productName)}</div>
                ${product?.price != null ? `<small class="muted">${money(product.price)}</small>` : ""}
                <small class="muted">${esc(formatTime(latest))}</small>
              </div>
            </a>
          `;
        }).join("")}
      </div>
    </div>
  `;

  const totalUnread = [...unreadCounts.values()].reduce((sum, n) => sum + n, 0);
  document.title = totalUnread ? `(${totalUnread}) Messages — AjeMarket` : "Messages — AjeMarket";
}

function subscribeToConversationList() {
  conversationChannel = supabase
    .channel("ajemarket-conversation-list")
    .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, async () => {
      await showConversations();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, async () => {
      await showConversations();
    })
    .subscribe();
}

async function openConversation(conversationId) {
  const { data: conversation, error } = await supabase
    .from("conversations")
    .select("id,product_id,buyer_id,seller_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (error) {
    root.innerHTML = `<div class="empty">${esc(error.message)}</div>`;
    return;
  }

  if (!conversation) {
    root.innerHTML = `<div class="empty">Conversation not found.</div>`;
    return;
  }

  const isBuyer = String(conversation.buyer_id) === String(currentUser.id);
  const isSeller = String(conversation.seller_id) === String(currentUser.id);

  if (!isBuyer && !isSeller) {
    root.innerHTML = `<div class="empty">You do not have access to this conversation.</div>`;
    return;
  }

  currentConversation = conversation;

  const [productResult, profileResult] = await Promise.all([
    supabase.from("products")
      .select("id,title,name,price,image_url")
      .eq("id", conversation.product_id)
      .maybeSingle(),

    supabase.from("profiles")
      .select("id,full_name,phone,avatar_url")
      .eq("id", isBuyer ? conversation.seller_id : conversation.buyer_id)
      .maybeSingle()
  ]);

  const product = productResult.data;
  const profile = profileResult.data;
  const personName = profile?.full_name || "AjeMarket user";
  const productName = product?.title || product?.name || "Product";

  root.innerHTML = `
    <div class="chat-container">
      <div class="chat-top">
        <a class="btn small" href="messages.html">← Back</a>
        <div class="chat-person-info">
          <b>Chat with ${esc(personName)}</b>
          <div class="muted">
            ${esc(productName)}
            ${product?.price != null ? ` · ${money(product.price)}` : ""}
          </div>
        </div>
      </div>

      ${product?.image_url ? `
        <div class="chat-product">
          <img src="${esc(product.image_url)}" alt="${esc(productName)}">
          <div>
            <b>${esc(productName)}</b>
            ${product?.price != null ? `<div class="muted">${money(product.price)}</div>` : ""}
          </div>
        </div>
      ` : ""}

      <div id="chatMessages" class="chat-messages">Loading messages...</div>

      <form id="messageForm" class="message-form">
        <input id="messageInput" type="text" maxlength="2000"
               placeholder="Write a message..." autocomplete="off" required>
        <button class="btn" type="submit">Send</button>
      </form>
    </div>
  `;

  document.querySelector("#messageForm").onsubmit = sendMessage;

  await markMessagesDelivered(conversation.id);
  await markMessagesRead(conversation.id);
  await loadMessages();
  subscribeToMessages();
}

async function loadMessages() {
  if (!currentConversation) return;

  let result = await supabase
    .from("messages")
    .select("id,conversation_id,sender_id,message,is_read,delivered_at,read_at,created_at")
    .eq("conversation_id", currentConversation.id)
    .order("created_at", { ascending: true });

  if (result.error) {
    result = await supabase
      .from("messages")
      .select("id,conversation_id,sender_id,message,is_read,created_at")
      .eq("conversation_id", currentConversation.id)
      .order("created_at", { ascending: true });
  }

  const { data, error } = result;
  const chat = document.querySelector("#chatMessages");

  if (!chat) return;

  if (error) {
    chat.innerHTML = `<div class="empty">${esc(error.message)}</div>`;
    return;
  }

  if (!data || !data.length) {
    chat.innerHTML = `<div class="empty">No messages yet.<br>Start the conversation below.</div>`;
    return;
  }

  chat.innerHTML = data.map(message => {
    const mine = String(message.sender_id) === String(currentUser.id);

    return `
      <div class="chat-message ${mine ? "mine" : "theirs"}">
        <div class="chat-bubble">${esc(message.message)}</div>
        <div class="message-meta">
          <small class="muted">${esc(formatTime(message.created_at))}</small>
          ${statusMarkup(message)}
        </div>
      </div>
    `;
  }).join("");

  chat.scrollTop = chat.scrollHeight;
}

function subscribeToMessages() {
  if (!currentConversation) return;

  if (messageChannel) supabase.removeChannel(messageChannel);

  messageChannel = supabase
    .channel(`aj-chat-${currentConversation.id}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${currentConversation.id}`
      },
      async payload => {
        if (payload?.new &&
            String(payload.new.sender_id) !== String(currentUser.id)) {
          await markMessagesDelivered(currentConversation.id);
          await markMessagesRead(currentConversation.id);
        }
        await loadMessages();
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${currentConversation.id}`
      },
      async () => {
        await loadMessages();
      }
    )
    .subscribe();
}

async function sendMessage(event) {
  event.preventDefault();

  if (!currentConversation) return;

  const input = document.querySelector("#messageInput");
  const button = event.submitter;

  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  input.disabled = true;
  if (button) {
    button.disabled = true;
    button.textContent = "Sending...";
  }

  const { error } = await supabase
    .from("messages")
    .insert({
      conversation_id: currentConversation.id,
      sender_id: currentUser.id,
      message: text
    });

  if (error) {
    alert("Message failed: " + error.message);
    input.disabled = false;
    if (button) {
      button.disabled = false;
      button.textContent = "Send";
    }
    return;
  }

  input.value = "";
  input.disabled = false;

  if (button) {
    button.disabled = false;
    button.textContent = "Send";
  }

  await loadMessages();
}

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

  cleanupChannels();

  const params = new URLSearchParams(window.location.search);
  const conversationId = params.get("conversation");

  if (conversationId) {
    await openConversation(conversationId);
  } else {
    await showConversations();
    subscribeToConversationList();
  }
}

window.addEventListener("beforeunload", cleanupChannels);

start();
