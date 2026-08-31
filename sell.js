import { supabase, user } from "./supabase.js";

const form = document.querySelector("#form");
const msg = document.querySelector("#msg");
const photos = document.querySelector("#photos");
const pre = document.querySelector("#previews");
const categorySelect = document.querySelector("#category");
const feeNotice = document.querySelector("#feeNotice");
const publishBtn = document.querySelector("#publishBtn");

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
      label: "CAR / VEHICLE"
    };
  }

  if (
    c.includes("commercial") ||
    c.includes("business") ||
    c.includes("company")
  ) {
    return {
      type: "business",
      fee: LISTING_FEES.business,
      label: "COMMERCIAL / BUSINESS"
    };
  }

  if (
    c.includes("land") ||
    c.includes("house") ||
    c.includes("apartment") ||
    c.includes("flat") ||
    c === "property" ||
    c.endsWith(" property")
  ) {
    return {
      type: "property",
      fee: LISTING_FEES.property,
      label: "LAND / PROPERTY"
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

function updateFeeNotice() {
  const rule = feeForCategory(categorySelect.value);

  if (rule.fee === 0) {
    feeNotice.className = "notice free";
    feeNotice.innerHTML =
      "<b>FREE LISTING:</b> This normal product can be published immediately.";
  } else {
    feeNotice.className = "notice paid";
    feeNotice.innerHTML =
      `<b>${rule.label}:</b> ₦${rule.fee.toLocaleString("en-NG")} listing fee. ` +
      "<b>You will be sent directly to Paystack before the listing is created.</b>";
  }
}

categorySelect.addEventListener("change", updateFeeNotice);

photos.onchange = () => {
  pre.innerHTML = "";

  [...photos.files].slice(0, 8).forEach(file => {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    pre.appendChild(img);
  });
};

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
      file.name.replace(/[^a-zA-Z0-9._-]/g, "");

    const path =
      `${u.id}/${crypto.randomUUID()}-${safeName}`;

    const { error: uploadError } =
      await supabase.storage
        .from("product-images")
        .upload(path, file, {
          upsert: false
        });

    if (uploadError) {
      throw new Error(
        "Image upload failed: " +
        uploadError.message
      );
    }

    const { data: publicData } =
      supabase.storage
        .from("product-images")
        .getPublicUrl(path);

    if (publicData?.publicUrl) {
      imageUrls.push(publicData.publicUrl);
    }
  }

  return imageUrls;
}

form.onsubmit = async e => {
  e.preventDefault();

  const u = await user();

  if (!u) {
    location.href = "account.html";
    return;
  }

  const fd = new FormData(form);

  const title =
    String(fd.get("title") || "").trim();

  const category =
    String(fd.get("category") || "").trim();

  const locationValue =
    String(fd.get("location") || "").trim();

  const phone =
    String(fd.get("phone") || "").trim();

  const description =
    String(fd.get("description") || "").trim();

  const subcategory =
    String(fd.get("subcategory") || "").trim();

  const price =
    Number(fd.get("price"));

  const rule =
    feeForCategory(category);

  if (
    !title ||
    !category ||
    !price ||
    !locationValue ||
    !phone ||
    !description
  ) {
    setMessage(
      "Please complete all required fields."
    );
    return;
  }

  const files =
    [...photos.files].slice(0, 8);

  if (!files.length) {
    setMessage(
      "Please select at least one photo."
    );
    return;
  }

  publishBtn.disabled = true;

  try {
    /*
      IMPORTANT:
      For paid/high-value listings we DO NOT insert
      anything into products before payment.

      We upload the photos first so their URLs can be
      saved after Paystack confirms payment. The listing
      itself does not exist in products until payment succeeds.
    */

    publishBtn.textContent =
      rule.fee > 0
        ? "Preparing Paystack payment…"
        : "Uploading photos…";

    const imageUrls =
      await uploadImages(u);

    if (rule.fee === 0) {
      setMessage(
        "Publishing listing…",
        true
      );

      const payload = {
        seller_id: u.id,
        name: title,
        title,
        category,
        price,
        location: locationValue,
        seller_phone: phone,
        description,
        subcategory,
        image_url: imageUrls[0] || null,
        image_urls: imageUrls,
        status: "active",
        listing_type: "normal",
        listing_fee: 0,
        listing_fee_paid: true
      };

      const {
        error: insertError
      } = await supabase
        .from("products")
        .insert(payload);

      if (insertError) {
        throw new Error(
          insertError.message
        );
      }

      setMessage(
        "Listing published successfully.",
        true
      );

      form.reset();
      pre.innerHTML = "";
      updateFeeNotice();

      publishBtn.disabled = false;
      publishBtn.textContent =
        "Publish listing";

      return;
    }

    /*
      PAID LISTING:
      Send the complete listing data to the Edge
      Function. The Edge Function stores the data in
      listing_payments and sends the seller directly
      to Paystack.

      NO products row is created here.
    */

    setMessage(
      "Opening secure Paystack payment…",
      true
    );

    publishBtn.textContent =
      `Pay ₦${rule.fee.toLocaleString("en-NG")} & Publish`;

    const result =
      await callFunction({
        action: "initialize_listing",
        listing_type: rule.type,
        listing_fee: rule.fee,
        title,
        name: title,
        category,
        subcategory,
        price,
        location: locationValue,
        seller_phone: phone,
        description,
        image_url: imageUrls[0] || null,
        image_urls: imageUrls
      });

    const authorizationUrl =
      result?.data?.authorization_url;

    if (!authorizationUrl) {
      throw new Error(
        "Paystack payment link was not created."
      );
    }

    window.location.href =
      authorizationUrl;

  } catch (error) {
    console.error(
      "Listing submission error:",
      error
    );

    setMessage(
      error?.message ||
      "Could not start the listing payment."
    );

    publishBtn.disabled = false;

    publishBtn.textContent =
      rule.fee > 0
        ? `Pay ₦${rule.fee.toLocaleString("en-NG")} & Publish`
        : "Publish listing";
  }
};

updateFeeNotice();
