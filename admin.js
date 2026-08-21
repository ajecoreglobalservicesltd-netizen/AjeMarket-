import { supabase } from "./supabase.js";

const dashboardContent=document.querySelector("#dashboardContent");
const errorBox=document.querySelector("#errorBox");
const lastUpdated=document.querySelector("#lastUpdated");
const refreshBtn=document.querySelector("#refreshBtn");
const logoutBtn=document.querySelector("#logoutBtn");
const notificationBtn=document.querySelector("#notificationBtn");
const notificationPanel=document.querySelector("#notificationPanel");
const notificationCount=document.querySelector("#notificationCount");
const notificationList=document.querySelector("#notificationList");
const markAllRead=document.querySelector("#markAllRead");

function escapeHtml(value){return String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}
function money(value){return "₦"+Number(value||0).toLocaleString("en-NG");}
function number(value){return Number(value||0).toLocaleString("en-NG");}
function dateTime(value){if(!value)return "";const d=new Date(value);if(Number.isNaN(d.getTime()))return "";return d.toLocaleString("en-NG",{dateStyle:"medium",timeStyle:"short"});}
function showError(message){errorBox.textContent=message;errorBox.style.display="block";}
function hideError(){errorBox.textContent="";errorBox.style.display="none";}

async function getCurrentSession(){const {data,error}=await supabase.auth.getSession();if(error)throw error;return data?.session||null;}
async function requireAdminSession(){const session=await getCurrentSession();if(!session?.user){window.location.href="account.html";return null;}return session;}

async function loadAdminData(){
  hideError();
  dashboardContent.innerHTML='<div class="loading">Loading AjeMarket statistics...</div>';
  const session=await requireAdminSession(); if(!session)return;
  const {data,error}=await supabase.rpc("admin_dashboard_overview");
  if(error){console.error("Admin dashboard error:",error);dashboardContent.innerHTML="";showError(error.message||"Unable to load the administrator dashboard.");return;}
  if(!data){dashboardContent.innerHTML="";showError("The administrator dashboard returned no data.");return;}
  renderDashboard(data);
}

function renderDashboard(data){
  const users=data.users||{},marketplace=data.marketplace||{},payments=data.payments||{},messaging=data.messaging||{};
  const recentUsers=Array.isArray(data.recent_users)?data.recent_users:[];
  const recentProducts=Array.isArray(data.recent_products)?data.recent_products:[];
  const recentPayments=Array.isArray(data.recent_payments)?data.recent_payments:[];
  dashboardContent.innerHTML=`
<section class="cards">
<article class="stat"><div class="stat-icon">👥</div><div class="stat-label">Total Users</div><div class="stat-value blue">${number(users.total)}</div><div class="stat-note">Registered AjeMarket accounts</div></article>
<article class="stat"><div class="stat-icon">🏪</div><div class="stat-label">Sellers</div><div class="stat-value green">${number(marketplace.total_sellers)}</div><div class="stat-note">Users with listings</div></article>
<article class="stat"><div class="stat-icon">📦</div><div class="stat-label">Total Listings</div><div class="stat-value purple">${number(marketplace.total_products)}</div><div class="stat-note">Products in the marketplace</div></article>
<article class="stat"><div class="stat-icon">🟢</div><div class="stat-label">Active Listings</div><div class="stat-value green">${number(marketplace.active_products)}</div><div class="stat-note">Currently active</div></article>
<article class="stat"><div class="stat-icon">🏢</div><div class="stat-label">Business Accounts</div><div class="stat-value blue">${number(users.businesses)}</div><div class="stat-note">Registered business profiles</div></article>
<article class="stat"><div class="stat-icon">🚀</div><div class="stat-label">Boosted</div><div class="stat-value orange">${number(marketplace.boosted_products)}</div><div class="stat-note">Currently active boosts</div></article>
<article class="stat"><div class="stat-icon">👑</div><div class="stat-label">Premium</div><div class="stat-value purple">${number(marketplace.premium_products)}</div><div class="stat-note">Currently active premium listings</div></article>
<article class="stat"><div class="stat-icon">💰</div><div class="stat-label">Platform Revenue</div><div class="stat-value green">${money(payments.successful_revenue)}</div><div class="stat-note">Successful promotion payments</div></article>
</section>
<section class="grid-2">
<article class="panel"><div class="panel-head">👥 User Growth</div><div class="panel-body"><div class="mini-grid"><div class="mini"><div class="mini-label">New users — 7 days</div><div class="mini-value blue">${number(users.new_7_days)}</div></div><div class="mini"><div class="mini-label">New users — 30 days</div><div class="mini-value green">${number(users.new_30_days)}</div></div></div></div></article>
<article class="panel"><div class="panel-head">💳 Payment Overview</div><div class="panel-body"><div class="mini-grid"><div class="mini"><div class="mini-label">Successful payments</div><div class="mini-value green">${number(payments.successful_count)}</div></div><div class="mini"><div class="mini-label">Pending payments</div><div class="mini-value orange">${number(payments.pending_count)}</div></div><div class="mini"><div class="mini-label">Boost revenue</div><div class="mini-value">${money(payments.boost_revenue)}</div></div><div class="mini"><div class="mini-label">Premium revenue</div><div class="mini-value purple">${money(payments.premium_revenue)}</div></div><div class="mini"><div class="mini-label">Last 30 days</div><div class="mini-value green">${money(payments.last_30_days_revenue)}</div></div></div></div></article>
<article class="panel"><div class="panel-head">💬 Messaging</div><div class="panel-body"><div class="mini-grid"><div class="mini"><div class="mini-label">Conversations</div><div class="mini-value blue">${number(messaging.conversations)}</div></div><div class="mini"><div class="mini-label">Total messages</div><div class="mini-value">${number(messaging.messages)}</div></div><div class="mini"><div class="mini-label">Unread messages</div><div class="mini-value orange">${number(messaging.unread_messages)}</div></div></div></div></article>
<article class="panel"><div class="panel-head">📊 Marketplace Activity</div><div class="panel-body"><div class="mini-grid"><div class="mini"><div class="mini-label">Sellers</div><div class="mini-value green">${number(marketplace.total_sellers)}</div></div><div class="mini"><div class="mini-label">Active listings</div><div class="mini-value blue">${number(marketplace.active_products)}</div></div><div class="mini"><div class="mini-label">Boosted listings</div><div class="mini-value orange">${number(marketplace.boosted_products)}</div></div><div class="mini"><div class="mini-label">Premium listings</div><div class="mini-value purple">${number(marketplace.premium_products)}</div></div></div></div></article>
</section>
${recentSection("Recent Users","Latest registered accounts",recentUsers,u=>`<div class="activity-title">${escapeHtml(u.email||"No email")}</div><div class="activity-meta">User ID: ${escapeHtml(u.id||"")}<br>Registered: ${dateTime(u.created_at)}</div>`,`User`)}
${recentSection("Recent Listings","Latest products posted",recentProducts,p=>`<div class="activity-title">${escapeHtml(p.title||p.name||"Untitled listing")}</div><div class="activity-meta">Price: ${money(p.price)}<br>Seller: ${escapeHtml(p.seller_id||"")}<br>Created: ${dateTime(p.created_at)}</div>`,p=>p.status||"unknown")}
${recentSection("Recent Payments","Paystack promotion transactions",recentPayments,p=>`<div class="activity-title">${escapeHtml(p.promotion_type||"Promotion")} payment — ${money(p.amount)}</div><div class="activity-meta">Seller: ${escapeHtml(p.seller_id||"")}<br>Reference: ${escapeHtml(p.paystack_reference||"")}<br>Date: ${dateTime(p.created_at)}</div>`,p=>p.status||"unknown")}`;
  lastUpdated.textContent=`Last updated: ${new Date().toLocaleString("en-NG")}`;
}

