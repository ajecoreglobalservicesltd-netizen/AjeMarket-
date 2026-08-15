import {supabase,esc,money,user} from "./supabase.js";

const root = document.querySelector("#product");
const id = new URLSearchParams(location.search).get("id");

async function load() {
  if (!id) {
    root.innerHTML = '<div class="empty">Product not found.</div>';
    return;
  }

  // Get product
  const {data: p, error} = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    root.innerHTML = `<div class="empty">${esc(error.message)}</div>`;
    return;
  }

  // Get seller profile
  let profile = null;

  if (p.seller_id) {
    const {data: seller} = await supabase
      .from("profiles")
      .select("full_name,phone,avatar_url,verified")
      .eq("id", p.seller_id)
      .maybeSingle();

    profile = seller;
  }

  const sellerName = profile?.full_name || "AjeMarket seller";
  const sellerPhone = profile?.phone || p.seller_phone || "";

  // Get ALL product images
  let images = [];

  if (Array.isArray(p.image_urls)) {
    images = p.image_urls.filter(Boolean);
  }

  // Support products created before the new image system
  if (!images.length && p.image_url) {
    images = [p.image_url];
  }

  const firstImage = images[0] || "";

  // Build photo gallery
  const gallery = images.length
    ? `
      <div class="aje-gallery">

        <div class="aje-main-image">
          <img
            id="mainProductImage"
            src="${esc(firstImage)}"
            alt="${esc(p.title || "Product")}"
          >
        </div>

        ${
          images.length > 1
            ? `
              <div class="aje-photo-count">
                ${images.length} photos
              </div>

              <div class="aje-thumbnails">
                ${images.map((image,index) => `
                  <button
                    type="button"
                    class="aje-thumbnail ${index === 0 ? "active" : ""}"
                    data-image="${esc(image)}"
                  >
                    <img
                      src="${esc(image)}"
                      alt="Product photo ${index + 1}"
                    >
                  </button>
                `).join("")}
              </div>
            `
            : ""
        }

      </div>
    `
    : `
      <div class="productimage">
        AjeMarket
      </div>
    `;

  root.innerHTML = `
    <div class="product">

      ${gallery}

      <div class="panel">

        <small>${esc(p.category || "")}</small>

        <h1>${esc(p.title || "Untitled product")}</h1>

        <div class="bigprice">
          ${money(p.price)}
        </div>

        <p>📍 ${esc(p.location || "")}</p>

        <p>${esc(p.description || "")}</p>

        <div class="notice">
          <b>Before paying:</b>
          Physically inspect and verify this product and seller
          before sending any money.
        </div>

        <div class="actions">

          ${
            sellerPhone
              ? `
                <a
                  class="btn"
                  href="tel:${esc(sellerPhone)}"
                >
                  Call seller
                </a>

                <a
                  class="btn secondary"
                  href="https://wa.me/${String(
                    sellerPhone
                  ).replace(/\D/g,"")}"
                  target="_blank"
                >
                  WhatsApp
                </a>
              `
              : ""
          }

          <button class="btn secondary" id="fav">
            ♡ Save
          </button>

          <button class="btn danger" id="report">
            Report
          </button>

        </div>

        <hr>

        <h3>Seller</h3>

        <p>
          <b>${esc(sellerName)}</b>
          ${profile?.verified ? " ✓ Verified" : ""}
        </p>

        ${
          sellerPhone
            ? `<p>📞 ${esc(sellerPhone)}</p>`
            : ""
        }

      </div>
    </div>
  `;

  // PHOTO SWITCHING
  const mainImage =
    document.querySelector("#mainProductImage");

  document
    .querySelectorAll(".aje-thumbnail")
    .forEach(button => {

      button.onclick = () => {

        const image = button.dataset.image;

        if (mainImage && image) {
          mainImage.src = image;
        }

        document
          .querySelectorAll(".aje-thumbnail")
          .forEach(item => {
            item.classList.remove("active");
          });

        button.classList.add("active");
      };
    });

  // SAVE / FAVOURITE
  const fav = document.querySelector("#fav");

  if (fav) {
    fav.onclick = async () => {

      const u = await user();

      if (!u) {
        location.href = "account.html";
        return;
      }

      const {error} = await supabase
        .from("favorites")
        .upsert({
          user_id: u.id,
          product_id: id
        });

      alert(
        error
          ? error.message
          : "Saved to favourites."
      );
    };
  }

  // REPORT
  const report = document.querySelector("#report");

  if (report) {
    report.onclick = async () => {

      const u = await user();

      if (!u) {
        location.href = "account.html";
        return;
      }

      const reason = prompt(
        "Why are you reporting this listing?"
      );

      if (!reason) return;

      const {error} = await supabase
        .from("reports")
        .insert({
          reporter_id: u.id,
          product_id: id,
          reason
        });

      alert(
        error
          ? error.message
          : "Report submitted."
      );
    };
  }
}

load();
