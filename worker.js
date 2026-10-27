const UPSTREAM = "https://secure.runescape.com/m=hiscore_oldschool/index_lite.ws";
const DISCORD_API = "https://discord.com/api/v10";
const PRICES_API = "https://prices.runescape.wiki/api/v1/osrs";
const SESSION_COOKIE = "osrshub_session";
const STATE_COOKIE = "osrshub_oauth_state";
const CLOUD_KEYS = ["osrsflipit-profiles","osrsflipit-columns","osrsflipit-column-widths","osrsflipit-detail-tiles","osrsflipit-filters","osrsflipit-watch","osrsflipit-alerts","osrsflipit-rules","osrsflipit-mini-ge","osrsflipit-sound","osrsflipit-sound-volume","osrsflipit-sound-type","osrsflipit-theme","osrsflipit-chart-layers","osrsflipit-recipe-favs","osrsflipit-flip-log","osrsflipit-bankroll","osrsflipit-portfolio","osrshub-dashboard-pins","osrshub-account"];
function json(data,status=200,headers={}){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8",...headers}})}
const ADMIN_COOKIE='osrshub_admin';
const ADMIN_SESSION_MS=8*60*60*1000;
function constantTimeEqual(a,b){a=String(a||'');b=String(b||'');let diff=a.length^b.length;const n=Math.max(a.length,b.length);for(let i=0;i<n;i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0}
function bytesToB64Url(bytes){let binary='';for(const b of new Uint8Array(bytes))binary+=String.fromCharCode(b);return btoa(binary).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')}
async function adminSignature(secret,expires){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return bytesToB64Url(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`osrshub-admin-v1:${expires}`)))}
function readCookie(request,name){const raw=request.headers.get('Cookie')||'';for(const pair of raw.split(';')){const at=pair.indexOf('=');if(at<0)continue;if(pair.slice(0,at).trim()===name)return pair.slice(at+1).trim()}return ''}
async function isAdminSession(request,env){const secret=String(env.ADMIN_PASSWORD||'');if(!secret)return false;const value=readCookie(request,ADMIN_COOKIE),at=value.indexOf('.');if(at<1)return false;const expires=Number(value.slice(0,at)),signature=value.slice(at+1);if(!Number.isFinite(expires)||expires<Date.now()||expires>Date.now()+ADMIN_SESSION_MS+60000)return false;try{return constantTimeEqual(signature,await adminSignature(secret,expires))}catch{return false}}
async function adminAuth(request,env){const secret=String(env.ADMIN_PASSWORD||'');if(!secret)return json({ok:false,error:'Administrator access is not configured. Add the ADMIN_PASSWORD Worker secret first.'},503,{'Cache-Control':'no-store'});const url=new URL(request.url);if(request.method==='GET'&&url.pathname==='/api/admin/session'){const ok=await isAdminSession(request,env);return json({ok,expiresInMs:ok?Math.max(0,Number(readCookie(request,ADMIN_COOKIE).split('.')[0])-Date.now()):0},200,{'Cache-Control':'no-store'})}if(request.method==='POST'&&url.pathname==='/api/admin/login'){const origin=request.headers.get('Origin');if(origin&&origin!==url.origin)return json({ok:false,error:'Cross-origin administrator login rejected.'},403,{'Cache-Control':'no-store'});let body;try{body=await request.json()}catch{return json({ok:false,error:'Send the administrator password as JSON.'},400,{'Cache-Control':'no-store'})}if(!constantTimeEqual(body?.password,secret))return json({ok:false,error:'Incorrect administrator password.'},401,{'Cache-Control':'no-store'});const expires=Date.now()+ADMIN_SESSION_MS,signature=await adminSignature(secret,expires),cookie=`${ADMIN_COOKIE}=${expires}.${signature}; Path=/; Max-Age=${Math.floor(ADMIN_SESSION_MS/1000)}; HttpOnly; Secure; SameSite=Strict`;return json({ok:true,expiresAt:expires},200,{'Set-Cookie':cookie,'Cache-Control':'no-store'})}if(request.method==='POST'&&url.pathname==='/api/admin/logout')return json({ok:true},200,{'Set-Cookie':`${ADMIN_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`,'Cache-Control':'no-store'});return json({ok:false,error:'Administrator endpoint not found.'},404,{'Cache-Control':'no-store'})}

function cookies(request){const raw=request.headers.get("Cookie")||"";return Object.fromEntries(raw.split(";").map(x=>x.trim()).filter(Boolean).map(x=>{const i=x.indexOf("=");return [x.slice(0,i),decodeURIComponent(x.slice(i+1))]}))}
function cookie(name,value,maxAge){return `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`}
function redirect(url,headers={}){return new Response(null,{status:302,headers:{Location:url,...headers}})}
function b64u(bytes){let s="";for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"")}
function ub64(s){s=s.replace(/-/g,"+").replace(/_/g,"/");while(s.length%4)s+="=";return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
async function sign(secret,text){const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(text)))}
async function validSig(secret,text,sig){const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["verify"]);try{return await crypto.subtle.verify("HMAC",key,ub64(sig),new TextEncoder().encode(text))}catch{return false}}
function authConfigured(env){return !!(env.DB&&env.DISCORD_CLIENT_ID&&env.DISCORD_CLIENT_SECRET&&env.DISCORD_REDIRECT_URI&&env.OSRSHUB_AUTH_SECRET)}
function botConfigured(env){return !!env.DISCORD_BOT_TOKEN}
async function readUserData(env,userId){const row=await env.DB.prepare("SELECT data_json FROM user_data WHERE user_id=?1").bind(userId).first();if(!row?.data_json)return {};try{const d=JSON.parse(row.data_json);return d&&typeof d==="object"&&!Array.isArray(d)?d:{}}catch{return {}}}
async function writeUserData(env,userId,data){const raw=JSON.stringify(data||{});if(raw.length>900000)throw new Error("Saved data is too large to sync.");const now=Date.now();await env.DB.prepare("INSERT INTO user_data(user_id,data_json,updated_at) VALUES(?1,?2,?3) ON CONFLICT(user_id) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at").bind(userId,raw,now).run();return now}
async function discordBotRequest(env,path,options={}){if(!botConfigured(env))throw new Error("Discord bot integration is not configured.");const res=await fetch(`${DISCORD_API}${path}`,{...options,headers:{Authorization:`Bot ${env.DISCORD_BOT_TOKEN}`,"Content-Type":"application/json",...(options.headers||{})}});const text=await res.text();let body=null;try{body=JSON.parse(text)}catch{}if(!res.ok)throw new Error(body?.message||`Discord API returned ${res.status}`);return body}
async function sendDiscordDM(env,userId,payload){const channel=await discordBotRequest(env,"/users/@me/channels",{method:"POST",body:JSON.stringify({recipient_id:String(userId)})});if(!channel?.id)throw new Error("Discord did not return a DM channel.");await discordBotRequest(env,`/channels/${channel.id}/messages`,{method:"POST",body:JSON.stringify(payload)});return channel.id}
async function sendDiscordAlert(env,userId,a){const itemUrl=`${env.PUBLIC_ORIGIN||""}/?item=${encodeURIComponent(a.itemId)}`;return sendDiscordDM(env,userId,{embeds:[{title:`${a.name} alert triggered`,description:`**${a.metric}** ${a.metric==="roi"?"is":"reached"} **${a.metric==="roi"?Number(a.target).toFixed(2)+"%":Math.round(a.target).toLocaleString("en-GB")+" gp"}**`,color:0x8b5cf6,fields:[{name:"Current value",value:a.metric==="roi"?`${Number(a.value).toFixed(2)}%`:`${Math.round(a.value).toLocaleString("en-GB")} gp`,inline:true},{name:"Condition",value:`${a.direction||"threshold"}`,inline:true},{name:"Item",value:a.name,inline:true}],footer:{text:"OSRS Hub · Discord alerts"},timestamp:new Date(a.at).toISOString(),url:itemUrl||undefined,thumbnail:a.icon?{url:`https://prices.runescape.wiki/osrs/item/${a.itemId}/icon`}:undefined}]});}
async function currentUser(request,env){if(!authConfigured(env))return null;const c=cookies(request)[SESSION_COOKIE];if(!c)return null;const [uid,exp,sig]=c.split(".");if(!uid||!exp||!sig||Number(exp)<Date.now()||!(await validSig(env.OSRSHUB_AUTH_SECRET,`${uid}.${exp}`,sig)))return null;return env.DB.prepare("SELECT id,username,global_name,avatar FROM users WHERE id=?1").bind(uid).first()}
async function accountSync(request,env){
 const url=new URL(request.url);const player=String(url.searchParams.get("player")||"").trim().slice(0,12);if(!player)return json({error:"Player name required."},400);
 const quests=[];let levels={};let questSource="none";
 try{
  const qres=await fetch(`https://sync.runescape.wiki/runelite/player/${encodeURIComponent(player)}/STANDARD`,{headers:{"User-Agent":"OSRSHub/1.1 (account quest sync)"}});
  if(qres.ok){
   const q=await qres.json();
   if(q?.levels&&typeof q.levels==="object")levels=q.levels;
   const source=q?.quests&&typeof q.quests==="object"&&!Array.isArray(q.quests)?q.quests:{};
   for(const [title,state] of Object.entries(source)){const n=Number(state);quests.push({title,status:n>=2?"FINISHED":n===1?"IN_PROGRESS":"NOT_STARTED",state:n});}
   if(quests.length||Object.keys(levels).length)questSource="WikiSync";
  }
 }catch(e){console.warn("WikiSync account sync failed",e?.message)}
 if(!quests.length){
  try{
   const qres=await fetch(`https://apps.runescape.com/runemetrics/quests?user=${encodeURIComponent(player)}`,{headers:{"User-Agent":"OSRSHub/1.1 (account quest sync)"}});
   if(qres.ok){const q=await qres.json();for(const item of (Array.isArray(q)?q:(q?.quests||[]))){if(item?.title)quests.push({title:item.title,status:String(item.status||"UNKNOWN").toUpperCase(),difficulty:item.difficulty||"",members:!!item.members,questPoints:item.questPoints||0,userEligible:item.userEligible});}if(quests.length)questSource="RuneMetrics";}
  }catch(e){console.warn("RuneMetrics quest sync failed",e?.message)}
 }
 return json({player,levels,quests,questSource});
}
async function storedItemStatsFallback(env,{id=0,slot=''}){
 // Read-only last-known fallback. It deliberately does not refresh timestamps or write anything to D1.
 if(!env?.DB)return null;
 try{
  if(slot){
   const rows=await env.DB.prepare(`SELECT e.item_id AS id,COALESCE(i.name,d.name,c.name) AS name,COALESCE(i.icon,json_extract(d.data_json,'$.icon')) AS icon,COALESCE(e.slot,json_extract(d.data_json,'$.equipment.slot')) AS slot,e.attack_speed,e.requirements_json,e.bonuses_json,d.data_json AS detail_json,c.data_json AS catalog_json FROM osrs_equipment_catalog e LEFT JOIN osrs_items i ON i.item_id=e.item_id LEFT JOIN osrs_item_data d ON d.item_id=e.item_id LEFT JOIN osrs_catalog c ON c.entity_type='items' AND c.entity_id=e.item_id WHERE e.equipable=1 AND lower(COALESCE(e.slot,''))=?1 ORDER BY COALESCE(i.name,d.name,c.name) LIMIT 600`).bind(slot).all();
   const results={};for(const row of rows.results||[]){let detail={},catalog={},equipment={},requirements={};try{detail=JSON.parse(row.detail_json||'{}')}catch{}try{catalog=JSON.parse(row.catalog_json||'{}')}catch{}try{equipment=JSON.parse(row.bonuses_json||'{}')}catch{}try{requirements=JSON.parse(row.requirements_json||'{}')}catch{};const data={...catalog,...detail,id:Number(row.id),name:row.name||detail.name||catalog.name||String(row.id),icon:row.icon||detail.icon||null,equipment:{...equipment,slot:row.slot||equipment.slot||detail.equipment?.slot||slot,attack_speed:Number(row.attack_speed||equipment.attack_speed||detail.attack_speed||0),requirements:Object.keys(requirements).length?requirements:(detail.requirements||{})},requirements:Object.keys(requirements).length?requirements:(detail.requirements||{}),_osrshubFallback:true,_source:'OSRS Hub stored catalogue',_updatedAt:Number(detail.updated_at||catalog.updated_at||0)};results[String(row.id)]=data;}
   return Object.keys(results).length?{data:results,count:Object.keys(results).length}:null;
  }
  const row=await env.DB.prepare(`SELECT d.item_id AS id,d.name,d.data_json,d.updated_at,c.data_json AS catalog_json FROM osrs_item_data d LEFT JOIN osrs_catalog c ON c.entity_type='items' AND c.entity_id=d.item_id WHERE d.item_id=?1 LIMIT 1`).bind(id).first();
  if(row?.data_json){let data={};try{data=JSON.parse(row.data_json)}catch{};return {data:{...data,id:Number(row.id),name:row.name||data.name||String(id),_osrshubFallback:true,_source:'OSRS Hub stored OSRSBox record',_updatedAt:Number(row.updated_at||0)},updatedAt:Number(row.updated_at||0)}}
  const catalog=await env.DB.prepare("SELECT entity_id,name,data_json,updated_at FROM osrs_catalog WHERE entity_type='items' AND entity_id=?1 LIMIT 1").bind(id).first();
  if(catalog?.data_json){let data={};try{data=JSON.parse(catalog.data_json)}catch{};return {data:{...data,id:Number(catalog.entity_id),name:catalog.name||data.name||String(id),_osrshubFallback:true,_source:data._summary?'OSRS Hub item-name index':'OSRS Hub stored catalogue',_updatedAt:Number(catalog.updated_at||0)},updatedAt:Number(catalog.updated_at||0)}}
 }catch(e){console.warn('Stored item-data fallback unavailable',e?.message)}
 return null;
}
async function itemStats(request,env){
 const url=new URL(request.url),id=Number(url.searchParams.get('id')||0),slot=String(url.searchParams.get('slot')||'').toLowerCase(),allowed=['head','cape','neck','ammo','weapon','body','legs','shield','hands','feet','ring'];
 if(slot&&!allowed.includes(slot))return json({error:'Invalid equipment slot.'},400);
 if(!slot&&(!Number.isInteger(id)||id<1))return json({error:'Valid item id required.'},400);
 try{
  const urls=slot?[`https://www.osrsbox.com/osrsbox-db/items-json-slot/items-${slot}.json`,`https://raw.githubusercontent.com/osrsbox/osrsbox-db/master/docs/items-json-slot/items-${slot}.json`]:[`https://www.osrsbox.com/osrsbox-db/items-json/${id}.json`,`https://raw.githubusercontent.com/osrsbox/osrsbox-db/master/docs/items-json/${id}.json`];
  let lastStatus=502,lastError='';
  for(const target of urls){try{const r=await fetch(target,{headers:{'User-Agent':'OSRS Hub/1.3 (equipment analytics; OSRSBox item data)'},cf:{cacheTtl:slot?21600:86400,cacheEverything:true}});lastStatus=r.status;if(r.ok){const d=await r.json();return json(d,200,{'Cache-Control':slot?'public, max-age=21600, s-maxage=21600':'public, max-age=86400, s-maxage=86400','X-OSRSHub-Data-Source':target.includes('raw.githubusercontent.com')?'osrsbox-github-mirror':'osrsbox-static','X-OSRSHub-Data-Freshness':'upstream'})}lastError=`upstream returned HTTP ${r.status}`}catch(e){lastError=String(e?.message||'upstream request failed')}}
  const stored=await storedItemStatsFallback(env,{id,slot});
  if(stored){const body=slot?stored.data:stored.data;return json(body,200,{'Cache-Control':'no-store','X-OSRSHub-Data-Source':slot?'osrshub-d1-equipment-fallback':(stored.data._source||'osrshub-d1-fallback'),'X-OSRSHub-Data-Freshness':'stale-fallback','X-OSRSHub-Upstream-Status':String(lastStatus)})}
  return json({error:slot?'Equipment slot data is unavailable from both OSRSBox hosts and no stored fallback is available.':'Item data is unavailable from both OSRSBox hosts and no stored fallback is available.',sourceStatus:lastStatus,detail:lastError||'No cached catalogue record was found.'},lastStatus>=400?lastStatus:502,{'Cache-Control':'no-store','X-OSRSHub-Data-Freshness':'unavailable'});
 }catch(e){return json({error:'Item data request failed.',detail:String(e?.message||'unknown error').slice(0,160)},502,{'Cache-Control':'no-store'})}
}

