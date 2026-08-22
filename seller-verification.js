import { supabase, esc, user } from "./supabase.js";

const statusCard = document.querySelector("#statusCard");
const form = document.querySelector("#verifyForm");
const formStatus = document.querySelector("#formStatus");
const submitBtn = document.querySelector("#submitBtn");
const sellerType = document.querySelector("#sellerType");
const fullName = document.querySelector("#fullName");
const phone = document.querySelector("#phone");
const businessName = document.querySelector("#businessName");
const businessRegistration = document.querySelector("#businessRegistration");
const idType = document.querySelector("#idType");
const idNumber = document.querySelector("#idNumber");
const documentInput = document.querySelector("#document");
const sellerNote = document.querySelector("#sellerNote");

function setStatus(message, type = "ok") {
  formStatus.textContent = message;
  formStatus.className = `status show ${type}`;
}

function statusMarkup(row) {
  if (!row) return `<b>Not verified</b><div class="muted" style="margin-top:6px">Complete the form below to become a Trusted Seller.</div>`;
  const status = String(row.status || "pending").toLowerCase();
  if (status === "approved") return `<span class="trust-badge">✓ Trusted Seller</span><div class="muted" style="margin-top:8px">Your seller verification has been approved.</div>`;
  if (status === "rejected") return `<span class="trust-badge rejected-badge">Verification rejected</span><div class="muted" style="margin-top:8px">${esc(row.admin_note || "You can submit a new verification request below.")}</div>`;
  return `<span class="trust-badge pending-badge">Under review</span><div class="muted" style="margin-top:8px">Your verification request is currently being reviewed.</div>`;
}

async function load() {
  const u = await user();
  if (!u) {
    location.href = "account.html";
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name,phone,verification_status,is_verified_seller")
    .eq("id", u.id)
    .maybeSingle();

  const { data: rows, error } = await supabase
    .from("seller_verifications")
    .select("id,status,admin_note,created_at,full_name,phone,business_name,id_type")
    .eq("seller_id", u.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error && !String(error.message || "").toLowerCase().includes("permission")) {
    statusCard.innerHTML = `<b>Verification status unavailable</b><div class="muted" style="margin-top:6px">${esc(error.message)}</div>`;
  } else {
    const latest = rows?.[0] || null;
    statusCard.innerHTML = profile?.is_verified_seller
      ? `<span class="trust-badge">✓ Trusted Seller</span><div class="muted" style="margin-top:8px">Your account is verified.</div>`
      : statusMarkup(latest);

    fullName.value = profile?.full_name || u.user_metadata?.full_name || "";
    phone.value = profile?.phone || u.user_metadata?.phone || "";

    if (latest?.status === "pending") {
      form.style.display = "none";
      setStatus("Your verification request is already under review.", "ok");
    }
  }

  return u;
}

sellerType.addEventListener("change", () => {
  businessName.required = sellerType.value === "business";
});

form.addEventListener("submit", async event => {
  event.preventDefault();
  setStatus("", "ok");
  formStatus.className = "status";

  const u = await user();
  if (!u) {
    location.href = "account.html";
    return;
  }

  const file = documentInput.files?.[0];
  if (!file) return setStatus("Please select your verification document.", "err");
  if (file.size > 5 * 1024 * 1024) return setStatus("Document must be 5 MB or smaller.", "err");

  if (sellerType.value === "business" && !businessName.value.trim()) {
    return setStatus("Business name is required for a business seller.", "err");
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting…";

  try {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${u.id}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("seller-verification-documents")
      .upload(path, file, { upsert: false, contentType: file.type || undefined });

    if (uploadError) throw uploadError;

    const { data, error } = await supabase.rpc("submit_seller_verification", {
      p_seller_type: sellerType.value,
      p_full_name: fullName.value.trim(),
      p_phone: phone.value.trim(),
      p_business_name: businessName.value.trim() || null,
      p_business_registration: businessRegistration.value.trim() || null,
      p_id_type: idType.value,
      p_id_number: idNumber.value.trim(),
      p_document_path: path,
      p_seller_note: sellerNote.value.trim() || null
    });

    if (error) {
      await supabase.storage.from("seller-verification-documents").remove([path]).catch(() => {});
      throw error;
    }

    if (!data?.success) throw new Error("Verification request was not created.");

    setStatus("Verification submitted successfully. AjeMarket will review your request.", "ok");
    form.reset();
    form.style.display = "none";
    await load();
  } catch (error) {
    console.error(error);
    setStatus(error?.message || "Could not submit verification.", "err");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit for verification";
  }
});

load();
