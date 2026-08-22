import { supabase } from "./supabase.js";

const $=s=>document.querySelector(s);
const dashboardContent=$("#dashboardContent"),errorBox=$("#errorBox"),noticeBox=$("#noticeBox"),lastUpdated=$("#lastUpdated");
const refreshBtn=$("#refreshBtn"),logoutBtn=$("#logoutBtn"),notificationBtn=$("#notificationBtn"),notificationBadge=$("#notificationBadge");
const notificationPanel=$("#notificationPanel"),notificationList=$("#notificationList"),markAllReadBtn=$("#markAllReadBtn"),closeNotificationsBtn=$("#closeNotificationsBtn");
const reportsList=$("#reportsList"),reportCount=$("#reportCount"),reportStatusFilter=$("#reportStatusFilter"),loadReportsBtn=$("#loadReportsBtn");

function esc(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
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
 clearErr();const s=await session();if(!s)return;
 const {data,error}=await supabase.rpc("admin_dashboard_overview");
 if(error){err(error.message||"Unable to load administrator dashboard.");return}
 renderDashboard(data||{});
}

function renderDashboard(data){
 const u=data.users||{},m=data.marketplace||{},p=data.payments||{},msg=data.messaging||{};
 dashboardContent.innerHTML=`<section class="cards">
 <article class="stat"><div class="stat-icon">👥</div><div class="stat-label">Total Users</div><div class="stat-value blue">${num(u.total)}</div></article>
 <article class="stat"><div class="stat-icon">🏪</div><div class="stat-label">Sellers</div><div class="stat-value green">${num(m.total_sellers)}</div></article>
 <article class="stat"><div class="stat-icon">📦</div><div class="stat-label">Total Listings</div><div class="stat-value purple">${num(m.total_products)}</div></article>
 <article class="stat"><div class="stat-icon">🟢</div><div class="stat-label">Active Listings</div><div class="stat-value green">${num(m.active_products)}</div></article>
 <article class="stat"><div class="stat-icon">🏢</div><div class="stat-label">Business Accounts</div><div class="stat-value blue">${num(u.businesses)}</div></article>
 <article class="stat"><div class="stat-icon">🚀</div><div class="stat-label">Boosted</div><div class="stat-value orange">${num(m.boosted_products)}</div></article>
 <article class="stat"><div class="stat-icon">👑</div><div class="stat-label">Premium</div><div class="stat-value purple">${num(m.premium_products)}</div></article>
 <article class="stat"><div class="stat-icon">💰</div><div class="stat-label">Platform Revenue</div><div class="stat-value green">${money(p.successful_revenue)}</div></article>
 </section>
 <section class="grid-2">
 <article class="panel"><div class="panel-head">👥 User Growth</div><div class="panel-body"><div class="mini-grid"><div class="mini"><div class="mini-label">New users — 7 days</div><div class="mini-value blue">${num(u.new_7_days)}</div></div><div class="mini"><div class="mini-label">New users — 30 days</div><div class="mini-value green">${num(u.new_30_days)}</div></div></div></div></article>
 <article class="panel"><div class="panel-head">💳 Payment Overview</div><div class="panel-body"><div class="mini-grid"><div class="mini"><div class="mini-label">Successful</div><div class="mini-value green">${num(p.successful_count)}</div></div><div class="mini"><div class="mini-label">Pending</div><div class="mini-value orange">${num(p.pending_count)}</div></div><div class="mini"><div class="mini-label">Boost revenue</div><div class="mini-value">${money(p.boost_revenue)}</div></div><div class="mini"><div class="mini-label">Premium revenue</div><div class="mini-value purple">${money(p.premium_revenue)}</div></div></div></div></article>
 <article class="panel"><div class="panel-head">💬 Messaging</div><div class="panel-body"><div class="mini-grid"><div class="mini"><div class="mini-label">Conversations</div><div class="mini-value blue">${num(msg.conversations)}</div></div><div class="mini"><div class="mini-label">Messages</div><div class="mini-value">${num(msg.messages)}</div></div><div class="mini"><div class="mini-label">Unread</div><div class="mini-value orange">${num(msg.unread_messages)}</div></div></div></div></article>
 </section>
 <section class="section"><div class="panel"><div class="panel-head">Marketplace Activity</div><div class="panel-body"><div class="mini-grid"><div class="mini"><div class="mini-label">Sellers</div><div class="mini-value green">${num(m.total_sellers)}</div></div><div class="mini"><div class="mini-label">Active listings</div><div class="mini-value blue">${num(m.active_products)}</div></div><div class="mini"><div class="mini-label">Boosted</div><div class="mini-value orange">${num(m.boosted_products)}</div></div><div class="mini"><div class="mini-label">Premium</div><div class="mini-value purple">${num(m.premium_products)}</div></div></div></div></div></section>`;
 lastUpdated.textContent=`Last updated: ${new Date().toLocaleString("en-NG")}`;
}

function val(r,keys,fb=""){for(const k of keys)if(r?.[k]!==undefined&&r?.[k]!==null&&r?.[k]!=="")return r[k];return fb}
function reportsArray(d){return Array.isArray(d)?d:Array.isArray(d?.reports)?d.reports:Array.isArray(d?.items)?d.items:Array.isArray(d?.data)?d.data:[]}
function cls(s){s=String(s||"").toLowerCase();return s==="resolved"?"success":(s==="dismissed"||s==="rejected")?"danger":(s==="reviewing"||s==="in_review")?"active":"pending"}

async function loadReports(){
 const s=await session();if(!s)return;
 const {data,error}=await supabase.rpc("admin_reports_overview");
 if(error){err(error.message||"Unable to load reports.");return}
 renderReports(reportsArray(data));
}

