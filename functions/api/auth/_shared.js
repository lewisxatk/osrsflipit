export const COOKIE="osrshub_session";
export const STATE_COOKIE="osrshub_oauth_state";
export const DISCORD_API="https://discord.com/api/v10";
export function b64u(bytes){let s="";for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"")}
export function ub64(s){s=s.replace(/-/g,"+").replace(/_/g,"/");while(s.length%4)s+="=";return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
export async function hmac(secret,text,verify=false,sigBytes=null){const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,verify?["verify"]:["sign"]);return verify?crypto.subtle.verify("HMAC",key,sigBytes,new TextEncoder().encode(text)):new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(text)))}
export function cookies(request){const raw=request.headers.get("Cookie")||"";return Object.fromEntries(raw.split(";").map(x=>x.trim()).filter(Boolean).map(x=>{const i=x.indexOf("=");return [x.slice(0,i),decodeURIComponent(x.slice(i+1))]}))}
export function cookie(name,value,maxAge){return `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`}
export function json(data,status=200,headers={}){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8",...headers}})}
export function redirect(url,headers={}){return new Response(null,{status:302,headers:{Location:url,...headers}})}
export function envOk(env){return !!(env.DISCORD_CLIENT_ID&&env.DISCORD_CLIENT_SECRET&&env.DISCORD_REDIRECT_URI&&env.OSRSHUB_AUTH_SECRET&&env.DB)}
export async function sessionUser(request,env){const c=cookies(request)[COOKIE];if(!c)return null;const [uid,exp,sig]=c.split(".");if(!uid||!exp||!sig||Number(exp)<Date.now())return null;const ok=await hmac(env.OSRSHUB_AUTH_SECRET,`${uid}.${exp}`,true,ub64(sig));if(!ok)return null;return env.DB.prepare("SELECT id,username,global_name,avatar FROM users WHERE id=?1").bind(uid).first()}
