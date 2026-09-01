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

const verificationsList = $("#verificationsList");
const verifyPending = $("#verifyPending");
const verifyApproved = $("#verifyApproved");
const verifyRejected = $("#verifyRejected");
const verificationFilter = $("#verificationFilter");
const refreshVerificationsBtn = $("#refreshVerificationsBtn");

function esc(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function money(v){return "₦"+Number(v||0).toLocaleString("en-NG")}
function num(v){return Number(v||0).toLocaleString("en-NG")}
function dt(v){if(!v)return "—";const d=new Date(v);return Number.isNaN(d.getTime())?"—":d.toLocaleString("en-NG",{dateStyle:"medium",timeStyle:"short"})}
function err(m){errorBox.textContent=m;errorBox.style.display="block"}
function clearErr(){errorBox.style.display="none";errorBox.textContent=""}
function notice(m){noticeBox.textContent=m;noticeBox.style.display="block";setTimeout(()=>noticeBox.style.display="none",3500)}
function normalize(v){return String(v||"").trim().toLowerCase()}

async function session(){
  const {data,error}=await supabase.auth.getSession();
  if(error) throw error;
  if(!data?.session?.user){location.href="account.html";return null}
  return data.session;
}

async function loadAdmin(){
  clearErr();
  const s=await session(); if(!s)return;
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
<section class="section"><div class="section-head"><h2>Recent Listings</h2><span>Latest products posted</span></div><div class="panel">${rp.length?rp.map(x=>`<div class="activity-row"><div><div class="activity-title">${esc(x.title||x.name||"Untitled listing")}</div><div class="activity-meta">Price: ${money(x.price)}<br>Seller: ${esc(x.seller_id||"")}<br>Created: ${dt(x.created_at)}</div></div><div><span class="badge ${normalize(x.status)==="active"?"active":""}">${esc(x.status||"unknown")}</span><br><span class="badge">${esc(x.promotion_type||"ordinary")}</span></div></div>`).join(""):'<div class="empty">No listings found.</div>'}</div></section>
<section class="section"><div class="section-head"><h2>Recent Payments</h2><span>Paystack promotion transactions</span></div><div class="panel">${rpay.length?rpay.map(x=>`<div class="activity-row"><div><div class="activity-title">${esc(x.promotion_type||"Promotion")} payment — ${money(x.amount)}</div><div class="activity-meta">Seller: ${esc(x.seller_id||"")}<br>Reference: ${esc(x.paystack_reference||"")}<br>Date: ${dt(x.created_at)}</div></div><span class="badge ${normalize(x.status)==="successful"?"success":"pending"}">${esc(x.status||"unknown")}</span></div>`).join(""):'<div class="empty">No promotion payments found.</div>'}</div></section>`;
  lastUpdated.textContent=`Last updated: ${new Date().toLocaleString("en-NG")}`;
}

function val(r,keys,fb=""){for(const k of keys)if(r?.[k]!==undefined&&r?.[k]!==null&&r?.[k]!=="")return r[k];return fb}
function reportsArray(d){if(Array.isArray(d))return d;if(Array.isArray(d?.recent))return d.recent;if(Array.isArray(d?.reports))return d.reports;if(Array.isArray(d?.items))return d.items;if(Array.isArray(d?.data))return d.data;return []}
function cls(s){s=normalize(s);return s==="resolved"?"success":(s==="dismissed"||s==="rejected")?"danger":(s==="reviewing"||s==="in_review")?"active":"pending"}

async function loadReports(){
  reportsList.innerHTML='<div class="loading">Loading reports...</div>';
  const s=await session();if(!s)return;
  const {data,error}=await supabase.rpc("admin_reports_overview");
  if(error){reportsList.innerHTML="";reportCount.textContent="!";err(error.message||"Unable to load reports.");return}
  clearErr();renderReports(reportsArray(data));
}

function renderReports(all){
  const f=reportStatusFilter.value;
  const rs=f==="all"?all:all.filter(r=>normalize(val(r,["status"],""))===f);
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

/* =========================================================
   SELLER VERIFICATION — ONE SOURCE OF TRUTH
========================================================= */

function verificationStatusClass(status){
  status=normalize(status);
  if(status==="approved")return "success";
  if(status==="rejected")return "danger";
  return "pending";
}

async function loadVerifications(){
  verificationsList.innerHTML='<div class="loading">Loading seller verification requests...</div>';
  const s=await session();if(!s)return;

  const {data,error}=await supabase.rpc("admin_seller_verifications_overview");
  if(error){
    verificationsList.innerHTML="";
    err(error.message||"Unable to load seller verification requests.");
    return;
  }

  const rows=Array.isArray(data?.requests)?data.requests:(Array.isArray(data)?data:[]);
  const summary=data?.summary||{};
  verifyPending.textContent=num(summary.pending ?? rows.filter(r=>normalize(r.status)==="pending").length);
  verifyApproved.textContent=num(summary.approved ?? rows.filter(r=>normalize(r.status)==="approved").length);
  verifyRejected.textContent=num(summary.rejected ?? rows.filter(r=>normalize(r.status)==="rejected").length);

  const f=verificationFilter.value;
  const filtered=f==="all"?rows:rows.filter(r=>normalize(r.status)===f);

  if(!filtered.length){
    verificationsList.innerHTML=`<div class="empty">No ${f==="all"?"":f+" "}seller verification requests.</div>`;
    return;
  }

  verificationsList.innerHTML=filtered.map(r=>{
    const id=r.id;
    const status=normalize(r.status||"pending");
    const sellerName=r.full_name||"Unknown seller";
    const sellerType=r.seller_type||"individual";
    const phone=r.phone||"—";
    const business=r.business_name||"—";
    const idType=r.id_type||"—";
    const created=dt(r.created_at);
    const note=r.seller_note||"";
    const adminNote=r.admin_note||"";
    const docPath=r.document_path||"";

    return `<div class="verification-row" data-verification-row="${esc(id)}">
      <div>
        <div class="activity-title">Verification #${esc(id)} — ${esc(sellerName)}</div>
        <div class="activity-meta">
          Seller type: ${esc(sellerType)}<br>
          Phone: ${esc(phone)}<br>
          Business: ${esc(business)}<br>
          ID type: ${esc(idType)}<br>
          Submitted: ${created}
          ${note?`<br>Seller note: ${esc(note)}`:""}
          ${adminNote?`<br>Admin note: ${esc(adminNote)}`:""}
        </div>
        ${docPath?`<button class="btn small doc-link view-doc" data-id="${esc(id)}">View verification document</button>`:"<div class='note'>No document path stored.</div>"}
      </div>
      <div class="verification-actions">
        <span class="badge ${verificationStatusClass(status)}">${esc(status)}</span>
        ${status==="pending"?`
          <button class="btn small primary approve-seller" data-id="${esc(id)}">Approve Seller</button>
          <button class="btn small danger reject-seller" data-id="${esc(id)}">Reject Seller</button>
        `:""}
      </div>
    </div>`;
  }).join("");

  verificationsList.querySelectorAll(".view-doc").forEach(btn=>{
    btn.addEventListener("click",()=>viewVerificationDocument(btn.dataset.id,btn));
  });
  verificationsList.querySelectorAll(".approve-seller").forEach(btn=>{
    btn.addEventListener("click",()=>updateSellerVerification(btn.dataset.id,"approved",btn));
  });
  verificationsList.querySelectorAll(".reject-seller").forEach(btn=>{
    btn.addEventListener("click",()=>updateSellerVerification(btn.dataset.id,"rejected",btn));
  });
}

async function viewVerificationDocument(id,btn){
  btn.disabled=true;btn.textContent="Opening...";
  try{
    const {data,error}=await supabase.rpc("admin_get_seller_verification_document",{p_verification_id:id});
    if(error)throw error;
    if(!data?.url)throw new Error("Verification document URL was not returned.");
    window.open(data.url,"_blank","noopener,noreferrer");
  }catch(e){
    err(e.message||"Could not open verification document.");
  }finally{
    btn.disabled=false;btn.textContent="View verification document";
  }
}

async function updateSellerVerification(id,status,btn){
  const label=status==="approved"?"Approve Seller":"Reject Seller";
  btn.disabled=true;btn.textContent=status==="approved"?"Approving...":"Rejecting...";
  clearErr();

  try{
    const {data,error}=await supabase.rpc("admin_update_seller_verification",{
      p_verification_id:id,
      p_status:status,
      p_admin_note:null
    });

    if(error)throw error;
    if(data?.success===false)throw new Error(data.message||"Seller verification update failed.");

    notice(status==="approved"?"Seller approved successfully.":"Seller verification rejected successfully.");
    await loadVerifications();
  }catch(e){
    console.error("Seller verification update error:",e);
    err(e.message||"Could not update seller verification.");
    btn.disabled=false;btn.textContent=label;
  }
}

/* =========================================================
   NOTIFICATIONS
========================================================= */

function notificationTitle(n){return n.title||n.type||"AjeMarket notification"}
function notificationBody(n){return n.message||n.body||n.details||n.reason||""}

async function loadNotifications(){
  try{
    const s=await session();if(!s)return;
    const {data,error}=await supabase.from("admin_notifications").select("*").order("created_at",{ascending:false}).limit(100);
    if(error){notificationList.innerHTML=`<div class="empty">Could not load notifications.<br><br>${esc(error.message)}</div>`;notificationBadge.style.display="none";return}
    const rows=Array.isArray(data)?data:[];
    const unread=rows.filter(n=>n.is_read!==true).length;
    notificationBadge.textContent=unread>99?"99+":String(unread);
    notificationBadge.style.display=unread?"flex":"none";
    if(!rows.length){notificationList.innerHTML='<div class="empty">No notifications yet.</div>';return}
    notificationList.innerHTML=rows.map(n=>`<div class="notification-item ${n.is_read?"":"unread"}" data-id="${esc(n.id)}"><div><div class="notification-title">${esc(notificationTitle(n))}</div><div class="notification-body">${esc(notificationBody(n))}</div></div><div class="notification-time">${dt(n.created_at)}${n.is_read?"":"<br><span class='badge pending'>NEW</span>"}</div></div>`).join("");
    notificationList.querySelectorAll(".notification-item").forEach(item=>item.addEventListener("click",async()=>{
      const {error}=await supabase.from("admin_notifications").update({is_read:true}).eq("id",item.dataset.id);
      if(error){err(error.message);return}await loadNotifications();
    }));
  }catch(e){notificationList.innerHTML=`<div class="empty">Could not load notifications.<br><br>${esc(e.message||e)}</div>`}
}

async function markAllNotificationsRead(){
  markAllReadBtn.disabled=true;
  try{
    const {error}=await supabase.from("admin_notifications").update({is_read:true}).eq("is_read",false);
    if(error)throw error;
    await loadNotifications();
  }catch(e){err(e.message||"Unable to mark notifications as read.")}
  finally{markAllReadBtn.disabled=false}
}

/* =========================================================
   EVENTS
========================================================= */

refreshBtn.addEventListener("click",async()=>{
  refreshBtn.disabled=true;refreshBtn.textContent="Loading...";
  try{await loadAdmin();await loadVerifications();await loadReports();await loadNotifications()}
  finally{refreshBtn.disabled=false;refreshBtn.textContent="Refresh"}
});

refreshVerificationsBtn.addEventListener("click",async()=>{
  refreshVerificationsBtn.disabled=true;refreshVerificationsBtn.textContent="Loading...";
  try{await loadVerifications()}finally{refreshVerificationsBtn.disabled=false;refreshVerificationsBtn.textContent="Refresh verification"}
});

verificationFilter.addEventListener("change",loadVerifications);

loadReportsBtn.addEventListener("click",async()=>{
  loadReportsBtn.disabled=true;loadReportsBtn.textContent="Loading...";
  try{await loadReports()}finally{loadReportsBtn.disabled=false;loadReportsBtn.textContent="Refresh reports"}
});
reportStatusFilter.addEventListener("change",loadReports);

notificationBtn.addEventListener("click",async()=>{
  notificationPanel.style.display=notificationPanel.style.display==="block"?"none":"block";
  if(notificationPanel.style.display==="block")await loadNotifications();
});
closeNotificationsBtn.addEventListener("click",()=>notificationPanel.style.display="none");
markAllReadBtn.addEventListener("click",markAllNotificationsRead);

logoutBtn.addEventListener("click",async()=>{
  logoutBtn.disabled=true;logoutBtn.textContent="Logging out...";
  const {error}=await supabase.auth.signOut();
  if(error){alert(error.message||"Could not log out.");logoutBtn.disabled=false;logoutBtn.textContent="Logout";return}
  location.href="account.html";
});

(async()=>{
  try{
    await loadAdmin();
    await loadVerifications();
    await loadReports();
    await loadNotifications();
  }catch(e){err(e.message||"Unable to initialize the admin dashboard.")}
})();

setInterval(()=>{
  loadAdmin();
  loadVerifications();
  loadReports();
  loadNotifications();
},30000);
