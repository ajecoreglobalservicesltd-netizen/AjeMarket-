import { supabase, esc, user } from "./supabase.js";

const root = document.querySelector("#editRoot");
const productId = new URLSearchParams(location.search).get("id");

let currentProduct = null;
let existingImages = [];
let removedExistingImages = new Set();

function getImages(product) {
  const candidates = [
    product.image_urls,
    product.images,
    product.image,
    product.photo_urls,
    product.photos,
    product.image_url
  ];

  const output = [];

  const addValue = (value) => {
    if (!value) return;

    if (Array.isArray(value)) {
      value.forEach(addValue);
      return;
    }

    if (typeof value === "string") {
      const text = value.trim();
      if (!text) return;

      if (text.startsWith("[") && text.endsWith("]")) {
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            parsed.forEach(addValue);
            return;
          }
        } catch {}
      }

      output.push(text);
      return;
    }

    if (typeof value === "object") {
      addValue(value.url || value.publicUrl || value.src);
    }
  };

  candidates.forEach(addValue);
  return [...new Set(output)];
}

function setStatus(text, type = "ok") {
  const box = document.querySelector("#editStatus");
  if (!box) return;
  box.textContent = text;
  box.className = `edit-status show ${type}`;
}

function renderImages() {
  const box = document.querySelector("#existingPhotos");
  if (!box) return;

  const activeImages = existingImages.filter(
    (image) => !removedExistingImages.has(image)
  );

  if (!activeImages.length) {
    box.innerHTML = `
      <div class="empty" style="grid-column:1/-1">
        No photos selected. You can add new photos below.
      </div>
    `;
    return;
  }

  box.innerHTML = activeImages.map((image, index) => `
    <div class="edit-photo">
      <img src="${esc(image)}" alt="Listing photo ${index + 1}" loading="lazy">
      <button
        type="button"
        class="remove-photo"
        data-remove-image="${esc(image)}"
      >Remove</button>
      <div class="cover-label">
        ${index === 0 ? "MAIN PHOTO" : `PHOTO ${index + 1}`}
      </div>
    </div>
  `).join("");

  box.querySelectorAll("[data-remove-image]").forEach((button) => {
    button.onclick = () => {
      removedExistingImages.add(button.dataset.removeImage);
      renderImages();
    };
  });
}

function renderNewPhotos() {
  const input = document.querySelector("#newPhotos");
  const box = document.querySelector("#newPhotoPreview");
  if (!input || !box) return;

  box.innerHTML = "";

  [...input.files].slice(0, 8).forEach((file) => {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.alt = file.name;
    img.style.width = "82px";
    img.style.height = "82px";
    img.style.objectFit = "cover";
    img.style.borderRadius = "9px";
    box.appendChild(img);
  });
}

/*
  Mobile phones often produce very large photos.
  Compressing before upload makes Edit much more reliable on 4G
  and avoids "Failed to fetch" caused by oversized uploads.
*/
async function prepareImage(file) {
  if (!file.type.startsWith("image/")) {
    throw new Error(`${file.name} is not an image.`);
  }

  const bitmap = await createImageBitmap(file);

  const maxSize = 1600;
  const scale = Math.min(
    1,
    maxSize / bitmap.width,
    maxSize / bitmap.height
  );

  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare the image.");

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => result ? resolve(result) : reject(new Error("Could not compress the image.")),
      "image/jpeg",
      0.82
    );
  });

  const base = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]/g, "") || "photo";
  const compressedFile = new File(
    [blob],
    `${base}.jpg`,
    { type: "image/jpeg" }
  );

  return compressedFile;
}

