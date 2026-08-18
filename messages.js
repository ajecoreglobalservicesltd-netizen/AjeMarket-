import {supabase,esc,user} from "./supabase.js";
const root=document.querySelector("#messages"),u=await user();if(!u){root.innerHTML='<p>Please <a href="account.html">sign in</a> to use messages.</p>'}else{root.innerHTML=`<div class="notice">Messaging is ready for buyer/seller conversations. Start a conversation from a product page in the next message update.</div><p class="mu
