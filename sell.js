import { supabase, user } from "./supabase.js";
import { CATEGORY_NAMES } from "./categories.js";

const form = document.querySelector("#form");
const msg = document.querySelector("#msg");
const photos = document.querySelector("#photos");
const pre = document.querySelector("#previews");
const categorySelect = document.querySelector("#category");
const feeNotice = document.querySelector("#feeNotice");
const publishBtn = document.querySelector("#publishBtn");
const accountPill = document.querySelector("#accountPill");

const FUNCTION_URL =
  "https://zeyoecwbndiocsaqlnuk.supabase.co/functions/v1/swift-handler";

const LISTING_FEES = {
  vehicle: 5000,
  property: 10000,
  business: 15000,
  normal: 0
};

function feeForCategory(category) {
  const c = String(category || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .trim();

  if (
    c.includes("car") ||
    c.includes("vehicle") ||
    c.includes("automobile")
  ) {
    return {
      type: "vehicle",
      fee: LISTING_FEES.vehicle,
      label: "CARS / VEHICLES"
    };
  }

  if (c.includes("commercial")) {
    return {
      type: "business",
      fee: LISTING_FEES.business,
      label: "COMMERCIAL / BUSINESS"
    };
  }

  if (c.includes("business") || c.includes("company")) {
    return {
      type: "business",
      fee: LISTING_FEES.business,
      label: "COMMERCIAL / BUSINESS"
    };
  }

  if (
    c.includes("land") ||
    c.includes("property") ||
    c.includes("house") ||
    c.includes("apartment") ||
    c.includes("flat")
  ) {
    return {
      type: "property",
      fee: LISTING_FEES.property,
      label: c.includes("house") || c.includes("apartment") || c.includes("flat")
        ? "HOUSES / APARTMENTS"
        : "LAND / PROPERTY"
    };
  }

  return {
    type: "normal",
    fee: 0,
    label: "NORMAL PRODUCT"
  };
}

function setMessage(text, ok = false) {
  msg.textContent = text;
  msg.className = `status ${ok ? "ok" : "err"}`;
}

function populateCategories() {
  categorySelect.innerHTML = `
    <option value="" selected disabled>Select a category</option>
    ${CATEGORY_NAMES.map(
      category =>
        `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`
    ).join("")}
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function updateFeeNotice() {
  const rule = feeForCategory(categorySelect.value);

  if (rule.fee === 0) {
    feeNotice.className = "notice fee-notice free";
    feeNotice.innerHTML =
      "<b>FREE LISTING:</b> This normal product can be published immediately.";
    publishBtn.textContent = "Publish listing";
    return;
  }

  feeNotice.className = "notice fee-notice high-value";
  feeNotice.innerHTML =
    `<b>🔒 HIGH-VALUE LISTING:</b> ${rule.label} requires a ` +
    `<b>₦${rule.fee.toLocaleString("en-NG")}</b> listing fee. ` +
    "Paystack payment will open when you publish. " +
    "The product will only be created after payment is confirmed.";

  publishBtn.textContent =
    `Pay ₦${rule.fee.toLocaleString("en-NG")} & Publish`;
}

async function requireSignedInUser() {
  const u = await user();

  if (!u) {
    accountPill.textContent = "Not signed in";
    setMessage("Please sign in to your existing AjeMarket account from Account.");
    setTimeout(() => {
      location.href = "account.html";
    }, 700);
    return null;
  }

  accountPill.textContent =
    u.email ? `Signed in: ${u.email}` : "Signed in";
  return u;
}

async function callFunction(body) {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Your AjeMarket session has expired. Please sign in again.");
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
      result?.error ||
      result?.message ||
      "Payment request failed."
    );
  }

  return result;
}

async function uploadImages(u) {
  const files = [...photos.files].slice(0, 8);
  const imageUrls = [];

  for (const file of files) {
    const safeName =
      file.name.replace(/[^a-zA-Z0-9._-]/g, "") || "photo.jpg";

    const path =
      `${u.id}/listing-${crypto.randomUUID()}-${safeName}`;

    const { error: uploadError } = await supabase
      .storage
      .from("product-images")
      .upload(path, file, { upsert: false });

    if (uploadError) {
      throw new Error("Image upload failed: " + uploadError.message);
    }

    const { data: publicData } = supabase
      .storage
      .from("product-images")
      .getPublicUrl(path);

    if (publicData?.publicUrl) {
      imageUrls.push(publicData.publicUrl);
    }
  }

  return imageUrls;
}

categorySelect.addEventListener("change", updateFeeNotice);

photos.onchange = () => {
  pre.innerHTML = "";

  [...photos.files].slice(0, 8).forEach(file => {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.alt = "Selected product photo";
    pre.appendChild(img);
  });
};

form.onsubmit = async e => {
  e.preventDefault();

  const u = await requireSignedInUser();
  if (!u) return;

  const fd = new FormData(form);

  const title = String(fd.get("title") || "").trim();
  const category = String(fd.get("category") || "").trim();
  const price = Number(fd.get("price"));
  const locationValue = String(fd.get("location") || "").trim();
  const phone = String(fd.get("phone") || "").trim();
  const subcat = String(fd.get("subcat") || "").trim();
  const description = String(fd.get("description") || "").trim();

  const rule = feeForCategory(category);
  const files = [...photos.files].slice(0, 8);

  if (!title || !category || !Number.isFinite(price) || price <= 0 ||
      !locationValue || !phone || !description) {
    setMessage("Please complete all required fields.");
    return;
  }

  if (!files.length) {
    setMessage("Please select at least one photo.");
    return;
  }

  publishBtn.disabled = true;
  publishBtn.textContent =
    rule.fee > 0
      ? `Preparing ₦${rule.fee.toLocaleString("en-NG")} payment…`
      : "Uploading photos…";

  try {
    const imageUrls = await uploadImages(u);

    if (!imageUrls.length) {
      throw new Error("At least one product photo is required.");
    }

    if (rule.fee === 0) {
      const payload = {
        seller_id: u.id,
        name: title,
        title,
        category,
        price,
        location: locationValue,
        seller_phone: phone,
        subcategory: subcat || null,
        description,
        image_url: imageUrls[0],
        image_urls: imageUrls,
        status: "active",
        listing_type: "normal",
        listing_fee: 0,
        listing_fee_paid: true
      };

      const { error } = await supabase
        .from("products")
        .insert(payload);

      if (error) {
        throw new Error(error.message);
      }

      setMessage("Listing published successfully.", true);
      form.reset();
      pre.innerHTML = "";
      updateFeeNotice();
      publishBtn.disabled = false;
      publishBtn.textContent = "Publish listing";
      return;
    }

    setMessage(
      `🔒 ${rule.label} selected. Your listing is not created yet. Opening Paystack…`,
      true
    );

    const result = await callFunction({
      action: "initialize_listing",
      title,
      name: title,
      category,
      price,
      location: locationValue,
      seller_phone: phone,
      subcategory: subcat || null,
      description,
      image_url: imageUrls[0],
      image_urls: imageUrls,
      listing_type: rule.type
    });

    const authorizationUrl = result?.data?.authorization_url;

    if (!authorizationUrl) {
      throw new Error("Paystack payment link was not created.");
    }

    window.location.href = authorizationUrl;
  } catch (error) {
    console.error("AjeMarket listing error:", error);
    setMessage(error?.message || "Could not publish this listing.");
    publishBtn.disabled = false;
    publishBtn.textContent =
      rule.fee > 0
        ? `Pay ₦${rule.fee.toLocaleString("en-NG")} & Publish`
        : "Publish listing";
  }
};

populateCategories();
updateFeeNotice();
requireSignedInUser();