async function auth(request,env){const url=new URL(request.url);if(!authConfigured(env)){return url.pathname==="/api/auth/me"?json({user:null,data:null,configured:false}):json({error:"Discord login is not configured yet."},503)}
 if(request.method==="GET"&&url.pathname==="/api/auth/discord"){const state=b64u(crypto.getRandomValues(new Uint8Array(24)));const u=new URL(`${DISCORD_API}/oauth2/authorize`);u.searchParams.set("client_id",env.DISCORD_CLIENT_ID);u.searchParams.set("redirect_uri",env.DISCORD_REDIRECT_URI);u.searchParams.set("response_type","code");u.searchParams.set("scope","identify");u.searchParams.set("state",state);return redirect(u.toString(),{"Set-Cookie":cookie(STATE_COOKIE,state,600)})}
 if(request.method==="GET"&&url.pathname==="/api/auth/callback"){const c=cookies(request),code=url.searchParams.get("code"),state=url.searchParams.get("state");if(!code||!state||state!==c[STATE_COOKIE])return redirect(`${url.origin}/?discord=error`);try{const tokenRes=await fetch(`${DISCORD_API}/oauth2/token`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:env.DISCORD_CLIENT_ID,client_secret:env.DISCORD_CLIENT_SECRET,grant_type:"authorization_code",code,redirect_uri:env.DISCORD_REDIRECT_URI})});const token=await tokenRes.json();if(!tokenRes.ok||!token.access_token)throw new Error("Discord token exchange failed");const userRes=await fetch(`${DISCORD_API}/users/@me`,{headers:{Authorization:`Bearer ${token.access_token}`}});const user=await userRes.json();if(!userRes.ok||!user.id)throw new Error("Discord identity lookup failed");const now=Date.now();await env.DB.prepare("INSERT INTO users(id,username,global_name,avatar,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6) ON CONFLICT(id) DO UPDATE SET username=excluded.username,global_name=excluded.global_name,avatar=excluded.avatar,updated_at=excluded.updated_at").bind(user.id,user.username||"",user.global_name||"",user.avatar||null,now,now).run();const exp=now+30*24*60*60*1000,base=`${user.id}.${exp}`,sig=b64u(await sign(env.OSRSHUB_AUTH_SECRET,base)),r=redirect(`${url.origin}/?discord=connected`);r.headers.append("Set-Cookie",cookie(SESSION_COOKIE,`${user.id}.${exp}.${sig}`,30*24*60*60));r.headers.append("Set-Cookie",cookie(STATE_COOKIE,"",0));return r}catch(e){console.error("Discord OAuth",e);return redirect(`${url.origin}/?discord=error`)}}
 if(request.method==="GET"&&url.pathname==="/api/auth/me"){const user=await currentUser(request,env);if(!user)return json({user:null,data:null});const row=await env.DB.prepare("SELECT data_json FROM user_data WHERE user_id=?1").bind(user.id).first();let data=null;try{data=row?.data_json?JSON.parse(row.data_json):null}catch{}return json({user,data})}
 if(request.method==="POST"&&url.pathname==="/api/auth/sync"){const user=await currentUser(request,env);if(!user)return json({error:"Not signed in."},401);const body=await request.json().catch(()=>null),incoming=body?.data;if(!incoming||typeof incoming!=="object"||Array.isArray(incoming))return json({error:"Invalid sync payload."},400);const existing=await readUserData(env,user.id);const data={...incoming};if(existing.osrshubDiscord)data.osrshubDiscord=existing.osrshubDiscord;const raw=JSON.stringify(data);if(raw.length>900000)return json({error:"Saved data is too large to sync."},413);const existingRow=await env.DB.prepare("SELECT data_json,updated_at FROM user_data WHERE user_id=?1").bind(user.id).first();if(existingRow?.data_json===raw)return json({ok:true,unchanged:true,updatedAt:Number(existingRow.updated_at||0)});const now=Date.now();await env.DB.prepare("INSERT INTO user_data(user_id,data_json,updated_at) VALUES(?1,?2,?3) ON CONFLICT(user_id) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at").bind(user.id,raw,now).run();return json({ok:true,updatedAt:now})}
 if(request.method==="POST"&&url.pathname==="/api/auth/logout")return json({ok:true},200,{"Set-Cookie":cookie(SESSION_COOKIE,"",0)});
 return json({error:"Not found"},404)}
async function discordIntegration(request,env){
 const user=await currentUser(request,env);if(!user)return json({error:"Not signed in."},401);
 if(request.method==="GET"&&new URL(request.url).pathname==="/api/discord/status"){const data=await readUserData(env,user.id),d=data.osrshubDiscord||{};return json({connected:!!d.connected,frequency:d.frequency||"instant",lastConnectedAt:d.lastConnectedAt||null,installUrl:`https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(env.DISCORD_CLIENT_ID)}&integration_type=1&scope=applications.commands`})}
 if(!botConfigured(env))return json({error:"Discord bot notifications are not configured on this Worker yet. Add DISCORD_BOT_TOKEN as a Worker secret."},503);
 if(request.method==="POST"&&new URL(request.url).pathname==="/api/discord/connect"){try{const data=await readUserData(env,user.id),body=await request.json().catch(()=>({})),frequency=["instant","5m","15m","30m","1h"].includes(body?.frequency)?body.frequency:"instant";const channelId=await sendDiscordDM(env,user.id,{content:`OSRS Hub Discord alerts are connected, ${user.global_name||user.username}. Your saved OSRS Hub price alerts can now notify you here. You can change notification frequency from the Alerts page.`});data.osrshubDiscord={connected:true,channelId,frequency,lastConnectedAt:Date.now(),nextAllowedAt:0,delivery:"dm"};await writeUserData(env,user.id,data);return json({ok:true,connected:true,frequency,delivery:"dm"})}catch(e){const msg=e?.message||"Could not open a Discord DM with this account.";return json({error:`${msg} If you have not installed OSRSHub to your Discord account yet, use the Add OSRSHub to Discord button first, then try Connect again.`},502)}}
 if(request.method==="POST"&&new URL(request.url).pathname==="/api/discord/test"){try{const data=await readUserData(env,user.id),d=data.osrshubDiscord;if(!d?.connected)return json({error:"Connect Discord alerts first."},400);await sendDiscordDM(env,user.id,{embeds:[{title:"OSRS Hub Discord alerts are working",description:"This is a test notification from your signed-in OSRS Hub account.",color:0x8b5cf6,footer:{text:"OSRS Hub · test notification"},timestamp:new Date().toISOString()}]});return json({ok:true})}catch(e){return json({error:e?.message||"Discord test failed."},502)}}
 if(request.method==="POST"&&new URL(request.url).pathname==="/api/discord/check"){try{const data=await readUserData(env,user.id),rows=await latestPriceRows();const result=await evaluateDiscordUser(env,user.id,data,rows,{force:true,origin:env.PUBLIC_ORIGIN||new URL(request.url).origin});return json({ok:true,...result})}catch(e){return json({error:e?.message||"Alert check failed."},502)}}
 if(request.method==="POST"&&new URL(request.url).pathname==="/api/discord/settings"){const body=await request.json().catch(()=>({})),frequency=["instant","5m","15m","30m","1h"].includes(body?.frequency)?body.frequency:"instant";const data=await readUserData(env,user.id),d=data.osrshubDiscord||{};if(!d.connected)return json({error:"Connect Discord alerts first."},400);data.osrshubDiscord={...d,frequency};await writeUserData(env,user.id,data);return json({ok:true,frequency})}
 if(request.method==="POST"&&new URL(request.url).pathname==="/api/discord/disconnect"){const data=await readUserData(env,user.id);delete data.osrshubDiscord;await writeUserData(env,user.id,data);return json({ok:true})}
 return json({error:"Not found"},404)}
