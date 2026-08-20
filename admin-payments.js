import { supabase } from "./supabase.js";

const summaryCards=document.querySelector("#summaryCards");
const paymentsRoot=document.querySelector("#paymentsRoot");
const errorBox=document.querySelector("#errorBox");
const paymentCount=document.querySelector("#paymentCount");
const searchInput=document.querySelector("#searchInput");
const statusFilter=document.querySelector("#statusFilter");
const typeFilter=document.querySelector("#typeFilter");
const refreshBtn=document.querySelector("#refreshBtn");
let payments=[];

function money(value){return "₦"+Number(value||0).toLocaleString("en-NG");}
function escapeHtml(value){return String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}
function dateTime(value){if(!value)return "—";const d=new Date(value);if(Number.isNaN(d.getTime()))return "—";return d.toLocaleString("en-NG",{dateStyle:"medium",timeStyle:"short"});}
function showError(message){errorBox.textContent=message;errorBox.style.display="block";}
function hideError(){errorBox.textContent="";errorBox.style.display="none";}
function statusClass(status){const v=String(status||"").toLowerCase();if(v==="successful")return"success";if(v==="pending")return"pending";if(v==="failed")return"failed";return"other";}

function renderSummary(s){
summaryCards.innerHTML=`
<article class="card"><div class="label">Total Transactions</div><div class="value blue">${Number(s.total||0).toLocaleString("en-NG")}</div></article>
<article class="card"><div class="label">Successful</div><div class="value green">${Number(s.successful||0).toLocaleString("en-NG")}</div></article>
<article class="card"><div class="label">Pending</div><div class="value orange">${Number(s.pending||0).toLocaleString("en-NG")}</div></article>
<article class="card"><div class="label">Failed</div><div class="value red">${Number(s.failed||0).toLocaleString("en-NG")}</div></article>
<article class="card"><div class="label">Successful Revenue</div><div class="value green">${money(s.successful_revenue)}</div></article>
<article class="card"><div class="label">Boost Revenue</div><div class="value blue">${money(s.boost_revenue)}</div></article>
<article class="card"><div class="label">Premium Revenue</div><div class="value purple">${money(s.premium_revenue)}</div></article>
<article class="card"><div class="label">Last 30 Days</div><div class="value green">${money(s.last_30_days_revenue)}</div></article>`;
}

function filteredPayments(){
const q=searchInput.value.trim().toLowerCase(), st=statusFilter.value, ty=typeFilter.value;
return payments.filter(p=>{
const ps=String(p.status||"").toLowerCase(), pt=String(p.promotion_type||"").toLowerCase();
if(st!=="all"&&ps!==st)return false;if(ty!=="all"&&pt!==ty)return false;if(!q)return true;
return [p.paystack_reference,p.seller_id,p.seller_name,p.seller_email,p.product_title,p.promotion_type,p.status,p.amount].map(v=>String(v??"").toLowerCase()).join(" ").includes(q);
});}

function renderPayments(){
const list=filteredPayments();paymentCount.textContent=`${list.length.toLocaleString("en-NG")} shown`;
if(!list.length){paymentsRoot.innerHTML=`<div class="empty">No payment transactions match your filters.</div>`;return;}
paymentsRoot.innerHTML=`<div class="table-wrap"><table><thead><tr><th>Date</th><th>Promotion</th><th>Amount</th><th>Status</th><th>Product</th><th>Seller</th><th>Reference</th><th>Expires</th></tr></thead><tbody>
${list.map(p=>`<tr><td>${dateTime(p.created_at)}</td><td><strong>${escapeHtml(p.promotion_type||"Promotion")}</strong></td><td><strong>${money(p.amount)}</strong></td><td><span class="badge ${statusClass(p.status)}">${escapeHtml(p.status||"unknown")}</span></td><td>${escapeHtml(p.product_title||"Product unavailable")}<div class="muted">ID: ${escapeHtml(p.product_id||"—")}</div></td><td>${escapeHtml(p.seller_name||"Seller unavailable")}<div class="muted">${escapeHtml(p.seller_email||"Email unavailable")}</div></td><td><strong>${escapeHtml(p.paystack_reference||"—")}</strong></td><td>${dateTime(p.expires_at)}</td></tr>`).join("")}
</tbody></table></div>`;
}

async function loadPayments(){
hideError();summaryCards.innerHTML="";paymentsRoot.innerHTML=`<div class="loading">Loading payments...</div>`;
const {data:{session},error:sessionError}=await supabase.auth.getSession();
if(sessionError){showError(sessionError.message);return;}
if(!session?.user){window.location.href="account.html";return;}
const {data,error}=await supabase.rpc("admin_payment_management");
if(error){console.error("Payment management error:",error);showError(error.message||"Unable to load payment management.");paymentsRoot.innerHTML="";return;}
if(!data){showError("Payment management returned no data.");paymentsRoot.innerHTML="";return;}
renderSummary(data.summary||{});payments=Array.isArray(data.payments)?data.payments:[];renderPayments();
}

searchInput.addEventListener("input",renderPayments);
statusFilter.addEventListener("change",renderPayments);
typeFilter.addEventListener("change",renderPayments);
refreshBtn.addEventListener("click",async()=>{refreshBtn.disabled=true;refreshBtn.textContent="Loading...";try{await loadPayments();}finally{refreshBtn.disabled=false;refreshBtn.textContent="Refresh";}});
loadPayments();
