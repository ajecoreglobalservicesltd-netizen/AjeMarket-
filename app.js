import { supabase, esc, money } from "./supabase.js";

const grid = document.querySelector("#grid");
const status = document.querySelector("#status");
const search = document.querySelector("#search");
const cat = document.querySelector("#cat");
const sort = document.querySelector("#sort");

let items = [];

function promotionRank(product) {
  const type = product.promotion_type;

  if (
    type &&
    product.promotion_expires_at &&
    new Date(product.promotion_expires_at) > new Date()
  ) {
    if (type === "premium") return 2;
    if (type === "boost") return 1;
  }

  return 0;
}

function render() {
  const q = search.value.trim().toLowerCase();
  const c = cat.value;
  const s = sort.value;

  let a = items.filter(
    x =>
      (!c || x.category === c) &&
      (!q ||
        [
          x.title,
          x.category,
          x.location,
          x.description
        ]
          .join(" ")
          .toLowerCase()
          .includes(q))
  );

  // Premium first, Boosted second, Ordinary last.
  // Within each promotion level, respect the selected sorting.
  a.sort((x, y) => {
    const promotionDifference =
      promotionRank(y) - promotionRank(x);

    if (promotionDifference !== 0) {
      return promotionDifference;
    }

    if (s === "low") {
      return Number(x.price) - Number(y.price);
    }

    if (s === "high") {
      return Number(y.price) - Number(x.price);
    }

    return (
      new Date(y.created_at) -
      new Date(x.created_at)
    );
  });

  grid.innerHTML = a.length
    ? a
        .map(x => {
          const rank = promotionRank(x);

          const badge =
            rank === 2
              ? `<div class="promotion-badge premium">⭐ PREMIUM</div>`
              : rank === 1
              ? `<div class="promotion-badge boost">🚀 BOOSTED</div>`
              : "";

          return `
            <article class="card ${rank === 2 ? "premium-card" : rank === 1 ? "boosted-card" : ""}">

              ${badge}

              <a href="product.html?id=${x.id}">
                ${
                  x.image_url
                    ? `<img src="${esc(
                        x.image_url
                      )}" loading="lazy">`
                    : `<div class="noimg">AjeMarket</div>`
                }
              </a>

              <div class="cardbody">

                <small>
                  ${esc(x.category)}
                </small>

                <h3>
                  ${esc(x.title)}
                </h3>

                <b class="price">
                  ${money(x.price)}
                </b>

                <p class="muted">
                  📍 ${esc(x.location || "")}
                </p>

                <a
                  class="btn small"
                  href="product.html?id=${x.id}"
                >
                  View product
                </a>

              </div>

            </article>
          `;
        })
        .join("")
    : `<div class="empty">No matching products.</div>`;

  status.textContent =
    `${a.length} listing${a.length === 1 ? "" : "s"}`;
}

async function load() {
  const {
    data,
    error
  } = await supabase
    .from("products")
    .select(
      "id,seller_id,title,category,price,location,description,image_url,created_at,status,promotion_type,promotion_expires_at"
    )
    .eq("status", "active")
    .order("created_at", {
      ascending: false
    });

  if (error) {
    status.textContent =
      "Database error: " +
      error.message;
    return;
  }

  items = data || [];

  render();
}

search.oninput = render;
cat.onchange = render;
sort.onchange = render;

load();
