import { supabase, user } from "./supabase.js";

const form = document.querySelector("#form");
const msg = document.querySelector("#msg");
const photos = document.querySelector("#photos");
const pre = document.querySelector("#previews");

if (!form) {
  console.error("AjeMarket: #form was not found.");
}

if (photos) {
  photos.onchange = () => {
    if (!pre) return;

    pre.innerHTML = "";

    [...photos.files].slice(0, 8).forEach(file => {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.alt = file.name;
      pre.appendChild(img);
    });
  };
}

if (form) {
  form.onsubmit = async (e) => {
    e.preventDefault();

    try {
      if (msg) msg.textContent = "Checking account…";

      const u = await user();

      if (!u) {
        location.href = "account.html";
        return;
      }

      const fd = new FormData(form);

      const title = String(fd.get("title") || "").trim();
      const category = String(fd.get("category") || "").trim();
      const locationValue = String(fd.get("location") || "").trim();
      const phone = String(fd.get("phone") || "").trim();
      const description = String(fd.get("description") || "").trim();
      const price = Number(fd.get("price"));

      if (!title) {
        msg.textContent = "Please enter a product title.";
        return;
      }

      if (!category) {
        msg.textContent = "Please select a category.";
        return;
      }

      if (!price || price <= 0) {
        msg.textContent = "Please enter a valid price.";
        return;
      }

      if (!locationValue) {
        msg.textContent = "Please enter the product location.";
        return;
      }

      if (!phone) {
        msg.textContent = "Please enter your phone/WhatsApp number.";
        return;
      }

      const button = form.querySelector("button[type='submit']");

      if (button) {
        button.disabled = true;
        button.textContent = "Publishing…";
      }

      if (msg) msg.textContent = "Uploading photos…";

      const files = photos
        ? [...photos.files].slice(0, 8)
        : [];

      const imageUrls = [];

      for (const file of files) {
        const safeName =
          file.name.replace(/[^a-zA-Z0-9._-]/g, "") ||
          "photo";

        const path =
          `${u.id}/${crypto.randomUUID()}-${safeName}`;

        const { error: uploadError } = await supabase
          .storage
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

      if (msg) msg.textContent = "Publishing listing…";

      const payload = {
        seller_id: u.id,
        name: title,
        title: title,
        category: category,
        price: price,
        location: locationValue,
        seller_phone: phone,
        description: description,
        image_url: imageUrls[0] || null,
        status: "active"
      };

      console.log("AjeMarket listing payload:", payload);

      const { data, error } = await supabase
        .from("products")
        .insert(payload)
        .select()
        .single();

      if (error) {
        throw new Error(
          "Listing failed: " + error.message
        );
      }

      console.log("AjeMarket listing created:", data);

      if (msg) {
        msg.textContent =
          "Listing published successfully!";
      }

      form.reset();

      if (pre) {
        pre.innerHTML = "";
      }

      if (button) {
        button.disabled = false;
        button.textContent = "Publish listing";
      }

    } catch (error) {
      console.error("AjeMarket publish error:", error);

      if (msg) {
        msg.textContent =
          error?.message ||
          "Something went wrong. Please try again.";
      }

      const button =
        form.querySelector("button[type='submit']");

      if (button) {
        button.disabled = false;
        button.textContent = "Publish listing";
      }
    }
  };
}
