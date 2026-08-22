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

let dashboardLoadInFlight = false;

function withTimeout(promise, ms, label){
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(label || "Request timed out.")), ms)
    )
  ]);
}

async function loadDashboardFallback(){
  const now = Date.now();
  const sevenDays = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDays = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

  const results = await Promise.allSettled([
    supabase.from("profiles").select("id,full_name,is_business,created_at").order("created_at", {ascending:false}),
    supabase.from("products").select("id,title,name,price,seller_id,status,promotion_type,promotion_expires_at,created_at").order("created_at", {ascending:false}),
    supabase.from("promotion_payments").select("id,product_id,seller_id,promotion_type,amount,paystack_reference,status,created_at").order("created_at", {ascending:false}),
    supabase.from("conversations").select("id", {count:"exact", head:true}),
    supabase.from("messages").select("id", {count:"exact", head:true}),
    supabase.from("messages").select("id", {count:"exact", head:true}).eq("is_read", false)
  ]);

  const value = i => results[i]?.status === "fulfilled" ? results[i].value : null;
  const profiles = value(0)?.data || [];
  const products = value(1)?.data || [];
  const payments = value(2)?.data || [];
  const conversations = value(3)?.count || 0;
  const messages = value(4)?.count || 0;
  const unread = value(5)?.count || 0;

  const successful = payments.filter(x => String(x.status || "").toLowerCase() === "successful");
  const pending = payments.filter(x => String(x.status || "").toLowerCase() === "pending");
  const successfulRevenue = successful.reduce((sum, x) => sum + Number(x.amount || 0), 0);
  const boostRevenue = successful.filter(x => x.promotion_type === "boost").reduce((sum, x) => sum + Number(x.amount || 0), 0);
  const premiumRevenue = successful.filter(x => x.promotion_type === "premium").reduce((sum, x) => sum + Number(x.amount || 0), 0);
  const last30Revenue = successful.filter(x => x.created_at && x.created_at >= thirtyDays).reduce((sum, x) => sum + Number(x.amount || 0), 0);

  const activeProducts = products.filter(x => String(x.status || "").toLowerCase() === "active");
  const nowDate = new Date();
  const boosted = activeProducts.filter(x => x.promotion_type === "boost" && x.promotion_expires_at && new Date(x.promotion_expires_at) > nowDate);
  const premium = activeProducts.filter(x => x.promotion_type === "premium" && x.promotion_expires_at && new Date(x.promotion_expires_at) > nowDate);
  const sellerIds = new Set(products.map(x => x.seller_id).filter(Boolean).map(String));

  return {
    users: {
      total: profiles.length,
      businesses: profiles.filter(x => x.is_business === true).length,
      new_7_days: profiles.filter(x => x.created_at && x.created_at >= sevenDays).length,
      new_30_days: profiles.filter(x => x.created_at && x.created_at >= thirtyDays).length
    },
    marketplace: {
      total_sellers: sellerIds.size,
      total_products: products.length,
      active_products: activeProducts.length,
      boosted_products: boosted.length,
      premium_products: premium.length
    },
    payments: {
      successful_count: successful.length,
      pending_count: pending.length,
      successful_revenue: successfulRevenue,
      boost_revenue: boostRevenue,
      premium_revenue: premiumRevenue,
      last_30_days_revenue: last30Revenue
    },
    messaging: { conversations, messages, unread_messages: unread },
    recent_users: profiles.slice(0, 10).map(x => ({
      id: x.id,
      email: x.full_name || "User",
      created_at: x.created_at
    })),
    recent_products: products.slice(0, 10),
    recent_payments: payments.slice(0, 10)
  };
}

async function loadAdmin(){
  if (dashboardLoadInFlight) return;
  dashboardLoadInFlight = true;
  clearErr();
  try {
    const s=await session();
    if(!s)return;
    dashboardContent.innerHTML='<div class="loading">Loading AjeMarket statistics...</div>';

    try {
      const {data,error}=await withTimeout(
        supabase.rpc("admin_dashboard_overview"),
        8000,
        "Dashboard statistics service timed out."
      );
      if(error) throw error;
      renderDashboard(data||{});
      return;
    } catch (primaryError) {
      console.warn("Admin dashboard RPC failed; using direct database fallback:", primaryError);
      try {
        const fallback = await withTimeout(
          loadDashboardFallback(),
          8000,
          "Dashboard fallback data service timed out."
        );
        renderDashboard(fallback);
        notice("Dashboard loaded using the direct database fallback.");
      } catch (fallbackError) {
        dashboardContent.innerHTML = '<div class="empty">The dashboard could not load its statistics. Please tap Refresh and try again.</div>';
        err(fallbackError.message || primaryError.message || "Unable to load administrator dashboard.");
      }
    }
  } finally {
    dashboardLoadInFlight = false;
  }
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