async function fetchPricesApi(path,ttl=45){
 const clean=String(path||"/latest").startsWith("/")?String(path||"/latest"):`/${String(path||"latest")}`;
 const url=`${PRICES_API}${clean}`;
 const headers={"User-Agent":"OSRSHub/47.2 (Grand Exchange analytics; contact via OSRSHub)",Accept:"application/json"};
 let res=await fetch(url,{headers,cf:{cacheTtl:ttl,cacheEverything:true}});
 if(!res.ok){res=await fetch(url,{headers:{...headers,"User-Agent":"OSRSHub/47.2 (+https://osrshub.prices-app.workers.dev; Grand Exchange analytics)"},cf:{cacheTtl:ttl,cacheEverything:true}});}
 if(!res.ok)throw new Error(`Prices API returned ${res.status}`);
 const data=await res.json();
 return {data,headers:{"Cache-Control":`public, max-age=${ttl}, s-maxage=${ttl}`}};
}
async function latestPriceRows(){const result=await fetchPricesApi("/latest",30);return result.data?.data||{};}
async function priceProxy(request){
 const url=new URL(request.url);const path=url.pathname.replace(/^\/api\/prices/,"")||"/latest";const qs=url.search;
 try{const ttl=path.startsWith("/timeseries")?300:path==="/mapping"?86400:path==="/24h"?120:30;const result=await fetchPricesApi(path+qs,ttl);return new Response(JSON.stringify(result.data),{status:200,headers:{"Content-Type":"application/json; charset=utf-8",...result.headers,"Vary":"Accept"}})}catch(e){return json({error:e?.message||"Price service unavailable."},502)}
}
async function questDetails(request){
 const url=new URL(request.url);const name=String(url.searchParams.get("name")||"").trim().slice(0,120);if(!name)return json({error:"Quest name required."},400);
 const headers={"User-Agent":"OSRSHub/47.2 (quest pathway; contact via OSRSHub)",Accept:"application/json"};
 try{
  const apiBase="https://oldschool.runescape.wiki/api.php";
  const sectionsUrl=`${apiBase}?action=parse&page=${encodeURIComponent(name)}&prop=sections&format=json`;
  const sr=await fetch(sectionsUrl,{headers});if(!sr.ok)throw new Error(`Wiki quest lookup returned ${sr.status}`);const sj=await sr.json();
  const section=(sj?.parse?.sections||[]).find(x=>/^(requirements|requirements and recommendations)$/i.test(String(x.line||"")))||(sj?.parse?.sections||[]).find(x=>/requirements/i.test(String(x.line||"")));
  if(!section?.index)return json({name,source:"OSRS Wiki",requirements:[],quests:[],notes:["Requirements section was not available for this quest."]},200,{"Cache-Control":"public, max-age=21600"});
  const tr=await fetch(`${apiBase}?action=parse&page=${encodeURIComponent(name)}&prop=text&section=${encodeURIComponent(section.index)}&format=json`,{headers});if(!tr.ok)throw new Error(`Wiki quest requirements returned ${tr.status}`);const tj=await tr.json();
  const html=String(tj?.parse?.text?.["*"]||"");
  const li=[...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map(m=>m[1].replace(/<br\s*\/?>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g," ").trim()).filter(Boolean);
  const skills=["Attack","Strength","Defence","Hitpoints","Ranged","Prayer","Magic","Cooking","Woodcutting","Fletching","Fishing","Firemaking","Crafting","Smithing","Mining","Runecraft","Hunter","Construction","Thieving","Slayer","Farming","Herblore","Agility","Sailing"];
  const skillPattern=new RegExp(`(?:^|\\b)(\\d{1,3})\\s+(${skills.map(x=>x.replace(/[.*+?^${}()|[\\]\\\\]/g,"\\$&")).join("|")})(?:\\s|$)`,"i");
  const requirements=[],quests=[];
  for(const text of li){
   const clean=text.replace(/\[[^\]]*\]/g,"");const sm=clean.match(skillPattern);
   if(sm){requirements.push({type:"skill",skill:skills.find(x=>x.toLowerCase()===sm[2].toLowerCase())||sm[2],level:Number(sm[1]),text:clean});continue;}
   const qp=clean.match(/(\d{1,3})\s+quest points?/i);if(qp){requirements.push({type:"questpoints",level:Number(qp[1]),text:clean});continue;}
   if(/completion of the following quests?/i.test(clean)||/^(?:and )?completion of/i.test(clean))continue;
   if(/required to start|boostable|not boostable|higher recommended|recommended/i.test(clean)&&/\d/.test(clean)){requirements.push({type:"note",text:clean});continue;}
   if(clean.length>=3&&clean.length<=100&&!/^items? required/i.test(clean)&&!/^bring /i.test(clean))quests.push(clean);
  }
  const uniq=(arr,key)=>[...new Map(arr.map(x=>[key(x),x])).values()];
  return json({name,source:"OSRS Wiki",requirements:uniq(requirements,x=>JSON.stringify(x)),quests:[...new Set(quests)],rawBullets:li.slice(0,120)},200,{"Cache-Control":"public, max-age=21600"});
 }catch(e){return json({error:e?.message||"Quest requirements unavailable."},502)}
}
async function sendDiscordChannelMessage(env,channelId,payload){if(channelId)return discordBotRequest(env,`/channels/${channelId}/messages`,{method:"POST",body:JSON.stringify(payload)});throw new Error("No Discord alert channel is saved for this account.")}
function alertPayload(a,origin){const itemUrl=`${origin||""}/?item=${encodeURIComponent(a.itemId)}`;return {embeds:[{title:`${a.name} alert triggered`,description:`**${a.metric}** ${a.metric==="roi"?"is":"reached"} **${a.metric==="roi"?Number(a.target).toFixed(2)+"%":Math.round(a.target).toLocaleString("en-GB")+" gp"}**`,color:0x8b5cf6,fields:[{name:"Current value",value:a.metric==="roi"?`${Number(a.value).toFixed(2)}%`:`${Math.round(a.value).toLocaleString("en-GB")} gp`,inline:true},{name:"Condition",value:`${a.direction||"threshold"}`,inline:true},{name:"Item",value:a.name,inline:true}],footer:{text:"OSRS Hub · live GE alert"},timestamp:new Date(a.at).toISOString(),url:itemUrl||undefined,thumbnail:{url:`https://prices.runescape.wiki/osrs/item/${a.itemId}/icon`}}]};}
async function evaluateDiscordUser(env,userId,data,rows,{force=false,origin=""}={}){
 const d=data?.osrshubDiscord;if(!d?.connected||!d.channelId)return {sent:0,checked:0,errors:["Discord alerts are not connected for this account."]};
 const rules=Array.isArray(data["osrsflipit-rules"])?data["osrsflipit-rules"]:[];if(!rules.length)return {sent:0,checked:0,errors:["No alert rules are saved to this account."]};
 const state={...(d.ruleState||{})};let stateChanged=false;let sent=0;const errors=[];const fresh=[];
 for(const rule of rules){
  const itemId=Number(rule.itemId||rule.id||0);const raw=rows[String(itemId)]||rows[itemId];if(!raw)continue;
  const buy=Number(raw.high||0),sell=Number(raw.low||0),tax=Math.min(Math.floor(sell*.02),5000000),margin=buy>0&&sell>0?buy-sell-tax:0,roi=buy?margin/buy*100:0;
  const value=rule.metric==="buy"?buy:rule.metric==="sell"?sell:rule.metric==="margin"?margin:roi;const target=Number(rule.value)||0;const hit=rule.direction==="above"?value>=target:value<=target;const armed=state[rule.id]?.armed!==false;
  if(hit&&armed)fresh.push({id:crypto.randomUUID(),ruleId:rule.id,itemId,name:String(rule.name||"OSRS item"),metric:rule.metric,value,target,direction:rule.direction,at:Date.now()});
  else if(!hit&&!armed){state[rule.id]={...state[rule.id],armed:true};stateChanged=true;}
  else if(!hit&&armed&&force)state[rule.id]={armed:true,lastTriggered:state[rule.id]?.lastTriggered||0};
 }
 const cooldown={instant:0,"5m":300000,"15m":900000,"30m":1800000,"1h":3600000}[d.frequency||"instant"]||0;const now=Date.now();const allowed=force||Number(d.nextAllowedAt||0)<=now;
 if(fresh.length&&allowed){
  for(const a of fresh){try{await sendDiscordChannelMessage(env,d.channelId,alertPayload(a,origin));state[a.ruleId]={armed:false,lastTriggered:a.at};stateChanged=true;sent++;}catch(e){errors.push(`${a.name}: ${e?.message||"Discord delivery failed"}`);}}
  if(sent&&cooldown)d.nextAllowedAt=now+cooldown;else if(sent)d.nextAllowedAt=0;
 }
 if(stateChanged){data.osrshubDiscord={...d,ruleState:state};await writeUserData(env,userId,data);}
 return {sent,checked:rules.length,errors,blocked:fresh.length&&!allowed};
}
async function runDiscordAlertCron(env){
 if(!env.DB||!botConfigured(env))return;
 try{const rows=await latestPriceRows();const users=await env.DB.prepare("SELECT user_id,data_json FROM user_data WHERE data_json LIKE '%osrshubDiscord%'").all();for(const row of users.results||[]){let data;try{data=JSON.parse(row.data_json)}catch{continue}try{await evaluateDiscordUser(env,row.user_id,data,rows,{origin:env.PUBLIC_ORIGIN||""});}catch(e){console.warn("Discord user alert check failed",row.user_id,e?.message)}}}catch(e){console.warn("Discord alert cron failed",e?.message)}
}

