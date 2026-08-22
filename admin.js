import { supabase } from "./supabase.js";

const $ = s => document.querySelector(s);
const dashboardContent = $("#dashboardContent");
const errorBox = $("#errorBox");
const noticeBox = $("#noticeBox");
const lastUpdated = $("#lastUpdated");
const refreshBtn = $("#refreshBtn");
const logoutBtn = $("#logoutBtn");
const notificationBtn = $("#notificationBtn");
const notificationBadge = $("#notificationBadge");
const notificationPanel = $("#notificationPanel");
const notificationList = $("#notificationList");
const markAllReadBtn = $("#markAllReadBtn");
const closeNotificationsBtn = $("#closeNotificationsBtn");
const reportsList = $("#reportsList");
const reportCount = $("#reportCount");
const reportStatusFilter = $("#reportStatusFilter");
const loadReportsBtn = $("#loadReportsBtn");

function esc(v) {
  return String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
function money(v){return "₦"+Number(v||0).toLocaleString("en-NG")}
function num(v){return Number(v||0).toLocaleString("en-NG")}
function dt(v){if(!v)return "";const d=new Date(v);return Number.isNaN(d.getTime())?"":d.toLocaleString("en-NG",{dateStyle:"medium",timeStyle:"short"})}
function err(m){errorBox.textContent=m;errorBox.style.display="block"}
function clearErr(){errorBox.style.display="none";errorBox.textContent=""}
function notice(m){noticeBox.textContent=m;noticeBox.style.display="block";setTimeout(()=>noticeBox.style.display="none",3500)}

async function session(){
  const {data,error}=await supabase.auth.getSession();
  if(error)throw error;
  if(!data?.session?.user){location.href="account.html";return null}
  return data.session;
}

async function loadAdmin(){
  clearErr();
  const s=await session();
  if(!s)return;
  dashboardContent.innerHTML='<div class="loading">Loading AjeMarket statistics...</div>';
  const {data,error}=await supabase.rpc("admin_dashboard_overview");
  if(error){dashboardContent.innerHTML="";err(error.message||"Unable to load administrator dashboard.");return}
  renderDashboard(data||{});
}

function renderDashboard(data){
  const u=data.users||{},m=data.marketplace||{},p=data.payments||{},msg=data.messaging||{};
  const ru=Array.isArray(data.recent_users)?data.recent_users:[];
  const rp=Array.isArray(data.recent_products)?data.recent_products:[];
  const rpay=Array.isArray(data.recent_payments)?data.recent_payments:[];

  dashboardContent.innerHTML=`
<section class="cards">
<article class="stat"><div class="stat-icon">👥</div><div class="stat-label">Total Users</div><div class="stat-value blue">${num(u.total)}</div><div class="stat-note">Registered AjeMarket accounts</div></article>
<article class="stat"><div class="stat-icon">🏪</div><div class="stat-label">Sellers</div><div class="stat-value green">${num(m.total_sellers)}</div><div class="stat-note">Users with listings</div></article>
<article class="stat"><div class="stat-icon">📦</div><div class="stat-label">Total Listings</div><div class="stat-value purple">${num(m.total_products)}</div><div class="stat-note">Products in marketplace</div></article>
<article class="stat"><div class="stat-icon">🟢</div><div class="stat-label">Active Listings</div><div class="stat-value green">${num(m.active_products)}</div><div class="stat-note">Currently active</div></article>
<article class="stat"><div class="stat-icon">🏢</div><div class="stat-label">Business Accounts</div><div class="stat-value blue">${num(u.businesses)}</div><div class="stat-note">Business profiles</div></article>
<article class="stat"><div class="stat-icon">🚀</div><div class="stat-label">Boosted</div><div class="stat-value orange">${num(m.boosted_products)}</div><div class="stat-note">Active boosts</div></article>
<article class="stat"><div class="stat-icon">👑</div><div class="stat-label">Premium</div><div class="stat-value purple">${num(m.premium_products)}</div><div class="stat-note">Active premium listings</div></article>
<article class="stat"><div class="stat-icon">💰</div><div class="stat-label">Platform Revenue</div><div class="stat-value green">${money(p.successful_revenue)}</div><div class="stat-note">Successful promotion payments</div></article>
</section>
<section class="grid-2">
<article class="panel"><div class="panel-head">👥 User Growth</div><div class="panel-body"><div class="mini-grid"><div class="mini"><div class="mini-label">New users — 7 days</div><div class="mini-value blue">${num(u.new_7_days)}</div></div><div class="mini"><div class="mini-label">New users — 30 days</div><div class="mini-value green">${num(u.new_30_days)}</div></div></div></div></article>
<article class="panel"><div class="panel-head">💳 Payment Overview</div><div class="panel-body"><div class="mini-grid"><div class="mini"><div class="mini-label">Successful</div><div class="mini-value green">${num(p.successful_count)}</div></div><div class="mini"><div class="mini-label">Pending</div><div class="mini-value orange">${num(p.pending_count)}</div></div><div class="mini"><div class="mini-label">Boost revenue</div><div class="mini-value">${money(p.boost_revenue)}</div></div><div class="mini"><div class="mini-label">Premium revenue</div><div class="mini-value purple">${money(p.premium_revenue)}</div></div><div class="mini"><div class="mini-label">Last 30 days</div><div class="mini-value green">${money(p.last_30_days_revenue)}</div></div></div></div></article>
<article class="panel"><div class="panel-head">💬 Messaging</div><div class="panel-body"><div class="mini-grid"><div class="mini"><div class="mini-label">Conversations</div><div class="mini-value blue">${num(msg.conversations)}</div></div><div class="mini"><div class="mini-label">Messages</div><div class="mini-value">${num(msg.messages)}</div></div><div class="mini"><div class="mini-label">Unread</div><div class="mini-value orange">${num(msg.unread_messages)}</div></div></div></div></article>
<article class="panel"><div class="panel-head">📊 Marketplace Activity</div><div class="panel-body"><div class="mini-grid"><div class="mini"><div class="mini-label">Sellers</div><div class="mini-value green">${num(m.total_sellers)}</div></div><div class="mini"><div class="mini-label">Active listings</div><div class="mini-value blue">${num(m.active_products)}</div></div><div class="mini"><div class="mini-label">Boosted</div><div class="mini-value orange">${num(m.boosted_products)}</div></div><div class="mini"><div class="mini-label">Premium</div><div class="mini-value purple">${num(m.premium_products)}</div></div></div></div></article>
</section>
<section class="section"><div class="section-head"><h2>Recent Users</h2><span>Latest registered accounts</span></div><div class="panel">${ru.length?ru.map(x=>`<div class="activity-row"><div><div class="activity-title">${esc(x.email||"No email")}</div><div class="activity-meta">User ID: ${esc(x.id||"")}<br>Registered: ${dt(x.created_at)}</div></div><span class="badge">User</span></div>`).join(""):'<div class="empty">No registered users found.</div>'}</div></section>
<section class="section"><div class="section-head"><h2>Recent Listings</h2><span>Latest products posted</span></div><div class="panel">${rp.length?rp.map(x=>`<div class="activity-row"><div><div class="activity-title">${esc(x.title||x.name||"Untitled listing")}</div><div class="activity-meta">Price: ${money(x.price)}<br>Seller: ${esc(x.seller_id||"")}<br>Created: ${dt(x.created_at)}</div></div><div><span class="badge ${x.status==="active"?"active":""}">${esc(x.status||"unknown")}</span><br><span class="badge">${esc(x.promotion_type||"ordinary")}</span></div></div>`).join(""):'<div class="empty">No listings found.</div>'}</div></section>
<section class="section"><div class="section-head"><h2>Recent Payments</h2><span>Paystack promotion transactions</span></div><div class="panel">${rpay.length?rpay.map(x=>`<div class="activity-row"><div><div class="activity-title">${esc(x.promotion_type||"Promotion")} payment — ${money(x.amount)}</div><div class="activity-meta">Seller: ${esc(x.seller_id||"")}<br>Reference: ${esc(x.paystack_reference||"")}<br>Date: ${dt(x.created_at)}</div></div><span class="badge ${x.status==="successful"?"success":"pending"}">${esc(x.status||"unknown")}</span></div>`).join(""):'<div class="empty">No promotion payments found.</div>'}</div></section>`;
  lastUpdated.textContent=`Last updated: ${new Date().toLocaleString("en-NG")}`;
}

function val(r,keys,fb=""){for(const k of keys)if(r?.[k]!==undefined&&r?.[k]!==null&&r?.[k]!=="")return r[k];return fb}
function reportsArray(d){if(Array.isArray(d))return d;if(Array.isArray(d?.recent))return d.recent;if(Array.isArray(d?.reports))return d.reports;if(Array.isArray(d?.items))return d.items;if(Array.isArray(d?.data))return d.data;return []}
function cls(s){s=String(s||"").toLowerCase();return s==="resolved"?"success":(s==="dismissed"||s==="rejected")?"danger":(s==="reviewing"||s==="in_review")?"active":"pending"}

async function loadReports(){
  reportsList.innerHTML='<div class="loading">Loading reports...</div>';
  const s=await session();if(!s)return;
  const {data,error}=await supabase.rpc("admin_reports_overview");
  if(error){reportsList.innerHTML="";reportCount.textContent="!";err(error.message||"Unable to load reports.");return}
  clearErr();
  renderReports(reportsArray(data));
}

function renderReports(all){
  const f=reportStatusFilter.value;
  const rs=f==="all"?all:all.filter(r=>String(val(r,["status"],"")).toLowerCase()===f);
  reportCount.textContent=num(rs.length);
  if(!rs.length){reportsList.innerHTML=`<div class="empty">No ${f==="all"?"":f+" "}reports found.</div>`;return}

  reportsList.innerHTML=rs.map(r=>{
    const id=val(r,["id","report_id"]);
    const type=val(r,["report_type","type"],"Report");
    const reason=val(r,["reason","report_reason"],"No reason supplied");
    const status=val(r,["status"],"pending");
    const reporter=val(r,["reporter_email","reporter_name","reporter_id","user_id"],"Unknown");
    const listing=val(r,["listing_title","product_title","title"],"");
    const target=val(r,["reported_user_email","reported_user_name","reported_user_id","target_user_id"],"");
    const created=val(r,["created_at","reported_at"],"");
    const note=val(r,["admin_note","moderator_note","resolution_note"],"");
    const details=val(r,["details","description"],"");

    return `<div class="report-row"><div><div class="activity-title">Report #${esc(id)} — ${esc(type)}</div><div class="report-reason"><strong>Reason:</strong> ${esc(reason)}</div>${details?`<div class="report-reason"><strong>Details:</strong> ${esc(details)}</div>`:""}<div class="activity-meta">${listing?`Listing: ${esc(listing)}<br>`:""}${target?`Reported user: ${esc(target)}<br>`:""}Reporter: ${esc(reporter)}<br>Status: ${esc(status)}<br>Created: ${dt(created)}${note?`<br>Admin note: ${esc(note)}`:""}</div></div><div class="report-actions"><span class="badge ${cls(status)}">${esc(status)}</span><select class="action-select report-status" data-id="${esc(id)}"><option value="">Change status…</option><option value="pending">Pending</option><option value="reviewing">Reviewing</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option></select><input class="action-select report-note" data-id="${esc(id)}" placeholder="Admin note (optional)"><button class="btn small primary update-report" data-id="${esc(id)}">Update report</button></div></div>`;
  }).join("");

  reportsList.querySelectorAll(".update-report").forEach(b=>b.addEventListener("click",async()=>{
    const row=b.closest(".report-row"),id=b.dataset.id,status=row.querySelector(".report-status").value,note=row.querySelector(".report-note").value.trim();
    if(!id||!status){err(!id?"This report has no report ID.":"Choose a new report status first.");return}
    b.disabled=true;b.textContent="Updating...";
    try{
      const {error}=await supabase.rpc("admin_update_report",{p_report_id:id,p_status:status,p_admin_note:note});
      if(error)throw error;
      clearErr();notice(`Report #${id} updated successfully.`);await loadReports();
    }catch(e){err(e.message||"Could not update this report.")}
    finally{b.disabled=false;b.textContent="Update report"}
  }));
}

function notificationTitle(n){return n.title||n.type||"AjeMarket notification"}
function notificationBody(n){return n.message||n.body||n.details||n.reason||""}
async function loadNotifications(){
  try{
    const s=await session(); if(!s)return;
    const {data,error}=await supabase.from("admin_notifications").select("*").order("created_at",{ascending:false}).limit(100);
    if(error){notificationList.innerHTML=`<div class="empty">Could not load notifications.<br><br>${esc(error.message)}</div>`; notificationBadge.style.display="none"; return;}
    const rows=Array.isArray(data)?data:[];
    const unread=rows.filter(n=>n.is_read!==true).length;
    notificationBadge.textContent=unread>99?"99+":String(unread);
    notificationBadge.style.display=unread?"flex":"none";
    if(!rows.length){notificationList.innerHTML='<div class="empty">No notifications yet.</div>';return;}
    notificationList.innerHTML=rows.map(n=>`<div class="notification-item ${n.is_read?"":"unread"}" data-id="${esc(n.id)}"><div><div class="notification-title">${esc(notificationTitle(n))}</div><div class="notification-body">${esc(notificationBody(n))}</div></div><div class="notification-time">${dt(n.created_at)}${n.is_read?"":"<br><span class='badge pending'>NEW</span>"}</div></div>`).join("");
    notificationList.querySelectorAll(".notification-item").forEach(item=>item.addEventListener("click",async()=>{
      const {error}=await supabase.from("admin_notifications").update({is_read:true}).eq("id",item.dataset.id);
      if(error){err(error.message);return;} await loadNotifications();
    }));
  }catch(e){notificationList.innerHTML=`<div class="empty">Could not load notifications.<br><br>${esc(e.message||e)}</div>`;}
}
async function markAllNotificationsRead(){
  markAllReadBtn.disabled=true;
  try{
    const {error}=await supabase.from("admin_notifications").update({is_read:true}).eq("is_read",false);
    if(error)throw error;
    await loadNotifications();
  }catch(e){err(e.message||"Unable to mark notifications as read.");}
  finally{markAllReadBtn.disabled=false;}
}

refreshBtn.addEventListener("click",async()=>{
  refreshBtn.disabled=true;refreshBtn.textContent="Loading...";
  try{await loadAdmin();await loadReports();await loadNotifications()}finally{refreshBtn.disabled=false;refreshBtn.textContent="Refresh"}
});
loadReportsBtn.addEventListener("click",async()=>{
  loadReportsBtn.disabled=true;loadReportsBtn.textContent="Loading...";
  try{await loadReports()}finally{loadReportsBtn.disabled=false;loadReportsBtn.textContent="Refresh reports"}
});
reportStatusFilter.addEventListener("change",loadReports);
notificationBtn.addEventListener("click",async()=>{notificationPanel.style.display=notificationPanel.style.display==="block"?"none":"block";if(notificationPanel.style.display==="block")await loadNotifications();});
closeNotificationsBtn.addEventListener("click",()=>notificationPanel.style.display="none");
markAllReadBtn.addEventListener("click",markAllNotificationsRead);
logoutBtn.addEventListener("click",async()=>{
  logoutBtn.disabled=true;logoutBtn.textContent="Logging out...";
  const {error}=await supabase.auth.signOut();
  if(error){alert(error.message||"Could not log out.");logoutBtn.disabled=false;logoutBtn.textContent="Logout";return}
  location.href="account.html";
});

(async()=>{
  try{await loadAdmin();await loadReports();await loadNotifications()}
  catch(e){err(e.message||"Unable to initialize the admin dashboard.")}
})();

setInterval(()=>{loadAdmin();loadReports();loadNotifications();},30000);

/* =========================================================
   AjeMarket — Seller Verification & Trust
   Added because the previous admin.js did not actually load
   seller_verifications, even though submit_seller_verification
   was successfully creating rows.
========================================================= */

(function installSellerVerification(){
  const styleId = "ajeSellerVerificationStyles";

  function addStyles(){
    if(document.getElementById(styleId)) return;
    const style=document.createElement("style");
    style.id=styleId;
    style.textContent=`
      .aje-verification{margin-top:20px}
      .aje-verification .verify-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
      .aje-verification .verify-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:16px}
      .aje-verification .verify-stat{background:var(--panel2,#102235);border:1px solid var(--line,#20354a);border-radius:14px;padding:16px}
      .aje-verification .verify-stat-label{color:var(--muted,#9db0c2);font-size:13px;font-weight:800}
      .aje-verification .verify-stat-value{font-size:28px;font-weight:900;margin-top:6px}
      .aje-verification .verify-stat-value.pending{color:var(--orange,#ffb454)}
      .aje-verification .verify-stat-value.approved{color:var(--green,#22d3a2)}
      .aje-verification .verify-stat-value.rejected{color:var(--red,#ff6574)}
      .aje-verification .verify-row{padding:18px;border-top:1px solid var(--line,#20354a)}
      .aje-verification .verify-grid{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px}
      .aje-verification .verify-title{font-size:18px;font-weight:900}
      .aje-verification .verify-meta{color:var(--muted,#9db0c2);font-size:13px;line-height:1.65;margin-top:8px}
      .aje-verification .verify-actions{display:flex;flex-direction:column;gap:8px;min-width:170px}
      .aje-verification .verify-actions textarea{min-height:80px;resize:vertical}
      .aje-verification .verify-doc{display:inline-flex;margin-top:10px}
      .aje-verification .verify-details{margin-top:12px;padding:12px;border-radius:12px;background:var(--panel2,#102235);color:var(--muted,#9db0c2);font-size:13px;line-height:1.6;overflow-wrap:anywhere}
      .aje-verification .verify-status{display:inline-flex;padding:6px 10px;margin-left:7px;border-radius:999px;font-size:11px;font-weight:900}
      .aje-verification .verify-status.pending{background:rgba(255,180,84,.12);color:var(--orange,#ffb454)}
      .aje-verification .verify-status.approved{background:rgba(34,211,162,.12);color:var(--green,#22d3a2)}
      .aje-verification .verify-status.rejected{background:rgba(255,101,116,.12);color:var(--red,#ff6574)}
      @media(max-width:700px){
        .aje-verification .verify-summary{grid-template-columns:1fr}
        .aje-verification .verify-grid{grid-template-columns:1fr}
        .aje-verification .verify-actions{min-width:0}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureSection(){
    addStyles();
    let section=document.getElementById("sellerVerificationSection");
    if(section) return section;

    section=document.createElement("section");
    section.id="sellerVerificationSection";
    section.className="section aje-verification";
    const reportsSection=document.getElementById("reportsList")?.closest(".section");
    if(reportsSection) reportsSection.before(section);
    else document.querySelector("main")?.appendChild(section);

    section.innerHTML=`
      <div class="section-head">
        <div>
          <h2>🛡️ Seller Verification & Trust</h2>
          <span>Review seller verification requests and control Trusted Seller status.</span>
        </div>
        <div class="verify-toolbar">
          <select id="verificationStatusFilter" class="filter">
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Trusted sellers</option>
            <option value="rejected">Rejected</option>
          </select>
          <button id="refreshVerificationBtn" class="btn small" type="button">Refresh verification</button>
        </div>
      </div>
      <div class="panel">
        <div class="verify-summary">
          <div class="verify-stat"><div class="verify-stat-label">Pending</div><div id="verificationPendingCount" class="verify-stat-value pending">0</div></div>
          <div class="verify-stat"><div class="verify-stat-label">Trusted sellers</div><div id="verificationApprovedCount" class="verify-stat-value approved">0</div></div>
          <div class="verify-stat"><div class="verify-stat-label">Rejected</div><div id="verificationRejectedCount" class="verify-stat-value rejected">0</div></div>
        </div>
        <div id="verificationList"><div class="loading">Loading seller verification...</div></div>
      </div>
    `;

    section.querySelector("#refreshVerificationBtn").addEventListener("click",load);
    section.querySelector("#verificationStatusFilter").addEventListener("change",load);
    return section;
  }

  function status(v){
    const s=String(v||"pending").toLowerCase();
    return s==="approved"?"approved":s==="rejected"?"rejected":"pending";
  }

  async function documentUrl(path){
    if(!path) return "";
    const cleanPath=String(path).trim().replace(/^\/+/, "");
    if(!cleanPath) return "";

    const {data,error}=await supabase.storage
      .from("seller-verification-documents")
      .createSignedUrl(cleanPath, 60 * 60);

    if(error){
      console.error("Seller verification document URL error:", error);
      return "";
    }

    return data?.signedUrl||"";
  }

  async function load(){
    const section=ensureSection();
    const list=section.querySelector("#verificationList");
    list.innerHTML='<div class="loading">Loading seller verification...</div>';

    try{
      const s=await session();
      if(!s) return;

      const {data,error}=await supabase
        .from("seller_verifications")
        .select("*")
        .order("created_at",{ascending:false});
      if(error) throw error;

      const rows=Array.isArray(data)?data:[];
      section.querySelector("#verificationPendingCount").textContent=num(rows.filter(r=>status(r.status)==="pending").length);
      section.querySelector("#verificationApprovedCount").textContent=num(rows.filter(r=>status(r.status)==="approved").length);
      section.querySelector("#verificationRejectedCount").textContent=num(rows.filter(r=>status(r.status)==="rejected").length);

      const filter=section.querySelector("#verificationStatusFilter").value;
      const shown=filter==="all"?rows:rows.filter(r=>status(r.status)===filter);

      if(!shown.length){
        list.innerHTML='<div class="empty">No seller verification requests found.</div>';
        return;
      }

      const prepared=await Promise.all(shown.map(async r=>({
        row:r,
        st:status(r.status),
        url:await documentUrl(r.document_path)
      })));

      list.innerHTML=prepared.map(({row:r,st,url})=>{
        return `
          <div class="verify-row" data-verification-id="${esc(r.id)}">
            <div class="verify-grid">
              <div>
                <div class="verify-title">
                  ${esc(r.full_name||"Unnamed seller")}
                  <span class="verify-status ${st}">${st==="approved"?"✓ Trusted Seller":st==="rejected"?"Rejected":"Under review"}</span>
                </div>
                <div class="verify-meta">
                  <strong>Seller type:</strong> ${esc(r.seller_type||"individual")}<br>
                  <strong>Phone:</strong> ${esc(r.phone||"Not supplied")}<br>
                  <strong>ID type:</strong> ${esc(r.id_type||"Not supplied")}<br>
                  <strong>ID number:</strong> ${esc(r.id_number||"Not supplied")}<br>
                  ${r.business_name?`<strong>Business:</strong> ${esc(r.business_name)}<br>`:""}
                  ${r.business_registration?`<strong>Business registration:</strong> ${esc(r.business_registration)}<br>`:""}
                  <strong>Submitted:</strong> ${esc(dt(r.created_at))}
                </div>
                <div class="verify-details">
                  ${r.seller_note?`<strong>Seller note:</strong> ${esc(r.seller_note)}<br>`:""}
                  ${r.admin_note?`<strong>Admin note:</strong> ${esc(r.admin_note)}<br>`:""}
                  <strong>Seller ID:</strong> ${esc(r.seller_id||"")}
                </div>
                ${url?`<div class="verify-doc"><a class="btn small" href="${esc(url)}" target="_blank" rel="noopener">View verification document</a></div>`:`<div class="verify-meta">Document path: ${esc(r.document_path||"Not supplied")}</div>`}
              </div>
              <div class="verify-actions">
                ${st==="pending"?`
                  <textarea class="verification-note" placeholder="Admin note (optional)"></textarea>
                  <button type="button" class="btn primary approve-verification" data-id="${esc(r.id)}">✓ Approve seller</button>
                  <button type="button" class="btn danger reject-verification" data-id="${esc(r.id)}">Reject seller</button>
                `:`<span class="badge ${st==="approved"?"success":"danger"}">${st==="approved"?"Trusted seller":"Rejected"}</span>`}
              </div>
            </div>
          </div>`;
      }).join("");

      list.querySelectorAll(".approve-verification").forEach(btn=>btn.addEventListener("click",()=>update(btn,"approved")));
      list.querySelectorAll(".reject-verification").forEach(btn=>btn.addEventListener("click",()=>update(btn,"rejected")));
    }catch(e){
      console.error("Seller verification load failed:",e);
      list.innerHTML=`<div class="empty">Could not load seller verification.<br><br>${esc(e.message||e)}</div>`;
    }
  }

  async function update(button,newStatus){
    const row=button.closest(".verify-row");
    const id=button.dataset.id;
    const note=row?.querySelector(".verification-note")?.value.trim()||"";
    button.disabled=true;
    button.textContent=newStatus==="approved"?"Approving...":"Rejecting...";

    try{
      /* Use the secure RPC when it exists. */
      const rpc=await supabase.rpc("admin_update_seller_verification",{
        p_verification_id:id,
        p_status:newStatus,
        p_admin_note:note||null
      });

      if(!rpc.error){
        if(rpc.data?.success===false) throw new Error(rpc.data.message||"Verification update failed.");
        notice(newStatus==="approved"?"Seller approved successfully. Trusted Seller is now active.":"Seller rejected successfully.");
        await load();
        return;
      }

      const rpcMessage=String(rpc.error.message||"").toLowerCase();
      const functionMissing=rpcMessage.includes("does not exist")||rpcMessage.includes("could not find the function");
      if(!functionMissing) throw rpc.error;

      /* Fallback: works when the admin role has direct update policies. */
      const {data:request,error:requestError}=await supabase
        .from("seller_verifications")
        .select("seller_id")
        .eq("id",id)
        .maybeSingle();
      if(requestError) throw requestError;
      if(!request?.seller_id) throw new Error("Verification request was not found.");

      const {error:updateError}=await supabase
        .from("seller_verifications")
        .update({
          status:newStatus,
          admin_note:note||null,
          reviewed_at:new Date().toISOString()
        })
        .eq("id",id);
      if(updateError) throw new Error("Admin verification update is blocked by Supabase security. The secure admin_update_seller_verification RPC must be enabled. "+updateError.message);

      const profileData=newStatus==="approved"
        ?{verification_status:"approved",is_verified_seller:true,verified_at:new Date().toISOString()}
        :{verification_status:"rejected",is_verified_seller:false,verified_at:null};

      const {error:profileError}=await supabase
        .from("profiles")
        .update(profileData)
        .eq("id",request.seller_id);
      if(profileError) throw profileError;

      notice(newStatus==="approved"?"Seller approved successfully. Trusted Seller is now active.":"Seller rejected successfully.");
      await load();
    }catch(e){
      console.error("Seller verification update failed:",e);
      err(e.message||"Could not update seller verification.");
    }finally{
      button.disabled=false;
      button.textContent=newStatus==="approved"?"✓ Approve seller":"Reject seller";
    }
  }

  /* Export no globals; just start the section after the existing admin UI loads. */
  ensureSection();
  load();
  setInterval(load,30000);
})();
