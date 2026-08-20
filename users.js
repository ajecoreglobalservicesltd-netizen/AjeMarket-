import { supabase, esc, money } from "./supabase.js";

const totalUsers = document.querySelector("#totalUsers");
const sellerUsers = document.querySelector("#sellerUsers");
const verifiedUsers = document.querySelector("#verifiedUsers");
const newUsers7 = document.querySelector("#newUsers7");
const newUsers30 = document.querySelector("#newUsers30");

const usersList = document.querySelector("#usersList");
const userCount = document.querySelector("#userCount");

const searchInput = document.querySelector("#searchInput");
const sellerFilter = document.querySelector("#sellerFilter");
const verifiedFilter = document.querySelector("#verifiedFilter");

const loading = document.querySelector("#loading");
const errorBox = document.querySelector("#errorBox");
const systemStatus = document.querySelector("#systemStatus");

const refreshBtn = document.querySelector("#refreshBtn");
const logoutBtn = document.querySelector("#logoutBtn");

const userModal = document.querySelector("#userModal");
const modalContent = document.querySelector("#modalContent");
const closeModal = document.querySelector("#closeModal");
const modalBackdrop = document.querySelector("#modalBackdrop");

let users = [];


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
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}


function showError(message) {
  errorBox.hidden = false;
  errorBox.textContent = message;
}


function clearError() {
  errorBox.hidden = true;
  errorBox.textContent = "";
}


function isSeller(user) {
  return user.seller === true;
}


function userSearchText(user) {
  return [
    user.full_name || "",
    user.phone || "",
    user.id || ""
  ]
    .join(" ")
    .toLowerCase();
}


/* =========================================================
   ADMIN AUTH
========================================================= */

async function checkAdmin() {
  const {
    data: {
      session
    }
  } = await supabase.auth.getSession();

  if (!session?.user) {
    location.href = "account.html";
    return false;
  }

  return true;
}


/* =========================================================
   LOAD USER MANAGEMENT DATA
========================================================= */

async function loadUsers() {

  loading.hidden = false;
  usersList.innerHTML = "";
  clearError();

  systemStatus.textContent =
    "Loading live user data...";

  const {
    data,
    error
  } = await supabase.rpc(
    "admin_user_management"
  );

  if (error) {

    console.error(
      "User management error:",
      error
    );

    showError(error.message);

    systemStatus.textContent =
      "Admin system error";

    loading.hidden = true;

    return;
  }


  /*
   * The function returns one JSON object.
   */

  const result = data || {};

  users = Array.isArray(result.users)
    ? result.users
    : [];


  /* SUMMARY */

  totalUsers.textContent =
    Number(result.total_users || 0).toLocaleString();

  sellerUsers.textContent =
    Number(result.sellers || 0).toLocaleString();

  verifiedUsers.textContent =
    Number(result.verified_users || 0).toLocaleString();

  newUsers7.textContent =
    Number(result.new_users_7_days || 0).toLocaleString();

  newUsers30.textContent =
    Number(result.new_users_30_days || 0).toLocaleString();


  systemStatus.textContent =
    `Admin system online • Last updated: ${formatDate(
      new Date()
    )}`;

  loading.hidden = true;

  renderUsers();
}


/* =========================================================
   FILTER USERS
========================================================= */

function getFilteredUsers() {

  const search =
    String(
      searchInput.value || ""
    )
      .trim()
      .toLowerCase();

  const sellerMode =
    sellerFilter.value;

  const verifiedMode =
    verifiedFilter.value;


  return users.filter((user) => {

    /* SEARCH */

    if (
      search &&
      !userSearchText(user).includes(search)
    ) {
      return false;
    }


    /* SELLER FILTER */

    if (
      sellerMode === "seller" &&
      !isSeller(user)
    ) {
      return false;
    }

    if (
      sellerMode === "buyer" &&
      isSeller(user)
    ) {
      return false;
    }


    /* VERIFIED FILTER */

    if (
      verifiedMode === "verified" &&
      user.verified !== true
    ) {
      return false;
    }

    if (
      verifiedMode === "unverified" &&
      user.verified === true
    ) {
      return false;
    }


    return true;
  });
}


/* =========================================================
   RENDER USERS
========================================================= */