function renderReports(all){
 const f=reportStatusFilter.value;
 const rs=f==="all"?all:all.filter(r=>String(val(r,["status"],"")).toLowerCase()===f);
 reportCount.textContent=num(rs.length);
 if(!rs.length){reportsList.innerHTML=`<div class="empty">No ${f==="all"?"":f+" "}reports found.</div>`;return}
 reportsList.innerHTML=rs.map(r=>{
  const id=val(r,["id","report_id"]),type=val(r,["report_type","type"],"Report"),reason=val(r,["reason","report_reason"],"No reason supplied"),status=val(r,["status"],"pending"),reporter=val(r,["reporter_email","reporter_name","reporter_id","user_id"],"Unknown"),listing=val(r,["listing_title","product_title","title"],""),created=val(r,["created_at","reported_at"],""),note=val(r,["admin_note","moderator_note","resolution_note"],"");
  return `<div class="report-row"><div><div class="activity-title">Report #${esc(id)} — ${esc(type)}</div><div class="report-reason"><strong>Reason:</strong> ${esc(reason)}</div><div class="activity-meta">${listing?`Listing: ${esc(listing)}<br>`:""}Reporter: ${esc(reporter)}<br>Status: ${esc(status)}<br>Created: ${dt(created)}${note?`<br>Admin note: ${esc(note)}`:""}</div></div><div class="report-actions"><span class="badge ${cls(status)}">${esc(status)}</span><select class="action-select report-status"><option value="">Change status…</option><option value="pending">Pending</option><option value="reviewing">Reviewing</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option></select><input class="action-select report-note" placeholder="Admin note (optional)"><button class="btn small primary update-report" data-id="${esc(id)}">Update report</button></div></div>`;
 }).join("");

 reportsList.querySelectorAll(".update-report").forEach(b=>b.onclick=async()=>{
  const row=b.closest(".report-row"),status=row.querySelector(".report-status").value,note=row.querySelector(".report-note").value.trim(),id=b.dataset.id;
  if(!id||!status){err("Choose a new report status first.");return}
  b.disabled=true;b.textContent="Updating...";
  try{
   const {error}=await supabase.rpc("admin_update_report",{p_report_id:id,p_status:status,p_admin_note:note});
   if(error)throw error;
   notice(`Report #${id} updated successfully.`);
   await loadReports();await loadNotifications();
  }catch(e){err(e.message||"Could not update this report.")}
  finally{b.disabled=false;b.textContent="Update report"}
 });
}

function notificationRows(rows){return Array.isArray(rows)?rows:[]}
function nTitle(n){return n.title||"AjeMarket notification"}
function nBody(n){return n.message||n.body||""}

async function loadNotifications(){
 try{
  const s=await session();if(!s)return;
  const {data,error}=await supabase
   .from("admin_notifications")
   .select("id,type,title,message,body,related_id,related_type,target_type,target_id,reason,product_title,is_read,created_at")
   .order("created_at",{ascending:false})
   .limit(100);
  if(error){console.warn("Notifications:",error.message);return}
  const rows=notificationRows(data),unread=rows.filter(n=>!n.is_read).length;
  notificationBadge.textContent=unread>99?"99+":String(unread);
  notificationBadge.style.display=unread?"flex":"none";
  if(!rows.length){notificationList.innerHTML='<div class="empty">No notifications yet.</div>';return}
  notificationList.innerHTML=rows.map(n=>`<div class="notification-item ${n.is_read?"":"unread"}" data-id="${esc(n.id)}"><div><div class="notification-title">${esc(nTitle(n))}</div><div class="notification-body">${esc(nBody(n))}</div></div><div class="notification-time">${dt(n.created_at)}${n.is_read?"":"<br><span class='badge pending'>NEW</span>"}</div></div>`).join("");
  notificationList.querySelectorAll(".notification-item").forEach(item=>item.onclick=async()=>{
   const {error}=await supabase.from("admin_notifications").update({is_read:true}).eq("id",item.dataset.id);
   if(!error)await loadNotifications();
  });
 }catch(e){console.warn(e)}
}

async function markAllRead(){
 markAllReadBtn.disabled=true;
 try{
  const {error}=await supabase.from("admin_notifications").update({is_read:true}).eq("is_read",false);
  if(error)throw error;
  await loadNotifications();
 }catch(e){err(e.message||"Unable to mark notifications as read.")}
 finally{markAllReadBtn.disabled=false}
}

refreshBtn.onclick=async()=>{refreshBtn.disabled=true;refreshBtn.textContent="Loading...";try{await loadAdmin();await loadReports();await loadNotifications()}finally{refreshBtn.disabled=false;refreshBtn.textContent="Refresh"}};
loadReportsBtn.onclick=async()=>{loadReportsBtn.disabled=true;loadReportsBtn.textContent="Loading...";try{await loadReports()}finally{loadReportsBtn.disabled=false;loadReportsBtn.textContent="Refresh reports"}};
reportStatusFilter.onchange=loadReports;
notificationBtn.onclick=async()=>{notificationPanel.style.display=notificationPanel.style.display==="block"?"none":"block";if(notificationPanel.style.display==="block")await loadNotifications()};
closeNotificationsBtn.onclick=()=>notificationPanel.style.display="none";
markAllReadBtn.onclick=markAllRead;
logoutBtn.onclick=async()=>{const {error}=await supabase.auth.signOut();if(error){alert(error.message);return}location.href="account.html"};

(async()=>{try{await loadAdmin();await loadReports();await loadNotifications()}catch(e){err(e.message||"Unable to initialize the admin dashboard.")}})();
setInterval(()=>{loadAdmin();loadReports();loadNotifications()},30000);