// V51 data platform. Existing Discord/auth handlers remain above this block unchanged.
const DATA_SOURCE="RuneLite-fed GE market data via prices.runescape.wiki", DATA_SYNC_MS=1800000, MARKET_CURRENT_LIMIT=150, SNAPSHOT_INTERVAL_MS=3600000, D1_SOFT_WRITE_LIMIT=25000, OSRSBOX_API="https://api.osrsbox.com", WIKI_API="https://oldschool.runescape.wiki/api.php";
function ukHour(ts){try{return Number(new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",hour:"2-digit",hour12:false}).format(new Date(ts)))}catch{return new Date(ts).getUTCHours()}}
function utcDayKey(ts=Date.now()){return new Date(ts).toISOString().slice(0,10)}
async function d1Reserve(env,estimated,label="db") {
  if(!env.DB||estimated<=0)return true;
  try{
    const now=Date.now(),day=utcDayKey(now),row=await env.DB.prepare("SELECT value FROM data_meta WHERE key='d1_write_budget'").first();
    let state={day,writes:0};try{state=row?.value?JSON.parse(row.value):state}catch{}
    if(state.day!==day)state={day,writes:0};
    if(Number(state.writes||0)+estimated>D1_SOFT_WRITE_LIMIT){console.warn(`D1 write governor blocked ${label}: ${state.writes||0}+${estimated} > ${D1_SOFT_WRITE_LIMIT}`);return false;}
    state.writes=Number(state.writes||0)+estimated;
    await env.DB.prepare("INSERT INTO data_meta(key,value,updated_at) VALUES('d1_write_budget',?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(JSON.stringify(state),now).run();
    return true;
  }catch(e){console.warn("D1 write governor unavailable",e?.message);return false;}
}
async function d1WriteMeta(env,key,value){try{await env.DB.prepare("INSERT INTO data_meta(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(key,String(value),Date.now()).run()}catch{}}
async function recordDataSource(env,key,name,endpoint,status,error=null,cursor=null){
  if(!env.DB)return;const now=Date.now();try{if(!await d1Reserve(env,1,`source status ${key}`))return;await env.DB.prepare("INSERT INTO osrs_data_sources(source_key,source_name,endpoint,cursor,status,last_success,last_error) VALUES(?,?,?,?,?,?,?) ON CONFLICT(source_key) DO UPDATE SET source_name=excluded.source_name,endpoint=excluded.endpoint,cursor=excluded.cursor,status=excluded.status,last_success=CASE WHEN excluded.status='ok' THEN excluded.last_success ELSE osrs_data_sources.last_success END,last_error=excluded.last_error").bind(key,name,endpoint,cursor==null?null:String(cursor),status,status==='ok'?now:null,error?String(error).slice(0,240):null).run()}catch(e){console.warn('source registry update failed',key,e?.message)}}
function wikiPlainText(value){return String(value||'').replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi,' ').replace(/<ref\b[^/]*\/>/gi,' ').replace(/\{\{[\s\S]*?\}\}/g,' ').replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g,'$1').replace(/\[(?:https?:\/\/[^ ]+ )?([^\]]+)\]/g,'$1').replace(/<[^>]+>/g,' ').replace(/'{2,}/g,' ').replace(/={2,6}\s*([^=]+?)\s*={2,6}/g,' $1 ').replace(/&nbsp;|&amp;|&quot;|&#39;/g,' ').replace(/\[\[File:[^\]]+\]\]/gi,' ').replace(/\s+/g,' ').trim().slice(0,30000)}
async function snapshotSignals(env,now,latestData,map){
  if(!env.DB)return {events:0,hourly:0};
  let previous=null,previousAt=0;
  try{const row=await env.DB.prepare("SELECT captured_at,payload_json FROM market_snapshots ORDER BY captured_at DESC LIMIT 1").first();if(row?.payload_json){previous=JSON.parse(row.payload_json);previousAt=Number(row.captured_at||0)}}catch{}
  const hourRow=await env.DB.prepare("SELECT captured_at,payload_json FROM market_snapshots WHERE captured_at<=?1 ORDER BY captured_at DESC LIMIT 1").bind(now-55*60*1000).first().catch(()=>null);
  let hourly=null;try{hourly=hourRow?.payload_json?JSON.parse(hourRow.payload_json):null}catch{}
  const hour=ukHour(now),events=[],hourlyUpdates=[];
  const rows=Object.entries(latestData||{}).map(([id,r])=>({id:+id,r,m:map.get(+id)||{}})).filter(x=>x.r&&(Number(x.r.avgHighPrice||x.r.high||0)>0||Number(x.r.avgLowPrice||x.r.low||0)>0));
  // Events are the useful history: do not archive every market tick. Only liquid, material moves become rows.
  for(const x of rows){
    const id=x.id,current=Number(x.r.avgLowPrice||x.r.low||0),volume=Number(x.r.highPriceVolume||0)+Number(x.r.lowPriceVolume||0);
    if(!current||volume<250)continue;
    const prev=Number(previous?.[String(id)]?.avgLowPrice||previous?.[String(id)]?.low||0);
    if(prev>0){const pct=(current-prev)/prev*100,abs=Math.abs(current-prev);if(pct<=-8&&abs>=250)events.push([now,id,"sudden_drop",current,prev,pct,volume,hour,JSON.stringify({name:x.m.name||null})]);}
    const hp=Number(hourly?.[String(id)]?.avgLowPrice||hourly?.[String(id)]?.low||0);
    if(hp>0){const pct=(current-hp)/hp*100,abs=Math.abs(current-hp);if(pct<=-6&&abs>=250)events.push([now,id,"hourly_crash",current,hp,pct,volume,hour,JSON.stringify({name:x.m.name||null,comparedAt:hourRow?.captured_at||null})]);if(volume>=1000)hourlyUpdates.push([id,hour,pct,now]);}
  }
  const eventRows=events.slice(0,8),hourlyRows=hourlyUpdates.sort((a,b)=>Number((latestData?.[b[0]]?.highPriceVolume||0)+(latestData?.[b[0]]?.lowPriceVolume||0))-Number((latestData?.[a[0]]?.highPriceVolume||0)+(latestData?.[a[0]]?.lowPriceVolume||0))).slice(0,100);
  let eventWritten=0,hourlyWritten=0;
  if(eventRows.length&&await d1Reserve(env,eventRows.length,"market events")){
    const q=eventRows.map(e=>env.DB.prepare("INSERT INTO market_events(captured_at,item_id,event_type,current_price,previous_price,change_pct,volume,local_hour,source,details_json) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(...e));
    for(let i=0;i<q.length;i+=80)await env.DB.batch(q.slice(i,i+80));eventWritten=eventRows.length;
  }
  // Hourly behaviour is written once per hour, and only for a small liquid sample.
  const bucket=Math.floor(now/3600000),lastBucket=await env.DB.prepare("SELECT value FROM data_meta WHERE key='hourly_bucket'").first().catch(()=>null);
  if(Number(lastBucket?.value||-1)!==bucket&&hourlyRows.length&&await d1Reserve(env,hourlyRows.length*2+1,"hourly intelligence + overnight prices")){
    const q=hourlyRows.map(([id,h,pct,ts])=>env.DB.prepare("INSERT INTO market_hourly_stats(item_id,local_hour,samples,avg_change_pct,negative_samples,positive_samples,last_seen) VALUES(?,?,1,?,?,?,?) ON CONFLICT(item_id,local_hour) DO UPDATE SET samples=samples+1,avg_change_pct=((avg_change_pct*samples)+excluded.avg_change_pct)/(samples+1),negative_samples=negative_samples+CASE WHEN excluded.avg_change_pct<0 THEN 1 ELSE 0 END,positive_samples=positive_samples+CASE WHEN excluded.avg_change_pct>0 THEN 1 ELSE 0 END,last_seen=excluded.last_seen").bind(id,h,pct,pct<0?1:0,pct>0?1:0,ts));
    const historyQ=hourlyRows.map(([id,h,pct,ts])=>{const r=latestData?.[String(id)]||{},price=Number(r.avgLowPrice||r.low||r.avgHighPrice||r.high||0),volume=Number(r.highPriceVolume||0)+Number(r.lowPriceVolume||0);return price>0?env.DB.prepare("INSERT OR REPLACE INTO market_price_history(captured_at,item_id,price,volume,local_hour,source) VALUES(?,?,?,?,?,?)").bind(ts,id,Math.round(price),volume,h,DATA_SOURCE):null}).filter(Boolean);
    for(let i=0;i<q.length;i+=80)await env.DB.batch(q.slice(i,i+80));for(let i=0;i<historyQ.length;i+=80)await env.DB.batch(historyQ.slice(i,i+80));await d1WriteMeta(env,"hourly_bucket",bucket);hourlyWritten=hourlyRows.length;
  }
  return {previousAt,events:eventWritten,hourly:hourlyWritten};
}

async function isDataIngestionPaused(env){
  try{const r=await env.DB.prepare("SELECT value FROM data_meta WHERE key='data_ingestion_paused'").first();return String(r?.value||'0')==='1'}catch(e){console.warn('D1 pause flag unavailable; fail closed for ingestion',e?.message);return true}
}

async function syncOsrsMarket(env){
  if(!env.DB||await isDataIngestionPaused(env)){console.warn("OSRS data ingestion paused by D1 emergency stop");return;}
  const now=Date.now(),day=utcDayKey(now),m=await env.DB.prepare("SELECT updated_at FROM data_meta WHERE key='market_sync'").first();
  if(m&&now-Number(m.updated_at)<DATA_SYNC_MS)return;
  const h={"User-Agent":"OSRSHub/2.2 market platform"};
  const [a,b]=await Promise.all([fetch(`${PRICES_API}/latest`,{headers:h}),fetch(`${PRICES_API}/mapping`,{headers:h})]);
  if(!a.ok||!b.ok)throw new Error(`GE data unavailable (${a.status}/${b.status})`);
  const latest=await a.json(),mapping=await b.json(),map=new Map((Array.isArray(mapping)?mapping:[]).map(x=>[Number(x.id),x])),rows=Object.entries(latest.data||{});
  const signal=await snapshotSignals(env,now,latest.data||{},map);
  const snapshotRow=await env.DB.prepare("SELECT captured_at FROM market_snapshots ORDER BY captured_at DESC LIMIT 1").first().catch(()=>null);
  if(!snapshotRow||now-Number(snapshotRow.captured_at||0)>=SNAPSHOT_INTERVAL_MS){
    if(await d1Reserve(env,1,"market snapshot"))await env.DB.prepare("INSERT INTO market_snapshots(captured_at,source,payload_json) VALUES(?1,?2,?3)").bind(now,DATA_SOURCE,JSON.stringify(latest.data||{})).run();
  }
  // The frontend reads live prices directly from the price proxy. D1 only needs a small liquid intelligence cache.
  const priority=rows.map(([id,r])=>{const x=map.get(+id)||{},buy=Number(r.avgLowPrice||r.low||0),sell=Number(r.avgHighPrice||r.high||0),volume=Number(r.highPriceVolume||0)+Number(r.lowPriceVolume||0),margin=sell-buy-Math.min(Math.floor(sell*.02),5000000);return {id:+id,r,x,buy,sell,volume,score:volume*Math.max(1,Math.abs(margin))}}).filter(x=>x.buy>0||x.sell>0).sort((a,b)=>b.volume-a.volume).slice(0,MARKET_CURRENT_LIMIT);
  if(await d1Reserve(env,priority.length,"market current")){
    const q=priority.map(({id,r,x})=>env.DB.prepare("INSERT INTO market_current(item_id,high,low,high_time,low_time,high_volume,low_volume,avg_high,avg_low,limit_qty,name,examine,members,tradeable,icon,value,alch,last_seen) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(item_id) DO UPDATE SET high=excluded.high,low=excluded.low,high_time=excluded.high_time,low_time=excluded.low_time,high_volume=excluded.high_volume,low_volume=excluded.low_volume,avg_high=excluded.avg_high,avg_low=excluded.avg_low,limit_qty=excluded.limit_qty,name=excluded.name,examine=excluded.examine,members=excluded.members,tradeable=excluded.tradeable,icon=excluded.icon,value=excluded.value,alch=excluded.alch,last_seen=excluded.last_seen WHERE market_current.high IS NOT excluded.high OR market_current.low IS NOT excluded.low OR market_current.high_time IS NOT excluded.high_time OR market_current.low_time IS NOT excluded.low_time OR market_current.high_volume IS NOT excluded.high_volume OR market_current.low_volume IS NOT excluded.low_volume OR market_current.avg_high IS NOT excluded.avg_high OR market_current.avg_low IS NOT excluded.avg_low OR market_current.limit_qty IS NOT excluded.limit_qty OR market_current.name IS NOT excluded.name OR market_current.examine IS NOT excluded.examine OR market_current.members IS NOT excluded.members OR market_current.tradeable IS NOT excluded.tradeable OR market_current.icon IS NOT excluded.icon OR market_current.value IS NOT excluded.value OR market_current.alch IS NOT excluded.alch").bind(+id,+r.high||0,+r.low||0,+r.highTime||0,+r.lowTime||0,+r.highPriceVolume||0,+r.lowPriceVolume||0,+r.avgHighPrice||0,+r.avgLowPrice||0,+x.limit||0,x.name||null,x.examine||null,x.members?1:0,x.tradeable_on_ge?1:0,x.icon||null,+x.value||0,+x.highalch||0,now));
    for(let i=0;i<q.length;i+=80)await env.DB.batch(q.slice(i,i+80));
  }
  // Mapping/item metadata is static enough to update incrementally. Never rewrite the entire item catalogue every price tick.
  const mapCursorRow=await env.DB.prepare("SELECT value FROM data_meta WHERE key='mapping_cursor'").first().catch(()=>null);
  const mapCursor=Math.max(0,Number(mapCursorRow?.value||0));
  const mapEntries=Array.from(map.entries());
  if(mapEntries.length){
    const chunk=mapEntries.slice(mapCursor,mapCursor+100),nextCursor=(mapCursor+chunk.length)%mapEntries.length;
    if(chunk.length&&await d1Reserve(env,chunk.length,"incremental item mapping")){
      const itemQ=chunk.map(([id,x])=>env.DB.prepare("INSERT INTO osrs_items(item_id,name,examine,members,tradeable,icon,value,high_alch,ge_limit,stackable,noted,linked_id,data_json,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(item_id) DO UPDATE SET name=excluded.name,examine=excluded.examine,members=excluded.members,tradeable=excluded.tradeable,icon=excluded.icon,value=excluded.value,high_alch=excluded.high_alch,ge_limit=excluded.ge_limit,stackable=excluded.stackable,noted=excluded.noted,linked_id=excluded.linked_id,data_json=excluded.data_json,updated_at=excluded.updated_at WHERE osrs_items.name IS NOT excluded.name OR osrs_items.examine IS NOT excluded.examine OR osrs_items.members IS NOT excluded.members OR osrs_items.tradeable IS NOT excluded.tradeable OR osrs_items.icon IS NOT excluded.icon OR osrs_items.value IS NOT excluded.value OR osrs_items.high_alch IS NOT excluded.high_alch OR osrs_items.ge_limit IS NOT excluded.ge_limit OR osrs_items.stackable IS NOT excluded.stackable OR osrs_items.noted IS NOT excluded.noted OR osrs_items.linked_id IS NOT excluded.linked_id OR osrs_items.data_json IS NOT excluded.data_json").bind(id,x.name||null,x.examine||null,x.members?1:0,x.tradeable_on_ge?1:0,x.icon||null,+x.value||0,+x.highalch||0,+x.limit||0,x.stackable?1:0,x.noted?1:0,+x.linked_id||null,JSON.stringify(x),now));
      for(let i=0;i<itemQ.length;i+=80)await env.DB.batch(itemQ.slice(i,i+80));await d1WriteMeta(env,"mapping_cursor",nextCursor);
    }
  }
  await d1WriteMeta(env,"market_sync","ok");
  await recordDataSource(env,"prices-wiki-api","OSRS Wiki Prices API",`${PRICES_API}/latest + /mapping`,"ok",null,"live market + incremental mapping");
  // Retention cleanup is infrequent so DELETEs cannot silently consume the daily write budget every five minutes.
  const cleanupDay=await env.DB.prepare("SELECT value FROM data_meta WHERE key='cleanup_day'").first().catch(()=>null);
  if(cleanupDay?.value!==day){const cutHistory=now-30*86400000,cutSnapshots=now-45*86400000,cutEvents=now-120*86400000;const counts=await Promise.all([env.DB.prepare("SELECT COUNT(*) c FROM market_price_history WHERE captured_at<?").bind(cutHistory).first().catch(()=>({c:0})),env.DB.prepare("SELECT COUNT(*) c FROM market_snapshots WHERE captured_at<?").bind(cutSnapshots).first().catch(()=>({c:0})),env.DB.prepare("SELECT COUNT(*) c FROM market_events WHERE captured_at<?").bind(cutEvents).first().catch(()=>({c:0}))]);const cleanupEstimate=Number(counts[0]?.c||0)+Number(counts[1]?.c||0)+Number(counts[2]?.c||0)+3;if(await d1Reserve(env,cleanupEstimate,"retention cleanup")){await env.DB.prepare("DELETE FROM market_price_history WHERE captured_at<?1").bind(cutHistory).run().catch(()=>{});await env.DB.prepare("DELETE FROM market_snapshots WHERE captured_at<?1").bind(cutSnapshots).run().catch(()=>{});await env.DB.prepare("DELETE FROM market_events WHERE captured_at<?1").bind(cutEvents).run().catch(()=>{});await d1WriteMeta(env,"cleanup_day",day);}}
  console.log("OSRS market sync",JSON.stringify(signal));
}
const SKILLS=["Attack","Strength","Defence","Ranged","Prayer","Magic","Runecraft","Hitpoints","Crafting","Mining","Smithing","Fishing","Cooking","Firemaking","Woodcutting","Agility","Herblore","Thieving","Fletching","Slayer","Farming","Construction","Hunter","Sailing"];
async function seedCatalog(env){if(!env.DB)return;const count=await env.DB.prepare("SELECT COUNT(*) c FROM osrs_skills").first().catch(()=>null);if(Number(count?.c||0)>=SKILLS.length)return;for(let i=0;i<SKILLS.length;i++)await env.DB.prepare("INSERT OR IGNORE INTO osrs_skills(id,name,max_level,members) VALUES(?,?,99,?)").bind(i+1,SKILLS[i],i>4?1:0).run();}
async function fetchJsonFromMirrors(urls,headers={"User-Agent":"OSRSHub/1.3 static OSRSBox mirror"}){
 let lastStatus=502;for(const target of urls){try{const response=await fetch(target,{headers,cf:{cacheTtl:3600,cacheEverything:true}});lastStatus=response.status;if(response.ok)return {data:await response.json(),url:target}}catch{}}throw new Error(`Static mirror unavailable (last HTTP status ${lastStatus})`)
}
async function fetchOsrsBoxStaticBatch(env,dataset){
 const cursorKey=`osrsbox_${dataset}_static_cursor`,cursorRow=await env.DB.prepare("SELECT value FROM data_meta WHERE key=?").bind(cursorKey).first().catch(()=>null),cursor=Math.max(0,Number(cursorRow?.value||0));let entries=[],indexUrl='',recordBase='';
 if(dataset==='items'||dataset==='monsters'){
  const filename=dataset==='items'?'items-summary.json':'npcs-summary.json';const found=await fetchJsonFromMirrors([`https://www.osrsbox.com/osrsbox-db/${filename}`,`https://raw.githubusercontent.com/osrsbox/osrsbox-db/master/docs/${filename}`]);indexUrl=found.url;const raw=found.data;
  if(Array.isArray(raw))entries=raw.map(x=>({id:Number(x?.id??x?.item_id??x?.npc_id),name:String(x?.name||'').trim()}));
  else if(Array.isArray(raw?.items))entries=raw.items.map(x=>({id:Number(x?.id??x?.item_id??x?.npc_id),name:String(x?.name||'').trim()}));
  else entries=Object.entries(raw||{}).map(([key,value])=>({id:Number(value?.id??value?.item_id??value?.npc_id??key),name:String(value?.name??(typeof value==='string'?value:'')).trim()}));
  entries=entries.filter(x=>Number.isInteger(x.id)&&x.id>0).sort((a,b)=>a.id-b.id);recordBase=dataset==='items'?'items-json':'monsters-json';
 }else{
  const found=await fetchJsonFromMirrors(['https://api.github.com/repos/osrsbox/osrsbox-db/contents/docs/prayer-json?ref=master'],{"User-Agent":"OSRSHub/1.3 prayer static-data fallback","Accept":"application/vnd.github+json"});indexUrl=found.url;entries=(Array.isArray(found.data)?found.data:[]).filter(x=>x?.type==='file'&&/\.json$/i.test(x.name||'')).sort((a,b)=>a.name.localeCompare(b.name)).map((x,i)=>({id:i+1,name:x.name.replace(/\.json$/i,'').replaceAll('_',' '),file:x.name}));recordBase='prayer-json';
 }
 const batch=entries.slice(cursor,cursor+25),docs=await Promise.all(batch.map(async entry=>{const target=dataset==='prayers'?`https://raw.githubusercontent.com/osrsbox/osrsbox-db/master/docs/prayer-json/${entry.file}`:`https://raw.githubusercontent.com/osrsbox/osrsbox-db/master/docs/${recordBase}/${entry.id}.json`;try{const response=await fetch(target,{headers:{"User-Agent":"OSRSHub/1.3 static OSRSBox mirror"},cf:{cacheTtl:86400,cacheEverything:true}});if(!response.ok)return null;const raw=await response.json();return {...raw,id:Number(raw?.id??raw?.item_id??raw?.monster_id??raw?.prayer_id??entry.id),name:raw?.name||entry.name}}catch{return null}}));
 return {docs:docs.filter(Boolean),complete:cursor+batch.length>=entries.length,nextCursor:cursor+batch.length,endpoint:dataset==='items'?'https://raw.githubusercontent.com/osrsbox/osrsbox-db/master/docs/items-json/':dataset==='monsters'?'https://raw.githubusercontent.com/osrsbox/osrsbox-db/master/docs/monsters-json/':'https://raw.githubusercontent.com/osrsbox/osrsbox-db/master/docs/prayer-json/',indexUrl,source:'official OSRSBox GitHub static mirror',indexCount:entries.length};
}
async function syncOsrsBox(env,dataset,maxPages=2){
 const key=`osrsbox_${dataset}_page`,stateKey=`osrsbox_${dataset}_state`,m=await env.DB.prepare("SELECT value FROM data_meta WHERE key=?").bind(key).first();let page=Math.max(1,Number(m?.value||1)),all=[],complete=false,staticMode=false,staticNextCursor=null,sourceEndpoint=`${OSRSBOX_API}/${dataset}`;
 for(let i=0;i<Math.max(1,Math.min(3,Number(maxPages)||1));i++){
  try{const r=await fetch(`${OSRSBOX_API}/${dataset}?page=${page}`,{headers:{"User-Agent":"OSRSHub/1.3 data ingestion; OSRSBox item, monster and prayer catalogue"}});if(!r.ok)throw new Error(`${dataset} ${page}: ${r.status}`);const j=await r.json(),docs=Array.isArray(j)?j:(j.data||j.results||[]);if(!docs.length){complete=true;break}all.push(...docs);page++;if(docs.length<25){complete=true;break}}
  catch(apiError){if(all.length){console.warn(`OSRSBox ${dataset} paged API failed after a partial page; preserving fetched records`,apiError?.message);break}try{const fallback=await fetchOsrsBoxStaticBatch(env,dataset);if(!fallback.docs.length&&!fallback.complete)throw new Error('static mirror returned no valid records');all=fallback.docs;complete=fallback.complete;staticMode=true;staticNextCursor=fallback.nextCursor;sourceEndpoint=fallback.endpoint;console.warn(`OSRSBox ${dataset} REST API unavailable; using static mirror`,apiError?.message);break}catch(fallbackError){throw new Error(`${apiError?.message||'REST API unavailable'}; static mirror fallback failed: ${fallbackError?.message||'unknown error'}`)}}
 }
 const table=dataset==='items'?'osrs_item_data':dataset==='monsters'?'osrs_monster_data':'osrs_prayer_data',idcol=dataset==='items'?'item_id':dataset==='monsters'?'monster_id':'prayer_id',now=Date.now();
 const valid=all.filter(x=>x&&(x.id??x.item_id??x.monster_id??x.prayer_id)!=null).map(x=>({...x,id:Number(x.id??x.item_id??x.monster_id??x.prayer_id)})).filter(x=>Number.isInteger(x.id)&&x.id>0);
 const q=valid.map(x=>env.DB.prepare(`INSERT INTO ${table}(${idcol},name,data_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(${idcol}) DO UPDATE SET name=excluded.name,data_json=excluded.data_json,updated_at=excluded.updated_at`).bind(+x.id,x.name||null,JSON.stringify(x),now));
 const c=valid.map(x=>env.DB.prepare("INSERT INTO osrs_catalog(entity_type,entity_id,name,members,searchable,data_json,updated_at) VALUES(?,?,?,?,1,?,?) ON CONFLICT(entity_type,entity_id) DO UPDATE SET name=excluded.name,members=excluded.members,data_json=excluded.data_json,updated_at=excluded.updated_at").bind(dataset,+x.id,x.name||null,x.members?1:0,JSON.stringify(x),now));
 const nq=dataset==='monsters'?valid.map(x=>{const levels=x.stats||x.levels||{};return env.DB.prepare("INSERT INTO osrs_npcs(npc_id,name,combat_level,hitpoints,attack_level,strength_level,defence_level,ranged_level,magic_level,attributes_json,data_json,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(npc_id) DO UPDATE SET name=excluded.name,combat_level=excluded.combat_level,hitpoints=excluded.hitpoints,attack_level=excluded.attack_level,strength_level=excluded.strength_level,defence_level=excluded.defence_level,ranged_level=excluded.ranged_level,magic_level=excluded.magic_level,attributes_json=excluded.attributes_json,data_json=excluded.data_json,updated_at=excluded.updated_at").bind(+x.id,x.name||null,+x.combat_level||+x.combat||0,+x.hitpoints||+x.hp||0,+levels.attack||x.attack||0,+levels.strength||x.strength||0,+levels.defence||x.defence||0,+levels.ranged||x.ranged||0,+levels.magic||x.magic||0,JSON.stringify(x.attributes||x.attribute||[]),JSON.stringify(x),now)}):[];
 const eq=dataset==='items'?valid.filter(x=>x.equipment||x.equipment_slot||x.slot).map(x=>{const e=x.equipment||{};const slot=e.slot||x.equipment_slot||x.slot||null;const req=e.requirements||x.requirements||{};return env.DB.prepare("INSERT INTO osrs_equipment_catalog(item_id,slot,equipable,weapon,two_handed,attack_speed,requirements_json,bonuses_json,updated_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(item_id) DO UPDATE SET slot=excluded.slot,equipable=excluded.equipable,weapon=excluded.weapon,two_handed=excluded.two_handed,attack_speed=excluded.attack_speed,requirements_json=excluded.requirements_json,bonuses_json=excluded.bonuses_json,updated_at=excluded.updated_at").bind(+x.id,slot,1,e.weapon?1:0,e.two_handed?1:0,Number(e.attack_speed||x.attack_speed||0),JSON.stringify(req),JSON.stringify(e),now)}):[];
 const estimatedWrites=q.length+c.length+nq.length+eq.length;
 // Reserve the entire batch before writing any tables so a D1 budget stop cannot leave a half-ingested page.
 if(estimatedWrites&&!await d1Reserve(env,estimatedWrites,`OSRSBox ${dataset} catalogue batch`)){await recordDataSource(env,`osrsbox-${dataset}`,`OSRSBox ${dataset}`,sourceEndpoint,"budget-paused","Daily D1 write governor blocked this batch",page);return {written:false,count:0,complete:false,page};}
 for(const batch of [q,c,nq,eq])for(let i=0;i<batch.length;i+=80)await env.DB.batch(batch.slice(i,i+80));
 await env.DB.prepare("INSERT INTO data_meta(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(key,complete?'complete':String(page),now).run();
 await env.DB.prepare("INSERT INTO data_meta(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(stateKey,complete?'complete':'in-progress',now).run();if(staticMode&&staticNextCursor!=null)await d1WriteMeta(env,`osrsbox_${dataset}_static_cursor`,String(staticNextCursor));
 await recordDataSource(env,`osrsbox-${dataset}`,`OSRSBox ${dataset}`,sourceEndpoint,"ok",null,complete?"complete":(staticMode?staticNextCursor:page));
 return {written:true,count:valid.length,complete,page:staticMode?staticNextCursor:page,source:staticMode?'static mirror':'REST API'};
}
async function syncOsrsBoxSummary(env){
 if(!env.DB||await isDataIngestionPaused(env))return;
 const now=Date.now(),cursorKey='osrsbox_items_summary_cursor',stateKey='osrsbox_items_summary_state',completedKey='osrsbox_items_summary_completed_at';
 let state=await env.DB.prepare("SELECT value FROM data_meta WHERE key=?").bind(stateKey).first().catch(()=>null),cursorRow=await env.DB.prepare("SELECT value FROM data_meta WHERE key=?").bind(cursorKey).first().catch(()=>null),offset=Math.max(0,Number(cursorRow?.value||0));
 const completedAt=await env.DB.prepare("SELECT value FROM data_meta WHERE key=?").bind(completedKey).first().catch(()=>null);
 if(state?.value==='complete'&&now-Number(completedAt?.value||0)<7*86400000)return;
 if(state?.value==='complete'){offset=0;await d1WriteMeta(env,cursorKey,'0');await d1WriteMeta(env,stateKey,'in-progress')}
 try{
  // The static summary is edge-cached for 24h. We page its names/IDs into D1 instead of storing a huge JSON blob in one row.
  let raw,lastStatus=502,summarySource='';for(const target of ['https://www.osrsbox.com/osrsbox-db/items-summary.json','https://raw.githubusercontent.com/osrsbox/osrsbox-db/master/docs/items-summary.json']){try{const response=await fetch(target,{headers:{"User-Agent":"OSRSHub/2.3 (OSRS item index; OSRSBox static summary)"},cf:{cacheTtl:86400,cacheEverything:true}});lastStatus=response.status;if(response.ok){raw=await response.json();summarySource=target;break}}catch{}}if(!raw)throw new Error(`items-summary.json unavailable from OSRSBox and GitHub mirror (last status ${lastStatus})`);
  let entries;
  if(Array.isArray(raw))entries=raw.map(x=>({id:Number(x?.id??x?.item_id),name:String(x?.name||'').trim()}));
  else if(Array.isArray(raw?.items))entries=raw.items.map(x=>({id:Number(x?.id??x?.item_id),name:String(x?.name||'').trim()}));
  else entries=Object.entries(raw||{}).map(([key,value])=>({id:Number(value?.id??value?.item_id??key),name:String(value?.name??(typeof value==='string'?value:'')).trim()}));
  const unique=new Map(entries.filter(x=>Number.isInteger(x.id)&&x.id>0&&x.name).map(x=>[x.id,{id:x.id,name:x.name.slice(0,180)}])),items=[...unique.values()].sort((a,b)=>a.id-b.id);
  if(!items.length)throw new Error('OSRSBox summary returned no valid item IDs');
  if(offset>=items.length){await d1WriteMeta(env,stateKey,'complete');await d1WriteMeta(env,completedKey,now);await recordDataSource(env,'osrsbox-item-summary','OSRSBox complete item summary',summarySource||'https://www.osrsbox.com/osrsbox-db/items-summary.json','ok',null,'complete');return}
  const batch=items.slice(offset,offset+50),next=offset+batch.length,complete=next>=items.length;
  const q=batch.map(x=>env.DB.prepare("INSERT INTO osrs_catalog(entity_type,entity_id,name,members,searchable,data_json,updated_at) VALUES('items',?,?,0,1,?,?) ON CONFLICT(entity_type,entity_id) DO UPDATE SET name=excluded.name,searchable=1,data_json=excluded.data_json,updated_at=excluded.updated_at WHERE json_extract(osrs_catalog.data_json,'$._summary')=1 OR length(osrs_catalog.data_json)<=length(excluded.data_json)").bind(x.id,x.name,JSON.stringify({_summary:true,id:x.id,name:x.name,source:'OSRSBox items-summary.json',detailStatus:'summary-only'}),now));
  if(!await d1Reserve(env,q.length+1,'OSRSBox item summary index')){await recordDataSource(env,'osrsbox-item-summary','OSRSBox complete item summary','https://www.osrsbox.com/osrsbox-db/items-summary.json','budget-paused','Daily D1 write governor blocked this batch',offset);return}
  for(let i=0;i<q.length;i+=80)await env.DB.batch(q.slice(i,i+80));await d1WriteMeta(env,cursorKey,String(next));await d1WriteMeta(env,stateKey,complete?'complete':'in-progress');if(complete)await d1WriteMeta(env,completedKey,now);await recordDataSource(env,'osrsbox-item-summary','OSRSBox complete item summary',summarySource||'https://www.osrsbox.com/osrsbox-db/items-summary.json','ok',null,complete?'complete':next);
 }catch(e){await recordDataSource(env,'osrsbox-item-summary','OSRSBox complete item summary','https://www.osrsbox.com/osrsbox-db/items-summary.json','error',e?.message,offset);console.warn('OSRSBox item summary unavailable',e?.message)}
}
const WIKI_CONTENT_PAGES=[
 ["skills","Skills"],["quests","Quests"],["monsters","Monsters"],["npcs","Non-player character"],["bosses","Boss"],["equipment","Equipment"],["weapons","Weapons"],["armour","Armour"],["spells","Spells"],["prayers","Prayer"],["activities","Activities"],["minigames","Minigames"],["diaries","Achievement Diaries"],["clues","Clue Scrolls"],["slayer","Slayer"],["combat","Combat"],["raids","Raids"],["skilling","Skilling"],["money_making","Money making guide"],["drop_tables","Drop table"],["npc_drops","Drop table"],["locations","Locations"],["teleports","Teleportation"],["food","Food"],["potions","Potions"],["items","Item"],["amulets","Amulet"],["rings","Rings"],["runecraft","Runecraft"],["herblore","Herblore"],["farming","Farming"],["construction","Construction"],["agility","Agility"],["thieving","Thieving"],["fishing","Fishing"],["mining","Mining"],["smithing","Smithing"],["fletching","Fletching"],["woodcutting","Woodcutting"],["firemaking","Firemaking"],
 ["boss","Vorkath"],["boss","Zulrah"],["boss","Theatre of Blood"],["boss","Chambers of Xeric"],["boss","Tombs of Amascut"],["boss","Alchemical Hydra"],["boss","Phantom Muspah"],["boss","Corrupted Gauntlet"],["boss","Barrows"],["boss","God Wars Dungeon"],["method","Slayer task"],["method","High Level Alchemy"],["method","Grand Exchange"],["method","Runecraft"],["method","Herblore"],["method","Agility"],["method","Farming"],["method","Construction"],["method","Ironman Mode"],["method","Quest experience rewards"]
];
async function syncWikiContent(env){
 if(!env.DB||await isDataIngestionPaused(env))return;
 const now=Date.now();let cursor=0;
 try{
  const gate=await env.DB.prepare("SELECT value FROM data_meta WHERE key='wiki_content_gate'").first().catch(()=>null);
  if(gate&&now-Number(gate.value||0)<2*60*60*1000)return;
  const row=await env.DB.prepare("SELECT value FROM data_meta WHERE key='wiki_content_cursor'").first();cursor=Math.max(0,Number(row?.value||0))%WIKI_CONTENT_PAGES.length;
  let success=0,errors=0;
  // A few pages per scheduled window give the Brain broader coverage without bulk-writing a huge Wiki dump.
  for(let offset=0;offset<3;offset++){
   const index=(cursor+offset)%WIKI_CONTENT_PAGES.length,[type,page]=WIKI_CONTENT_PAGES[index],u=new URL(WIKI_API);
   u.searchParams.set('action','parse');u.searchParams.set('page',page);u.searchParams.set('prop','wikitext|sections|links');u.searchParams.set('pllimit','100');u.searchParams.set('format','json');u.searchParams.set('formatversion','2');
   try{
    const r=await fetch(u,{headers:{"User-Agent":"OSRSHub/2.3 (OSRS reference index; respectful Wiki API client)"}});
    if(!r.ok){errors++;await recordDataSource(env,"osrs-wiki-content","Old School RuneScape Wiki",WIKI_API,"partial",`HTTP ${r.status} for ${page}`,index);continue;}
    const j=await r.json(),parsed=j?.parse||{},rawValue=parsed.wikitext,raw=String(typeof rawValue==='string'?rawValue:rawValue?.['*']||'').slice(0,90000),plain=wikiPlainText(raw);
    const sections=(Array.isArray(parsed.sections)?parsed.sections:[]).slice(0,60).map(x=>({title:String(x.line||x.anchor||'').slice(0,120),level:Number(x.level||0),anchor:String(x.anchor||'').slice(0,120)}));
    const links=(Array.isArray(parsed.links)?parsed.links:[]).filter(x=>x&&x.ns===0&&x.exists!==false).slice(0,100).map(x=>String(x['*']||x.title||'').slice(0,120)).filter(Boolean);
    if(!raw||j?.error){errors++;continue;}
    if(!await d1Reserve(env,4,`Wiki knowledge ${page}`)){errors++;continue;}
    const payload={page,type,source:'Old School RuneScape Wiki',sourceUrl:`https://oldschool.runescape.wiki/w/${encodeURIComponent(page.replaceAll(' ','_'))}`,capturedAt:now,plainText:plain,wikitext:raw,sections,links};
    await env.DB.prepare("INSERT INTO osrs_content_catalog(content_type,name,data_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(content_type,name) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at").bind(type,page,JSON.stringify(payload),now).run();success++;
   }catch(e){errors++;console.warn('Wiki page ingest failed',page,e?.message)}
  }
  const next=(cursor+3)%WIKI_CONTENT_PAGES.length;await d1WriteMeta(env,'wiki_content_cursor',String(next));await d1WriteMeta(env,'wiki_content_gate',now);
  await recordDataSource(env,"osrs-wiki-content","Old School RuneScape Wiki",WIKI_API,errors?(success?"partial":"error"):"ok",errors?`${errors} page(s) failed during this batch`:null,next);
 }catch(e){await recordDataSource(env,"osrs-wiki-content","Old School RuneScape Wiki",WIKI_API,"error",e?.message,cursor);console.warn('Wiki content sync',e?.message)}
}
async function syncRichData(env){
  if(!env.DB||await isDataIngestionPaused(env))return;
  const gate=await env.DB.prepare("SELECT value FROM data_meta WHERE key='rich_sync_gate'").first().catch(()=>null),now=Date.now();
  if(gate&&now-Number(gate.value||0)<60*60*1000)return;
  // Process all three OSRSBox families in a controlled batch. One 25-record page per family per hour
  // is intentionally paced: it expands the knowledge base while leaving headroom for live market writes.
  for(const dataset of ['items','monsters','prayers']){
    const done=await env.DB.prepare("SELECT value FROM data_meta WHERE key=?").bind(`osrsbox_${dataset}_state`).first().catch(()=>null);
    if(done?.value==='complete')continue;
    try{await syncOsrsBox(env,dataset,1)}catch(e){await recordDataSource(env,`osrsbox-${dataset}`,`OSRSBox ${dataset}`,`${OSRSBOX_API}/${dataset}`,"error",e?.message);console.warn('OSRSBox sync',dataset,e?.message)}
  }
  try{await syncOsrsBoxSummary(env)}catch(e){console.warn('OSRSBox summary index',e?.message)}
  await d1WriteMeta(env,'rich_sync_gate',now);
}
async function dataApi(request,env){
 const u=new URL(request.url);
 if(u.pathname==='/api/data/health'){
  const names=['market_current','market_snapshots','market_events','market_hourly_stats','market_price_history','osrs_item_data','osrs_monster_data','osrs_prayer_data','osrs_items','osrs_npcs','osrs_catalog','osrs_equipment_catalog','osrs_drop_tables','osrs_content_catalog'];
  const tableChecks=await Promise.all(names.map(async table=>{try{const row=await env.DB.prepare(`SELECT COUNT(*) c FROM ${table}`).first();return {table,count:Number(row?.c||0),ok:true}}catch(error){return {table,count:0,ok:false,error:String(error?.message||'table check failed').slice(0,140)}}}));
  const out={ok:true,source:DATA_SOURCE};tableChecks.forEach(check=>out[check.table.replaceAll('_','')]=check.count);out.schema={checked:tableChecks.length,missingOrUnavailable:tableChecks.filter(x=>!x.ok).map(x=>({table:x.table,error:x.error})),healthy:tableChecks.every(x=>x.ok)};const budgetRow=await env.DB.prepare("SELECT value FROM data_meta WHERE key='d1_write_budget'").first().catch(()=>null);let budget={day:utcDayKey(),writes:0};try{if(budgetRow?.value)budget=JSON.parse(budgetRow.value)}catch{}out.d1Writer={day:budget.day,writes:Number(budget.writes||0),softLimit:D1_SOFT_WRITE_LIMIT,remaining:Math.max(0,D1_SOFT_WRITE_LIMIT-Number(budget.writes||0)),percent:Math.min(100,Math.round(Number(budget.writes||0)/D1_SOFT_WRITE_LIMIT*100)),status:Number(budget.writes||0)>=D1_SOFT_WRITE_LIMIT?'blocked':Number(budget.writes||0)>=D1_SOFT_WRITE_LIMIT*.8?'near-limit':'within-budget',kind:'internal-estimate',authoritative:false,note:'Internal safety ceiling is 25,000 estimated writes/day. Compare with Cloudflare D1 Rows written; this counter estimates attempted row operations and is not the platform billing metric.'};const metaRows=await env.DB.prepare("SELECT key,value,updated_at FROM data_meta WHERE key IN ('data_ingestion_paused','market_sync','mapping_cursor','wiki_content_gate','rich_sync_gate','d1_write_budget')").all().catch(()=>({results:[]}));out.ingestionPaused=(metaRows.results||[]).some(x=>x.key==='data_ingestion_paused'&&String(x.value)==='1');out.dataMeta=Object.fromEntries((metaRows.results||[]).map(x=>[x.key,{value:x.value,updatedAt:Number(x.updated_at||0)}]));out.lastMarketSyncAt=Number(out.dataMeta.market_sync?.updatedAt||0)||null;out.marketSyncAgeMinutes=out.lastMarketSyncAt?Math.round((Date.now()-out.lastMarketSyncAt)/60000):null;out.marketItems=out.marketcurrent||0;out.snapshots=out.marketsnapshots||0;out.items=out.osrsitemdata||0;out.monsters=out.osrsmonsterdata||0;out.prayers=out.osrsprayerdata||0;out.itemsDatabase=out.osrsitems||0;out.npcs=out.osrsnpcs||0;out.checks={databaseConnected:true,schemaHealthy:out.schema.healthy,marketCachePresent:(out.marketcurrent||0)>0,marketSyncSeen:!!out.lastMarketSyncAt,ingestionPaused:out.ingestionPaused,writerBudgetUnderSoftLimit:Number(budget.writes||0)<=D1_SOFT_WRITE_LIMIT};out.dataSources=await env.DB.prepare("SELECT source_key,source_name,endpoint,cursor,status,last_success,last_error FROM osrs_data_sources ORDER BY source_key LIMIT 30").all().then(x=>(x.results||[]).map(r=>({key:r.source_key,name:r.source_name,endpoint:r.endpoint,cursor:r.cursor,status:r.status,lastSuccess:Number(r.last_success||0)||null,lastError:r.last_error||null,ageMinutes:r.last_success?Math.max(0,Math.round((Date.now()-Number(r.last_success))/60000)):null}))).catch(()=>[]);out.knowledge={catalogue:out.osrscatalog||0,itemRecords:out.osrsitemdata||0,itemNameIndex:await env.DB.prepare("SELECT COUNT(*) c FROM osrs_catalog WHERE entity_type='items'").first().then(x=>Number(x?.c||0)).catch(()=>0),summaryOnlyItems:await env.DB.prepare("SELECT COUNT(*) c FROM osrs_catalog WHERE entity_type='items' AND json_extract(data_json,'$._summary')=1").first().then(x=>Number(x?.c||0)).catch(()=>0),monsterRecords:out.osrsmonsterdata||0,prayerRecords:out.osrsprayerdata||0,wikiPages:out.osrscontentcatalog||0,equipmentRecords:out.osrsequipmentcatalog||0,sourceCount:out.dataSources.length};return json(out)
 }
 if(u.pathname==='/api/data/movement'){
  // Read-only movement analysis from the compact hourly history already collected by the market sync.
  // This endpoint performs no writes and deliberately reports coverage so sparse histories are not presented as reliable trends.
  const windowKey=String(u.searchParams.get('window')||'24h');
  if(!['24h','7d'].includes(windowKey))return json({ok:false,error:'Unsupported movement window. Use 24h or 7d.'},400);
  const windowMs=windowKey==='7d'?7*86400000:24*3600000;
  const now=Date.now(),start=now-windowMs,expected=Math.max(2,Math.floor(windowMs/3600000));
  const result=await env.DB.prepare(`WITH ranked AS (
    SELECT item_id,price,volume,captured_at,
      ROW_NUMBER() OVER (PARTITION BY item_id ORDER BY captured_at ASC) AS rn_first,
      ROW_NUMBER() OVER (PARTITION BY item_id ORDER BY captured_at DESC) AS rn_last,
      COUNT(*) OVER (PARTITION BY item_id) AS sample_count
    FROM market_price_history
    WHERE captured_at>=?1 AND captured_at<=?2
  )
  SELECT r.item_id,
    MAX(CASE WHEN r.rn_first=1 THEN r.price END) AS start_price,
    MAX(CASE WHEN r.rn_last=1 THEN r.price END) AS end_price,
    MAX(CASE WHEN r.rn_first=1 THEN r.captured_at END) AS start_at,
    MAX(CASE WHEN r.rn_last=1 THEN r.captured_at END) AS end_at,
    MAX(r.sample_count) AS sample_count,
    AVG(r.volume) AS avg_volume,
    m.name,m.icon
  FROM ranked r LEFT JOIN market_current m ON m.item_id=r.item_id
  GROUP BY r.item_id,m.name,m.icon
  HAVING MAX(r.sample_count)>=2
  ORDER BY ABS((MAX(CASE WHEN r.rn_last=1 THEN r.price END)-MAX(CASE WHEN r.rn_first=1 THEN r.price END))*1.0/NULLIF(MAX(CASE WHEN r.rn_first=1 THEN r.price END),0)) DESC
  LIMIT 300`).bind(start,now).all().catch(()=>({results:[]}));
  const rows=(result.results||[]).map(x=>{
    const first=Number(x.start_price||0),last=Number(x.end_price||0),samples=Number(x.sample_count||0),elapsed=Math.max(0,(Number(x.end_at||0)-Number(x.start_at||0))/3600000);
    const completeness=Math.max(0,Math.min(100,Math.round(samples/expected*100)));
    return {itemId:Number(x.item_id),name:x.name||String(x.item_id),icon:x.icon||null,startPrice:first,endPrice:last,startAt:Number(x.start_at||0),endAt:Number(x.end_at||0),samples,averageVolume:Math.round(Number(x.avg_volume||0)),changeGp:last-first,changePct:first?(last-first)/first*100:0,elapsedHours:Math.round(elapsed*10)/10,expectedSamples:expected,completeness,quality:completeness>=75?'good':completeness>=35?'partial':'sparse'};
  }).filter(x=>x.startPrice>0&&x.endPrice>0);
  return json({ok:true,window:windowKey,source:'OSRS Hub stored hourly market observations',generatedAt:now,historyRows:rows.length,results:rows,notice:'Movement compares the earliest and latest stored observations in the selected window. Coverage is not a fill guarantee; sparse histories are labelled.'},200,{'Cache-Control':'public, max-age=60'});
 }
 if(u.pathname==='/api/data/equipment'){
  // Read-only equipment lookup from the OSRS Hub catalogue. It enriches stored OSRSBox data with the latest compact GE cache and never writes to D1.
  if(request.method!=='GET')return json({ok:false,error:'Use GET for equipment catalogue reads.'},405,{'Allow':'GET'});
  const allowed=new Set(['head','cape','neck','ammo','weapon','body','legs','shield','hands','feet','ring']);
  const slot=String(u.searchParams.get('slot')||'').toLowerCase();
  if(slot&&!allowed.has(slot))return json({ok:false,error:'Unsupported equipment slot.'},400);
  const limit=Math.min(600,Math.max(1,Number.parseInt(u.searchParams.get('limit')||'350',10)||350));
  try{
   const rows=await env.DB.prepare(`SELECT e.item_id AS id,COALESCE(i.name,d.name,m.name) AS name,COALESCE(i.icon,json_extract(d.data_json,'$.icon')) AS icon,COALESCE(e.slot,json_extract(d.data_json,'$.equipment.slot')) AS slot,e.equipable,e.weapon,e.two_handed,e.attack_speed,e.requirements_json,e.bonuses_json,d.data_json AS item_json,m.low AS buy,m.high AS sell,m.high_volume,m.low_volume,COALESCE(i.ge_limit,0) AS limit_qty,COALESCE(i.high_alch,0) AS high_alch,COALESCE(i.members,0) AS members FROM osrs_equipment_catalog e LEFT JOIN osrs_items i ON i.item_id=e.item_id LEFT JOIN osrs_item_data d ON d.item_id=e.item_id LEFT JOIN market_current m ON m.item_id=e.item_id WHERE e.equipable=1 AND (?1='' OR lower(COALESCE(e.slot,''))= ?1) ORDER BY COALESCE(i.name,d.name,m.name) LIMIT ?2`).bind(slot,limit).all();
   const results=(rows.results||[]).map(row=>{let item={},equipment={},requirements={};try{item=JSON.parse(row.item_json||'{}')}catch{}try{equipment=JSON.parse(row.bonuses_json||'{}')}catch{}try{requirements=JSON.parse(row.requirements_json||'{}')}catch{};if(!Object.keys(equipment).length)equipment=item.equipment||{};if(!Object.keys(requirements).length)requirements=item.requirements||{};return {id:Number(row.id),name:String(row.name||item.name||row.id),icon:row.icon||item.icon||null,slot:row.slot||item.equipment_slot||item.slot||'',equipable_by_player:row.equipable!==0,requirements,equipment:{...equipment,attack_speed:Number(row.attack_speed||equipment.attack_speed||item.attack_speed||0)},weapon: item.weapon||equipment.weapon||null,buy:Number(row.buy||0),sell:Number(row.sell||0),volume:Number(row.high_volume||0)+Number(row.low_volume||0),limit:Number(row.limit_qty||0),alch:Number(row.high_alch||0),members:!!Number(row.members||0),source:'OSRS Hub stored OSRSBox catalogue'}});
   return json({ok:true,slot,count:results.length,results,source:'OSRS Hub stored OSRSBox catalogue joined to market cache',readOnly:true},200,{'Cache-Control':'public, max-age=60'});
  }catch(e){return json({ok:false,error:'Stored equipment catalogue is not ready yet.',detail:String(e?.message||'query failed').slice(0,160),results:[],readOnly:true},200,{'Cache-Control':'no-store'});}
 }
 if(u.pathname==='/api/data/monsters'){
  // Read-only monster/boss search. Returns only stored source records and explicitly
  // exposes gaps rather than inventing target stats or weaknesses.
  if(request.method!=='GET')return json({ok:false,error:'Use GET for monster catalogue reads.'},405,{'Allow':'GET'});
  const q=String(u.searchParams.get('q')||'').trim().slice(0,80);
  const limit=Math.min(1000,Math.max(1,Number.parseInt(u.searchParams.get('limit')||'500',10)||500));
  try{
   let sql='SELECT monster_id,name,data_json,updated_at FROM osrs_monster_data',args=[];
   if(q.length>=2){sql+=' WHERE lower(name) LIKE lower(?1)';args.push('%'+q+'%')}
   sql+=' ORDER BY name LIMIT ?'+(args.length+1);args.push(limit);
   const rows=await env.DB.prepare(sql).bind(...args).all();
   const results=(rows.results||[]).map(row=>{let data={};try{data=JSON.parse(row.data_json||'{}')}catch{}return {id:Number(row.monster_id),name:String(row.name||data.name||row.monster_id),combatLevel:Number(data.combat_level??data.combat??0)||null,hitpoints:Number(data.hitpoints??data.hp??0)||null,defence:Number(data.defence??data.defence_level??0)||null,attackStyles:Array.isArray(data.attack_styles)?data.attack_styles:[],weakness:data.weakness??data.weaknesses??null,defensiveBonuses:data.defensive??data.defensive_bonuses??null,immunities:data.immunities??null,source:'Stored OSRSBox monster record',updatedAt:Number(row.updated_at||0),rawDataStatus:data.detailStatus||null}});
   return json({ok:true,count:results.length,query:q||null,results,readOnly:true,notice:'Targets are limited to currently ingested source records. Missing stats and weaknesses remain unknown; target variants and boss phases may require separate records.'},200,{'Cache-Control':'public, max-age=60'});
  }catch(e){return json({ok:false,error:'Stored monster catalogue is not ready yet.',detail:String(e?.message||'query failed').slice(0,160),results:[],readOnly:true},200,{'Cache-Control':'no-store'});}
 }
 if(u.pathname==='/api/data/knowledge'){
  // Read-only cross-source Brain search across structured OSRSBox records and indexed Wiki reference pages.
  if(request.method!=='GET')return json({ok:false,error:'Use GET for knowledge search.'},405,{'Allow':'GET'});
  const q=String(u.searchParams.get('q')||'').trim().slice(0,80),allowedTypes=new Set(['item','monster','npc','quest','spell','prayer','location','activity','method','boss','wiki','']);
  const requestedType=String(u.searchParams.get('type')||'').toLowerCase().slice(0,24);
  if(requestedType&&!allowedTypes.has(requestedType))return json({ok:false,error:'Unsupported knowledge type.'},400);
  if(q.length<2)return json({ok:true,query:q,results:[],notice:'Enter at least two characters to search the structured catalogue and indexed Wiki reference pages.',readOnly:true},200,{'Cache-Control':'public, max-age=30'});
  const limit=Math.min(30,Math.max(1,Number.parseInt(u.searchParams.get('limit')||'12',10)||12)),pattern=`%${q}%`,catalogue=[];
  try{
   if(!requestedType||['item','monster','npc','prayer'].includes(requestedType)){
    let sql='SELECT entity_type,entity_id,name,members,data_json,updated_at FROM osrs_catalog WHERE searchable=1 AND name LIKE ?1';const args=[pattern];
    if(requestedType){const catalogType={item:'items',monster:'monsters',npc:'monsters',prayer:'prayers'}[requestedType]||requestedType;sql+=' AND entity_type=?2';args.push(catalogType)}
    sql+=' ORDER BY CASE WHEN lower(name)=lower(?'+(args.length+1)+') THEN 0 WHEN lower(name) LIKE lower(?'+(args.length+2)+') THEN 1 ELSE 2 END, name LIMIT ?'+(args.length+3);args.push(q,`${q}%`,limit);const result=await env.DB.prepare(sql).bind(...args).all();
    for(const row of result.results||[]){let data={};try{data=JSON.parse(row.data_json||'{}')}catch{}catalogue.push({type:row.entity_type==='monsters'?'monster':row.entity_type==='items'?'item':row.entity_type==='prayers'?'prayer':row.entity_type,id:Number(row.entity_id),name:String(row.name||row.entity_id),members:data._summary?null:!!Number(row.members||0),detailStatus:data.detailStatus||null,confidence:data._summary?0.45:0.9,freshness:Date.now()-Number(row.updated_at||0)<7*86400000?'recent':Date.now()-Number(row.updated_at||0)<30*86400000?'aging':'stale',ageHours:row.updated_at?Math.max(0,Math.round((Date.now()-Number(row.updated_at))/3600000)):null,description:String(data.examine||data.description||data.summary||data.notes||data.combat_level&&`Combat level ${data.combat_level}`||(data._summary?'Name and item ID indexed from OSRSBox summary; detailed fields are still queued for ingestion.':'')).slice(0,360),dropSummary:(Array.isArray(data.drops)?data.drops:Array.isArray(data.drop_table)?data.drop_table:[]).slice(0,6).map(d=>({id:Number(d.id??d.item_id??d.item?.id)||null,name:String(d.name||d.item?.name||d.item_name||d.id||'Unknown item'),quantity:d.quantity??d.quantity_min??null,rarity:d.rarity??d.chance??null,table:d.table||d.table_name||null})),updatedAt:Number(row.updated_at||0),source:data._summary?'OSRSBox item summary index':'OSRSBox structured catalogue',sourceUrl:'https://github.com/osrsbox/osrsbox-db'});}
   }
   // Wiki reference records fill the knowledge gaps beyond the three structured OSRSBox families.
   const pageTypeMap={item:['item','items','equipment','weapons','armour'],monster:['monster','monsters','npcs','boss','bosses','drop_tables','npc_drops'],npc:['monster','monsters','npcs'],boss:['monster','monsters','boss','bosses'],quest:['quests'],spell:['spells'],prayer:['prayers','prayer'],location:['locations','teleports'],activity:['activities','minigames','diaries','clues','slayer','raids','skilling'],method:['method','money_making','skilling','runecraft','herblore','agility','farming','construction'],wiki:[]};
   const allowedPageTypes=requestedType?pageTypeMap[requestedType]||[]:[];
   if(!requestedType||requestedType==='wiki'||allowedPageTypes.length){
    let sql='SELECT id,content_type,name,data_json,updated_at FROM osrs_content_catalog WHERE (lower(name) LIKE lower(?1) OR lower(data_json) LIKE lower(?1))',args=[pattern];
    if(requestedType&&requestedType!=='wiki'&&allowedPageTypes.length){sql+=' AND content_type IN ('+allowedPageTypes.map((_,i)=>'?'+(args.length+i+1)).join(',')+')';args.push(...allowedPageTypes)}
    sql+=' ORDER BY CASE WHEN lower(name)=lower(?'+(args.length+1)+') THEN 0 WHEN lower(name) LIKE lower(?'+(args.length+2)+') THEN 1 ELSE 2 END,name LIMIT ?'+(args.length+3);args.push(q,`${q}%`,limit);const pages=await env.DB.prepare(sql).bind(...args).all();
    for(const row of pages.results||[]){let data={};try{data=JSON.parse(row.data_json||'{}')}catch{}const text=String(data.plainText||'').trim(),at=text.toLowerCase().indexOf(q.toLowerCase()),snippet=at>=0?text.slice(Math.max(0,at-90),Math.min(text.length,at+270)):text.slice(0,300);catalogue.push({type:'wiki',subtype:row.content_type,id:Number(row.id),name:String(row.name||row.content_type),members:null,confidence:0.65,freshness:Date.now()-Number(row.updated_at||0)<14*86400000?'recent':Date.now()-Number(row.updated_at||0)<60*86400000?'aging':'stale',ageHours:row.updated_at?Math.max(0,Math.round((Date.now()-Number(row.updated_at))/3600000)):null,description:snippet||`Indexed reference page: ${row.name}`,updatedAt:Number(row.updated_at||0),source:data.source||'Old School RuneScape Wiki',sourceUrl:data.sourceUrl||`https://oldschool.runescape.wiki/w/${encodeURIComponent(String(row.name||'').replaceAll(' ','_'))}`,sections:(data.sections||[]).slice(0,8).map(x=>x.title).filter(Boolean),links:(data.links||[]).slice(0,12)});}
   }
   const unique=new Map();for(const row of catalogue){const key=`${row.type}:${row.id}:${row.name}`;if(!unique.has(key))unique.set(key,row)}const rank=row=>{const name=String(row.name||'').toLowerCase(),query=q.toLowerCase(),desc=String(row.description||'').toLowerCase();return (name===query?1000:name.startsWith(query)?700:name.includes(query)?450:desc.includes(query)?120:0)+(row.source==='OSRSBox structured catalogue'?40:row.type==='wiki'?10:0)+(row.freshness==='recent'?20:row.freshness==='aging'?5:-20)};const results=[...unique.values()].map(row=>({...row,relevanceScore:rank(row)})).sort((a,b)=>b.relevanceScore-a.relevanceScore||b.updatedAt-a.updatedAt||a.name.localeCompare(b.name)).slice(0,limit);
   const sourceRows=await env.DB.prepare("SELECT source_key,source_name,status,last_success,last_error FROM osrs_data_sources ORDER BY source_key LIMIT 20").all().catch(()=>({results:[]}));
   return json({ok:true,query:q,type:requestedType||'all',count:results.length,results,readOnly:true,coverage:{structuredRecords:results.filter(x=>x.source==='OSRSBox structured catalogue').length,wikiPages:results.filter(x=>x.type==='wiki').length,sourceCount:(sourceRows.results||[]).length,sources:(sourceRows.results||[]).map(x=>({key:x.source_key,name:x.source_name,status:x.status,lastSuccess:Number(x.last_success||0)||null,lastError:x.last_error||null}))},source:'OSRS Hub structured catalogue + indexed OSRS Wiki reference pages',notice:'Search results reflect locally stored records and the last successful source sync. Missing results may not yet be ingested; Wiki summaries are reference extracts, not a claim of complete game knowledge.'},200,{'Cache-Control':'public, max-age=30'});
  }catch(e){return json({ok:false,error:'Knowledge catalogue is not ready yet. Check database migrations and source ingestion health.',detail:String(e?.message||'query failed').slice(0,180),readOnly:true},503,{'Cache-Control':'no-store'})}
 }
 if(u.pathname==='/api/data/drops'){
  if(request.method!=='GET')return json({ok:false,error:'Use GET for drop-table lookup.'},405,{'Allow':'GET'});
  const monsterId=Number(u.searchParams.get('monsterId')||0),itemId=Number(u.searchParams.get('itemId')||0),q=String(u.searchParams.get('q')||'').trim().slice(0,80),limit=Math.min(100,Math.max(1,Number.parseInt(u.searchParams.get('limit')||'30',10)||30));
  if(!monsterId&&!itemId&&q.length<2)return json({ok:false,error:'Provide monsterId, itemId, or a monster name query of at least two characters.'},400);
  try{
   let sql='SELECT monster_id,name,data_json,updated_at FROM osrs_monster_data WHERE 1=1',args=[];
   if(monsterId>0){sql+=' AND monster_id=?';args.push(monsterId)}
   if(q.length>=2){sql+=' AND name LIKE ?';args.push(`%${q}%`)}
   if(itemId>0)sql+=' AND data_json LIKE ?';if(itemId>0)args.push(`%${itemId}%`);
   sql+=' ORDER BY name LIMIT ?';args.push(itemId>0?300:limit);const rows=await env.DB.prepare(sql).bind(...args).all(),results=[];
   for(const row of rows.results||[]){let data={};try{data=JSON.parse(row.data_json||'{}')}catch{}const raw=Array.isArray(data.drops)?data.drops:Array.isArray(data.drop_table)?data.drop_table:[];const drops=raw.map(d=>{const quantity=d.quantity;const range=Array.isArray(quantity)?quantity:(quantity&&typeof quantity==='object'?[quantity.min,quantity.max]:[d.quantity_min??quantity??1,d.quantity_max??quantity??1]);const denominator=Number(d.rarity_denominator??d.chance_denominator??(typeof d.rarity==='number'?d.rarity:0))||null;const numerator=Number(d.rarity_numerator??d.chance_numerator??(denominator?1:0))||null;return {itemId:Number(d.id??d.item_id??d.item?.id)||null,name:String(d.name||d.item?.name||d.item_name||d.id||'Unknown item'),quantityMin:Number(range[0]??1)||1,quantityMax:Number(range[1]??range[0]??1)||1,rarity:d.rarity??null,chanceNumerator:numerator,chanceDenominator:denominator,table:d.table||d.table_name||null,notes:String(d.notes||'').slice(0,180)}}).filter(d=>itemId>0?d.itemId===itemId:true);
    if(drops.length)results.push({monsterId:Number(row.monster_id),monster:String(row.name||data.name||row.monster_id),combatLevel:Number(data.combat_level||data.combat||0)||null,hitpoints:Number(data.hitpoints||data.hp||0)||null,drops:drops.slice(0,limit),updatedAt:Number(row.updated_at||0),source:'OSRSBox monster drop metadata'});
    if(results.length>=limit)break;
   }
   return json({ok:true,query:q||null,monsterId:monsterId||null,itemId:itemId||null,count:results.length,results,readOnly:true,notice:'Drop data is returned from stored OSRSBox records. Exact probability fields are only shown when the source record provides them; a missing rate is not inferred.'},200,{'Cache-Control':'public, max-age=60'});
  }catch(e){return json({ok:false,error:'Stored monster drop data is not ready yet.',detail:String(e?.message||'query failed').slice(0,160),readOnly:true},503,{'Cache-Control':'no-store'})}
 }
 if(u.pathname==='/api/data/opportunity-evidence'){
  // Evidence-only endpoint for the Opportunity Graph. No score is presented as a prediction and no writes occur.
  if(request.method!=='GET')return json({ok:false,error:'Use GET for opportunity evidence.'},405,{'Allow':'GET'});
  const now=Date.now(),since=now-7*86400000;
  try{
   const r=await env.DB.prepare(`SELECT m.item_id,m.name,m.icon,m.last_seen,
    COALESCE(h.samples,0) AS samples,COALESCE(h.first_at,0) AS first_at,COALESCE(h.last_at,0) AS last_at,
    COALESCE(e.event_count,0) AS event_count,COALESCE(e.latest_event_at,0) AS latest_event_at
    FROM market_current m
    LEFT JOIN (SELECT item_id,COUNT(*) samples,MIN(captured_at) first_at,MAX(captured_at) last_at FROM market_price_history WHERE captured_at>=?1 GROUP BY item_id) h ON h.item_id=m.item_id
    LEFT JOIN (SELECT item_id,COUNT(*) event_count,MAX(captured_at) latest_event_at FROM market_events WHERE captured_at>=?1 GROUP BY item_id) e ON e.item_id=m.item_id
    ORDER BY COALESCE(e.event_count,0) DESC,COALESCE(h.samples,0) DESC,m.last_seen DESC LIMIT 100`).bind(since).all();
   const results=(r.results||[]).map(x=>{const samples=Number(x.samples||0),age=Number(x.last_seen||0)?Math.max(0,(now-Number(x.last_seen))/60000):null;return {itemId:Number(x.item_id),name:String(x.name||x.item_id),icon:x.icon||null,samples,firstAt:Number(x.first_at||0)||null,lastAt:Number(x.last_at||0)||null,historyCoverage:samples>=120?'good':samples>=24?'partial':'sparse',eventCount:Number(x.event_count||0),latestEventAt:Number(x.latest_event_at||0)||null,cacheAgeMinutes:age,stale:age==null||age>180}});
   return json({ok:true,window:'7d',generatedAt:now,source:'OSRS Hub stored observations and event log',count:results.length,results,notice:'Evidence coverage describes stored observations only. It is not a forecast, fill probability or guarantee of profit.'},200,{'Cache-Control':'public, max-age=60'});
  }catch(e){return json({ok:false,error:'Stored evidence is unavailable until market history and event tables are ready.',detail:String(e?.message||'query failed').slice(0,180)},503,{'Cache-Control':'no-store'})}
 }
 if(u.pathname==='/api/data/signals'){
  const minVol=Math.max(0,Number(u.searchParams.get('minVolume')||250)),minDrop=Math.max(1,Number(u.searchParams.get('minDropPct')||8)),minGp=Math.max(0,Number(u.searchParams.get('minDropGp')||100)),minPrice=Math.max(0,Number(u.searchParams.get('minPrice')||100)),crash=Math.max(1,Number(u.searchParams.get('crashHourPct')||6));
  const drops=await env.DB.prepare("SELECT e.*,COALESCE(m.name,json_extract(e.details_json,'$.name')) name,m.icon FROM market_events e LEFT JOIN market_current m ON m.item_id=e.item_id WHERE e.event_type='sudden_drop' AND e.captured_at>?1 AND e.volume>=?2 AND e.current_price>=?3 AND ABS(e.current_price-e.previous_price)>=?4 AND ABS(e.change_pct)>=?5 ORDER BY e.captured_at DESC,ABS(e.change_pct) DESC LIMIT 80").bind(Date.now()-48*3600000,minVol,minPrice,minGp,minDrop).all().catch(()=>({results:[]}));
  const hourly=await env.DB.prepare("SELECT e.*,COALESCE(m.name,json_extract(e.details_json,'$.name')) name,m.icon FROM market_events e LEFT JOIN market_current m ON m.item_id=e.item_id WHERE e.event_type='hourly_crash' AND e.captured_at>?1 AND e.volume>=?2 AND e.current_price>=?3 AND ABS(e.change_pct)>=?4 ORDER BY e.captured_at DESC,ABS(e.change_pct) DESC LIMIT 80").bind(Date.now()-72*3600000,minVol,minPrice,crash).all().catch(()=>({results:[]}));
  const overnightRows=await env.DB.prepare("SELECT h.item_id,h.local_hour,AVG(h.price) avg_price,COUNT(*) samples,AVG(h.volume) avg_volume,MAX(m.name) name,MAX(m.icon) icon FROM market_price_history h LEFT JOIN market_current m ON m.item_id=h.item_id WHERE h.captured_at>?1 AND h.local_hour BETWEEN 0 AND 7 GROUP BY h.item_id,h.local_hour HAVING COUNT(*)>=2 ORDER BY h.item_id,h.local_hour LIMIT 2000").bind(Date.now()-14*86400000).all().catch(()=>({results:[]}));
  const byItem=new Map();for(const row of overnightRows.results||[]){if(!byItem.has(row.item_id))byItem.set(row.item_id,[]);byItem.get(row.item_id).push(row)}
  const overnight=[];for(const [id,profile] of byItem){const hours=profile.filter(x=>Number(x.avg_price)>0&&Number(x.samples)>=2&&Number(x.avg_volume)>=250).sort((a,b)=>a.local_hour-b.local_hour);if(hours.length<6)continue;let best=null;for(const buy of hours){for(const sell of hours){if(Number(sell.local_hour)<=Number(buy.local_hour))continue;const buyPrice=Math.round(Number(buy.avg_price)),sellPrice=Math.round(Number(sell.avg_price)),tax=Math.min(Math.floor(sellPrice*.02),5000000),profit=sellPrice-buyPrice-tax;if(profit<=0)continue;const pct=buyPrice?profit/buyPrice*100:0;if(!best||profit>best.edgeGp)best={itemId:+id,name:buy.name||sell.name||String(id),icon:buy.icon||sell.icon||null,buyHour:+buy.local_hour,sellHour:+sell.local_hour,buyPrice,sellPrice,edgeGp:profit,edgePct:pct,samples:Math.min(+buy.samples,+sell.samples),hoursTracked:hours.length,volume:Math.round(Math.min(+buy.avg_volume||0,+sell.avg_volume||0)),window:`UK ${String(buy.local_hour).padStart(2,'0')}:00 → ${String((+sell.local_hour+1)%24).padStart(2,'0')}:00`}}}if(best)overnight.push(best)}
  overnight.sort((a,b)=>b.edgeGp-a.edgeGp);const overnightTop=overnight.slice(0,50);
  return json({drops:(drops.results||[]).map(x=>({...x,itemId:+x.item_id,current:+x.current_price,previous:+x.previous_price,dropPct:Math.abs(+x.change_pct||0),volume:+x.volume||0,icon:x.icon,name:x.name})),hourly:(hourly.results||[]).map(x=>({...x,itemId:+x.item_id,current:+x.current_price,previous:+x.previous_price,dropPct:Math.abs(+x.change_pct||0),volume:+x.volume||0,icon:x.icon,name:x.name})),overnight:overnightTop})
 }
 if(u.pathname==='/api/data/sync'&&request.method==='POST'){try{if(await isDataIngestionPaused(env))return json({ok:false,paused:true,message:'Data ingestion is paused by the emergency stop.'},503);await seedCatalog(env);await syncOsrsMarket(env);return json({ok:true})}catch(e){return json({ok:false,error:e.message},502)}}
 if(u.pathname==='/api/data/catalog'&&request.method==='GET'){const type=String(u.searchParams.get('type')||'').slice(0,40),q=String(u.searchParams.get('q')||'').trim().slice(0,80),limit=Math.min(100,Math.max(1,Number(u.searchParams.get('limit')||50)));let sql='SELECT entity_type,entity_id,name,members,data_json,updated_at FROM osrs_catalog WHERE 1=1',args=[];if(type){sql+=' AND entity_type=?';args.push(type)}if(q){sql+=' AND name LIKE ?';args.push(`%${q}%`)}sql+=' ORDER BY name LIMIT ?';args.push(limit);const r=await env.DB.prepare(sql).bind(...args).all();return json({results:r.results||[]})}
 return json({error:'Not found'},404)
}
export default {async fetch(request,env){const url=new URL(request.url);if(url.pathname.startsWith("/api/admin/"))return adminAuth(request,env);if(url.pathname==="/api/data/health"||url.pathname==="/api/data/knowledge"){if(!await isAdminSession(request,env))return json({ok:false,error:"Administrator password required.",adminRequired:true},401,{"Cache-Control":"no-store"})}if(url.pathname.startsWith("/api/auth/"))return auth(request,env);if(url.pathname.startsWith("/api/discord/"))return discordIntegration(request,env);if(request.method==="OPTIONS"&&url.pathname==="/api/hiscores")return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET, OPTIONS","Access-Control-Allow-Headers":"Content-Type"}});if(request.method==="GET"&&url.pathname.startsWith("/api/prices/"))return priceProxy(request);if(request.method==="GET"&&url.pathname==="/api/quest")return questDetails(request);if(request.method==="GET"&&url.pathname==="/api/account")return accountSync(request,env);if(url.pathname.startsWith("/api/data/"))return dataApi(request,env);if(request.method==="GET"&&url.pathname==="/api/itemstats")return itemStats(request,env);if(request.method==="GET"&&url.pathname==="/api/hiscores")return hiscores(request);return env.ASSETS.fetch(request)},async scheduled(event,env,ctx){ctx.waitUntil(runDiscordAlertCron(env));ctx.waitUntil((async()=>{if(await isDataIngestionPaused(env)){console.warn("D1 emergency stop active: skipping OSRS data ingestion; Discord alerts remain enabled");return;}const last=await env.DB.prepare("SELECT updated_at FROM data_meta WHERE key='market_sync'").first().catch(()=>null);if(!last||Date.now()-Number(last.updated_at||0)>=DATA_SYNC_MS){await seedCatalog(env);try{await syncOsrsMarket(env)}catch(e){await recordDataSource(env,"prices-wiki-api","OSRS Wiki Prices API",`${PRICES_API}/latest + /mapping`,"error",e?.message);console.warn("OSRS market sync failed; continuing reference ingestion",e?.message)}}await syncRichData(env);await syncWikiContent(env)})().catch(e=>console.warn("OSRS data sync",e?.message)))}};
