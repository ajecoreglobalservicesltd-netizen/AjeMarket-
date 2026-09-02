import {createClient} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import {SUPABASE_URL,SUPABASE_KEY} from "./config.js";
export const supabase=createClient(SUPABASE_URL,SUPABASE_KEY);
export function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
export function money(v){return new Intl.NumberFormat("en-NG",{style:"currency",currency:"NGN",maximumFractionDigits:0}).format(Number(v||0));}
export async function user(){return (await supabase.auth.getUser()).data.user;}
export async function requireUser(){const u=await user();if(!u){location.href="account.html";return null}return u;}