async function loadProduct() {
  const u = await user();

  if (!u) {
    location.href = "account.html";
    return;
  }

  if (!productId) {
    root.innerHTML = `
      <div class="empty">
        <h3>Listing not found</h3>
        <a class="btn" href="dashboard.html">Back to dashboard</a>
      </div>
    `;
    return;
  }

  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("seller_id", u.id)
    .maybeSingle();

  if (error) {
    root.innerHTML = `
      <div class="empty">
        Could not load this listing.<br><br>
        ${esc(error.message)}
      </div>
    `;
    return;
  }

  if (!product) {
    root.innerHTML = `
      <div class="empty">
        <h3>Listing not found</h3>
        <p class="muted">You can only edit listings that belong to your account.</p>
        <a class="btn" href="dashboard.html">Back to dashboard</a>
      </div>
    `;
    return;
  }

  currentProduct = product;
  existingImages = getImages(product);
  removedExistingImages = new Set();

  const sold =
    product.sold === true ||
    product.is_sold === true ||
    product.sold === "true";

  root.innerHTML = `
    ${sold ? `
      <div class="sold-notice">
        This listing is currently marked as SOLD.
        Editing it will not automatically make it available again.
        Use the seller dashboard to mark it as available.
      </div>
    ` : ""}

    <form id="editForm">
      <label>
        Listing title
        <input id="title" type="text" required value="${esc(product.title || product.name || "")}">
      </label>

      <label>
        Price (₦)
        <input id="price" type="number" min="0" required value="${esc(product.price ?? "")}">
      </label>

      <label>
        Category
        <select id="category">
          ${[
            "Electronics","Fashion","Home & Household","Toys & Kids",
            "Appliances","Phones & Tablets","Computers","Furniture",
            "Construction","Cars","Land","Houses","Apartments",
            "Commercial Property","Services","Other"
          ].map((category) => `
            <option value="${esc(category)}"
              ${String(product.category || "") === category ? "selected" : ""}>
              ${esc(category)}
            </option>
          `).join("")}
        </select>
      </label>

      <label>
        Location
        <input id="location" type="text" required value="${esc(product.location || "")}">
      </label>

      <label>
        Seller phone/WhatsApp
        <input id="phone" type="tel" value="${esc(product.seller_phone || "")}">
      </label>

      <label>
        Description
        <textarea id="description" required>${esc(product.description || "")}</textarea>
      </label>

      <div style="margin-top:20px">
        <h3>Current photos</h3>
        <p class="muted">
          These photos are already saved on this listing. Remove only the ones you no longer want.
        </p>
        <div id="existingPhotos" class="edit-gallery"></div>
      </div>

      <div style="margin-top:22px">
        <h3>Add more photos</h3>
        <p class="muted">
          New photos will be added to the existing ones. A maximum of 8 total photos is kept.
        </p>

        <input id="newPhotos" type="file" accept="image/*" multiple>

        <div id="newPhotoPreview"
          style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"></div>
      </div>

      <div id="editStatus" class="edit-status"></div>

      <div class="edit-actions">
        <button class="btn" id="saveButton" type="submit">Save changes</button>
        <a class="btn secondary" href="dashboard.html">Cancel</a>
      </div>
    </form>
  `;

  renderImages();

  document.querySelector("#newPhotos").onchange = () => {
    const files = [...document.querySelector("#newPhotos").files];
    if (files.length > 8) {
      setStatus("You can select a maximum of 8 new photos.", "err");
      document.querySelector("#newPhotos").value = "";
      return;
    }
    renderNewPhotos();
  };

  document.querySelector("#editForm").onsubmit = async (event) => {
    event.preventDefault();
    await saveChanges(u);
  };
}

async function uploadNewPhotos(u, files) {
  const urls = [];

  for (let i = 0; i < files.length; i++) {
    const original = files[i];
    setStatus(`Preparing photo ${i + 1} of ${files.length}…`, "ok");

    const file = await prepareImage(original);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "") || "photo";
    const path = `${u.id}/${crypto.randomUUID()}-${safeName}`;

    setStatus(`Uploading photo ${i + 1} of ${files.length}…`, "ok");

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, file, {
        upsert: false,
        contentType: "image/jpeg",
        cacheControl: "3600"
      });

    if (uploadError) {
      throw new Error(
        `Photo ${i + 1} could not upload: ${uploadError.message}`
      );
    }

    const { data: publicData } = supabase.storage
      .from("product-images")
      .getPublicUrl(path);

    if (!publicData?.publicUrl) {
      throw new Error(`Photo ${i + 1} uploaded but its public URL could not be created.`);
    }

    urls.push(publicData.publicUrl);
  }

  return urls;
}

async function saveChanges(u) {
  const button = document.querySelector("#saveButton");
  const newPhotosInput = document.querySelector("#newPhotos");

  const title = document.querySelector("#title").value.trim();
  const price = Number(document.querySelector("#price").value);
  const category = document.querySelector("#category").value.trim();
  const location = document.querySelector("#location").value.trim();
  const phone = document.querySelector("#phone").value.trim();
  const description = document.querySelector("#description").value.trim();

  if (!title || !category || !location || !description ||
      !Number.isFinite(price) || price < 0) {
    setStatus("Please complete all required fields correctly.", "err");
    return;
  }

  const remainingImages = existingImages.filter(
    (image) => !removedExistingImages.has(image)
  );

  const newFiles = [...(newPhotosInput?.files || [])].slice(0, 8);

  if (remainingImages.length + newFiles.length > 8) {
    setStatus(
      `You can keep a maximum of 8 photos. You currently have ${remainingImages.length} existing photos, so add no more than ${8 - remainingImages.length}.`,
      "err"
    );
    return;
  }

  button.disabled = true;
  button.textContent = "Saving…";

  try {
    const newUrls = await uploadNewPhotos(u, newFiles);
    const finalImages = [...remainingImages, ...newUrls].slice(0, 8);

    setStatus("Updating listing…", "ok");

    const payload = {
      title,
      name: title,
      category,
      price,
      location,
      seller_phone: phone,
      description,
      image_url: finalImages[0] || null,
      image_urls: finalImages
    };

    const { data, error } = await supabase
      .from("products")
      .update(payload)
      .eq("id", currentProduct.id)
      .eq("seller_id", u.id)
      .select("*")
      .single();

    if (error) throw error;
    if (!data) throw new Error("The listing could not be updated.");

    currentProduct = data;
    existingImages = getImages(data);
    removedExistingImages = new Set();

    newPhotosInput.value = "";
    renderImages();
    renderNewPhotos();

    setStatus("Listing updated successfully. Your changes are now live.", "ok");
    window.scrollTo({ top: 0, behavior: "smooth" });

  } catch (error) {
    console.error("Edit listing error:", error);
    setStatus(error?.message || "Could not save the listing.", "err");
  } finally {
    button.disabled = false;
    button.textContent = "Save changes";
  }
}

loadProduct();
