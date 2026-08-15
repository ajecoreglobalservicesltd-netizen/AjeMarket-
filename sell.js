import { supabase, user } from "./supabase.js";

const form = document.querySelector("#form");
const msg = document.querySelector("#msg");
const photos = document.querySelector("#photos");
const pre = document.querySelector("#previews");

photos.onchange = () => {
  pre.innerHTML = "";

  [...photos.files].slice(0, 8).forEach(file => {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    pre.appendChild(img);
  });
};

form.onsubmit = async e => {
  e.preventDefault();

  const u = await user();

  if (!u) {
    location.href = "account.html";
    return;
  }

  const fd = new FormData(form);

  const title = String(fd.get("title") || "").trim();
  const category = String(fd.get("category") || "").trim();
  const location = String(fd.get("location") || "").trim();
  const phone = String(fd.get("phone") || "").trim();
  const description = String(fd.get("description") || "").trim();
  const price = Number(fd.get("price"));

  if (!title || !category || !price || !location || !phone) {
    msg.textContent = "Please complete all required fields.";
    return;
  }

  const files = [...photos.files].slice(0, 8);

  if (!files.length) {
    msg.textContent = "Please select at least one photo.";
    return;
  }

  msg.textContent = "Uploading photos…";

  const imageUrls = [];

  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "");

    const path =
      `${u.id}/${crypto.randomUUID()}-${safeName}`;

    const { error: uploadError } = await supabase
      .storage
      .from("product-images")
      .upload(path, file, {
        upsert: false
      });

    if (uploadError) {
      msg.textContent =
        "Image upload failed: " + uploadError.message;
      return;
    }

    const { data: publicData } = supabase
      .storage
      .from("product-images")
      .getPublicUrl(path);

    if (publicData?.publicUrl) {
      imageUrls.push(publicData.publicUrl);
    }
  }

  msg.textContent = "Publishing listing…";

  const payload = {
    seller_id: u.id,
    name: title,
    title: title,
    category,
    price,
    location,
    seller_phone: phone,
    description,

    // First photo remains the main/cover photo
    image_url: imageUrls[0] || null,

    // All photos are saved here
    image_urls: imageUrls,

    status: "active"
  };

  const { error } = await supabase
    .from("products")
    .insert(payload);

  if (error) {
    msg.textContent = error.message;
    return;
  }

  msg.textContent = "Listing published successfully.";

  form.reset();
  pre.innerHTML = "";
};