function recentSection(title,sub,items,body,badge){return `<section class="section"><div class="section-head"><h2>${title}</h2><span>${sub}</span></div><div class="panel"><div class="activity">${items.length?items.map(x=>`<div class="activity-row"><div>${body(x)}</div><span class="badge">${escapeHtml(typeof badge==="function"?badge(x):badge)}</span></div>`).join(""):`<div class="empty">No records found.</div>`}</div></div></section>`}

async function loadNotifications(){
  const {data,error}=await supabase.from("admin_notifications").select("id,type,title,message,reference_id,reference_type,is_read,created_at").order("created_at",{ascending:false}).limit(50);
  if(error){console.error("Notification load error:",error);notificationList.innerHTML=`<div class="empty">Notifications are not available yet. Run admin_notifications.sql in Supabase.</div>`;return;}
  const rows=data||[]; const unread=rows.filter(n=>!n.is_read).length;
  notificationCount.textContent=unread>99?"99+":String(unread); notificationCount.style.display=unread?"inline-flex":"none";
  notificationList.innerHTML=rows.length?rows.map(n=>`<div class="notification-item ${n.is_read?"":"unread"}" data-notification-id="${escapeHtml(n.id)}"><div class="notification-item-title">${escapeHtml(n.title)}</div><div class="notification-item-message">${escapeHtml(n.message)}</div><div class="notification-item-time">${dateTime(n.created_at)}</div></div>`).join(""):"<div class='empty'>No notifications yet.</div>";
  notificationList.querySelectorAll("[data-notification-id]").forEach(el=>el.onclick=()=>markNotificationRead(el.dataset.notificationId));
}

async function markNotificationRead(id){const {error}=await supabase.from("admin_notifications").update({is_read:true}).eq("id",id);if(error){console.error(error);return;}await loadNotifications();}
async function markAllNotificationsRead(){const {error}=await supabase.from("admin_notifications").update({is_read:true}).eq("is_read",false);if(error){alert(error.message);return;}await loadNotifications();}

notificationBtn.onclick=async()=>{notificationPanel.style.display=notificationPanel.style.display==="block"?"none":"block";if(notificationPanel.style.display==="block")await loadNotifications();};
markAllRead.onclick=markAllNotificationsRead;
document.addEventListener("click",e=>{if(!e.target.closest(".notification-wrap"))notificationPanel.style.display="none";});
refreshBtn.addEventListener("click",async()=>{refreshBtn.disabled=true;refreshBtn.textContent="Loading...";try{await loadAdminData();await loadNotifications();}finally{refreshBtn.disabled=false;refreshBtn.textContent="Refresh";}});
logoutBtn.addEventListener("click",async()=>{logoutBtn.disabled=true;logoutBtn.textContent="Logging out...";const {error}=await supabase.auth.signOut();if(error){alert(error.message||"Could not log out.");logoutBtn.disabled=false;logoutBtn.textContent="Logout";return;}window.location.href="account.html";});

async function start(){await loadAdminData();await loadNotifications();}
start();
setInterval(()=>{loadAdminData();loadNotifications();},30000);