function renderUsers() {

  const filtered =
    getFilteredUsers();

  userCount.textContent =
    `${filtered.length} shown`;


  if (!filtered.length) {

    usersList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">👥</div>
        <h3>No users found</h3>
        <p class="muted">
          Try changing your search or filters.
        </p>
      </div>
    `;

    return;
  }


  usersList.innerHTML =
    filtered.map(renderUserCard).join("");


  usersList
    .querySelectorAll("[data-view-user]")
    .forEach((button) => {

      button.addEventListener(
        "click",
        () => {

          const id =
            button.dataset.viewUser;

          const selected =
            users.find(
              (user) =>
                String(user.id) ===
                String(id)
            );

          if (selected) {
            openUserModal(selected);
          }
        }
      );

    });
}


/* =========================================================
   USER CARD
========================================================= */

function renderUserCard(user) {

  const name =
    user.full_name?.trim() ||
    "Unnamed User";

  const seller =
    isSeller(user);

  const verified =
    user.verified === true;


  const avatar =
    user.avatar_url
      ? `
        <img
          class="user-avatar"
          src="${esc(user.avatar_url)}"
          alt="${esc(name)}"
        >
      `
      : `
        <div class="user-avatar placeholder">
          ${esc(
            name
              .charAt(0)
              .toUpperCase()
          )}
        </div>
      `;


  return `
    <article class="user-card">

      <div class="user-main">

        ${avatar}

        <div class="user-info">

          <div class="user-name-row">

            <h3>
              ${esc(name)}
            </h3>

            ${
              verified
                ? `<span class="badge verified">Verified</span>`
                : `<span class="badge">Unverified</span>`
            }

            ${
              seller
                ? `<span class="badge seller">Seller</span>`
                : `<span class="badge buyer">Buyer</span>`
            }

          </div>


          <p class="muted">
            ${esc(user.phone || "No phone number")}
          </p>

          <p class="user-id">
            ID:
            ${esc(user.id)}
          </p>

          <p class="muted">
            Registered:
            ${formatDate(user.created_at)}
          </p>

        </div>

      </div>


      <div class="user-stats">

        <div>
          <strong>
            ${Number(
              user.listing_count || 0
            )}
          </strong>

          <span>Listings</span>
        </div>


        <div>
          <strong>
            ${Number(
              user.conversation_count || 0
            )}
          </strong>

          <span>Conversations</span>
        </div>


        <div>
          <strong>
            ${Number(
              user.message_count || 0
            )}
          </strong>

          <span>Messages</span>
        </div>

      </div>


      <div class="user-actions">

        <button
          class="btn small"
          data-view-user="${esc(user.id)}"
        >
          View User
        </button>

      </div>

    </article>
  `;
}


/* =========================================================
   USER DETAILS
========================================================= */

function openUserModal(user) {

  const name =
    user.full_name?.trim() ||
    "Unnamed User";

  const seller =
    isSeller(user);

  const verified =
    user.verified === true;


  modalContent.innerHTML = `

    <div class="profile-modal">

      ${
        user.avatar_url
          ? `
            <img
              class="profile-avatar"
              src="${esc(user.avatar_url)}"
              alt="${esc(name)}"
            >
          `
          : `
            <div class="profile-avatar placeholder">
              ${esc(
                name
                  .charAt(0)
                  .toUpperCase()
              )}
            </div>
          `
      }


      <h2>
        ${esc(name)}
      </h2>


      <div class="profile-badges">

        ${
          verified
            ? `<span class="badge verified">Verified</span>`
            : `<span class="badge">Unverified</span>`
        }

        ${
          seller
            ? `<span class="badge seller">Seller</span>`
            : `<span class="badge buyer">Buyer</span>`
        }

      </div>


      <div class="detail-grid">

        <div>
          <span>Phone</span>
          <strong>
            ${esc(user.phone || "Not provided")}
          </strong>
        </div>


        <div>
          <span>User ID</span>
          <strong class="break">
            ${esc(user.id)}
          </strong>
        </div>


        <div>
          <span>Registered</span>
          <strong>
            ${formatDate(user.created_at)}
          </strong>
        </div>


        <div>
          <span>Listings</span>
          <strong>
            ${Number(
              user.listing_count || 0
            )}
          </strong>
        </div>


        <div>
          <span>Conversations</span>
          <strong>
            ${Number(
              user.conversation_count || 0
            )}
          </strong>
        </div>


        <div>
          <span>Messages Sent</span>
          <strong>
            ${Number(
              user.message_count || 0
            )}
          </strong>
        </div>

      </div>


      <div class="owner-note">

        <strong>Owner controls</strong>

        <p>
          Account suspension and restoration
          controls will be added in the protected
          Owner Control Centre phase.
        </p>

      </div>

    </div>
  `;


  userModal.hidden = false;

  document.body.style.overflow =
    "hidden";
}


/* =========================================================
   CLOSE MODAL
========================================================= */

function closeUserModal() {

  userModal.hidden = true;

  document.body.style.overflow =
    "";
}


closeModal.onclick =
  closeUserModal;

modalBackdrop.onclick =
  closeUserModal;


/* =========================================================
   FILTER EVENTS
========================================================= */

searchInput.addEventListener(
  "input",
  renderUsers
);

sellerFilter.addEventListener(
  "change",
  renderUsers
);

verifiedFilter.addEventListener(
  "change",
  renderUsers
);


/* =========================================================
   REFRESH
========================================================= */

refreshBtn.onclick =
  async () => {

    refreshBtn.disabled =
      true;

    refreshBtn.textContent =
      "Loading...";

    try {
      await loadUsers();
    } finally {

      refreshBtn.disabled =
        false;

      refreshBtn.textContent =
        "Refresh";
    }
  };


/* =========================================================
   LOGOUT
========================================================= */

logoutBtn.onclick =
  async () => {

    const confirmed =
      confirm(
        "Are you sure you want to logout?"
      );

    if (!confirmed) {
      return;
    }

    await supabase.auth.signOut();

    location.href =
      "account.html";
  };


/* =========================================================
   START
========================================================= */

async function start() {

  const allowed =
    await checkAdmin();

  if (!allowed) {
    return;
  }

  await loadUsers();
}


start();
