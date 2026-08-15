import {supabase,user} from "./supabase.js";
const form=document.querySelector("#form"),msg=document.querySelector("#msg"),photos=document.querySelector("#photos"),pre=document.querySelector("#previews");
photos.onchange=()=>{pre.innerHTML="";[...photos.files].slice(0,8).forEach(f=>{const i=document.createElement("img");i.src=URL.createObjectURL(f);pre.appendChild(i)})};
form.onsubmit=async e=>{e.preventDefault();const u=await user();if(!u){location.href="account.html";return}const fd=new FormData(form);msg.textContent="Uploading…";let image_url=null;
const fs=[...photos.files].slice(0,8);if(fs.length){const f=fs[0],path=`${u.id}/${crypto.randomUUID()}-${f.name.replace(/[^a-zA-Z0-9._-]/g,"")}`;const up=await supabase.storage.from("product-images").upload(path,f,{upsert:false});if(up.error){msg.textContent="Image upload failed: "+up.error.message;return}image_url=supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;}
const payload={seller_id:u.id,title:fd.get("title"),category:fd.get("category"),price:Number(fd.get("price")),location:fd.get("location"),seller_phone:fd.get("phone"),description:fd.get("description"),image_url,status:"active"};
const {error}=await supabase.from("products").insert(payload);if(error){msg.textContent=error.message;return}msg.textContent="Listing published successfully.";form.reset();pre.innerHTML="";};
