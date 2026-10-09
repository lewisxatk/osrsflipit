const UPSTREAM = "https://secure.runescape.com/m=hiscore_oldschool/index_lite.ws";
const DISCORD_API = "https://discord.com/api/v10";
const PRICES_API = "https://prices.runescape.wiki/api/v1/osrs";
const SESSION_COOKIE = "osrshub_session";
const STATE_COOKIE = "osrshub_oauth_state";
const CLOUD_KEYS = ["osrsflipit-profiles","osrsflipit-columns","osrsflipit-column-widths","osrsflipit-detail-tiles","osrsflipit-filters","osrsflipit-watch","osrsflipit-alerts","osrsflipit-rules","osrsflipit-mini-ge","osrsflipit-sound","osrsflipit-sound-volume","osrsflipit-sound-type","osrsflipit-theme","osrsflipit-chart-layers","osrsflipit-recipe-favs","osrsflipit-flip-log","osrsflipit-bankroll","osrsflipit-portfolio","osrshub-dashboard-pins","osrshub-account"];
function json(data,status=200,headers={}){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8",...headers}})}
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
async function itemStats(request,env){const url=new URL(request.url),id=Number(url.searchParams.get("id")||0),slot=String(url.searchParams.get("slot")||"").toLowerCase();const allowed=["head","cape","neck","ammo","weapon","body","legs","shield","hands","feet","ring"];try{if(slot){if(!allowed.includes(slot))return json({error:"Invalid equipment slot."},400);const r=await fetch(`https://www.osrsbox.com/osrsbox-db/items-json-slot/items-${slot}.json`,{headers:{"User-Agent":"OSRS Hub/1.1 (equipment analytics)"}});if(!r.ok)return json({error:"Equipment slot data unavailable."},r.status);const d=await r.json();return json(d,200,{"Cache-Control":"public, max-age=21600"})}if(!Number.isInteger(id)||id<1)return json({error:"Valid item id required."},400);const r=await fetch(`https://www.osrsbox.com/osrsbox-db/items-json/${id}.json`,{headers:{"User-Agent":"OSRSHub/1.1 (equipment analytics)"}});if(!r.ok)return json({error:"Item data unavailable."},r.status);const d=await r.json();return json(d,200,{"Cache-Control":"public, max-age=86400"})}catch(e){return json({error:"Item data request failed."},502)}}

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
const DATA_SOURCE="RuneLite-fed GE market data via prices.runescape.wiki", DATA_SYNC_MS=3600000, MARKET_CURRENT_LIMIT=30, SNAPSHOT_INTERVAL_MS=3600000, D1_SOFT_WRITE_LIMIT=7000, OSRSBOX_API="https://api.osrsbox.com", WIKI_API="https://oldschool.runescape.wiki/api.php";
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
  const eventRows=events.slice(0,25),hourlyRows=hourlyUpdates.slice(0,50);
  let eventWritten=0,hourlyWritten=0;
  if(eventRows.length&&await d1Reserve(env,eventRows.length,"market events")){
    const q=eventRows.map(e=>env.DB.prepare("INSERT INTO market_events(captured_at,item_id,event_type,current_price,previous_price,change_pct,volume,local_hour,source,details_json) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(...e));
    for(let i=0;i<q.length;i+=80)await env.DB.batch(q.slice(i,i+80));eventWritten=eventRows.length;
  }
  // Hourly behaviour is written once per hour, and only for a small liquid sample.
  const bucket=Math.floor(now/3600000),lastBucket=await env.DB.prepare("SELECT value FROM data_meta WHERE key='hourly_bucket'").first().catch(()=>null);
  if(Number(lastBucket?.value||-1)!==bucket&&hourlyRows.length&&await d1Reserve(env,hourlyRows.length+1,"hourly intelligence")){
    const q=hourlyRows.map(([id,h,pct,ts])=>env.DB.prepare("INSERT INTO market_hourly_stats(item_id,local_hour,samples,avg_change_pct,negative_samples,positive_samples,last_seen) VALUES(?,?,1,?,?,?,?) ON CONFLICT(item_id,local_hour) DO UPDATE SET samples=samples+1,avg_change_pct=((avg_change_pct*samples)+excluded.avg_change_pct)/(samples+1),negative_samples=negative_samples+CASE WHEN excluded.avg_change_pct<0 THEN 1 ELSE 0 END,positive_samples=positive_samples+CASE WHEN excluded.avg_change_pct>0 THEN 1 ELSE 0 END,last_seen=excluded.last_seen").bind(id,h,pct,pct<0?1:0,pct>0?1:0,ts));
    for(let i=0;i<q.length;i+=80)await env.DB.batch(q.slice(i,i+80));await d1WriteMeta(env,"hourly_bucket",bucket);hourlyWritten=hourlyRows.length;
  }
  return {previousAt,events:eventWritten,hourly:hourlyWritten};
}
async function syncOsrsMarket(env){
  if(!env.DB)return;
  const now=Date.now(),m=await env.DB.prepare("SELECT updated_at FROM data_meta WHERE key='market_sync'").first();
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
    const q=priority.map(({id,r,x})=>env.DB.prepare("INSERT INTO market_current(item_id,high,low,high_time,low_time,high_volume,low_volume,avg_high,avg_low,limit_qty,name,examine,members,tradeable,icon,value,alch,last_seen) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(item_id) DO UPDATE SET high=excluded.high,low=excluded.low,high_time=excluded.high_time,low_time=excluded.low_time,high_volume=excluded.high_volume,low_volume=excluded.low_volume,avg_high=excluded.avg_high,avg_low=excluded.avg_low,limit_qty=excluded.limit_qty,name=excluded.name,examine=excluded.examine,members=excluded.members,tradeable=excluded.tradeable,icon=excluded.icon,value=excluded.value,alch=excluded.alch,last_seen=excluded.last_seen").bind(+id,+r.high||0,+r.low||0,+r.highTime||0,+r.lowTime||0,+r.highPriceVolume||0,+r.lowPriceVolume||0,+r.avgHighPrice||0,+r.avgLowPrice||0,+x.limit||0,x.name||null,x.examine||null,x.members?1:0,x.tradeable_on_ge?1:0,x.icon||null,+x.value||0,+x.highalch||0,now));
    for(let i=0;i<q.length;i+=80)await env.DB.batch(q.slice(i,i+80));
  }
  // Mapping/item metadata is static enough to update incrementally. Never rewrite the entire item catalogue every price tick.
  const mapCursorRow=await env.DB.prepare("SELECT value FROM data_meta WHERE key='mapping_cursor'").first().catch(()=>null);
  const mapCursor=Math.max(0,Number(mapCursorRow?.value||0));
  const mapEntries=Array.from(map.entries());
  if(mapEntries.length){
    const chunk=mapEntries.slice(mapCursor,mapCursor+150),nextCursor=(mapCursor+chunk.length)%mapEntries.length;
    if(chunk.length&&await d1Reserve(env,chunk.length,"incremental item mapping")){
      const itemQ=chunk.map(([id,x])=>env.DB.prepare("INSERT INTO osrs_items(item_id,name,examine,members,tradeable,icon,value,high_alch,ge_limit,stackable,noted,linked_id,data_json,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(item_id) DO UPDATE SET name=excluded.name,examine=excluded.examine,members=excluded.members,tradeable=excluded.tradeable,icon=excluded.icon,value=excluded.value,high_alch=excluded.high_alch,ge_limit=excluded.ge_limit,stackable=excluded.stackable,noted=excluded.noted,linked_id=excluded.linked_id,data_json=excluded.data_json,updated_at=excluded.updated_at WHERE osrs_items.name IS NOT excluded.name OR osrs_items.examine IS NOT excluded.examine OR osrs_items.members IS NOT excluded.members OR osrs_items.tradeable IS NOT excluded.tradeable OR osrs_items.icon IS NOT excluded.icon OR osrs_items.value IS NOT excluded.value OR osrs_items.high_alch IS NOT excluded.high_alch OR osrs_items.ge_limit IS NOT excluded.ge_limit OR osrs_items.stackable IS NOT excluded.stackable OR osrs_items.noted IS NOT excluded.noted OR osrs_items.linked_id IS NOT excluded.linked_id OR osrs_items.data_json IS NOT excluded.data_json").bind(id,x.name||null,x.examine||null,x.members?1:0,x.tradeable_on_ge?1:0,x.icon||null,+x.value||0,+x.highalch||0,+x.limit||0,x.stackable?1:0,x.noted?1:0,+x.linked_id||null,JSON.stringify(x),now));
      for(let i=0;i<itemQ.length;i+=80)await env.DB.batch(itemQ.slice(i,i+80));await d1WriteMeta(env,"mapping_cursor",nextCursor);
    }
  }
  await d1WriteMeta(env,"market_sync","ok");
  // Retention cleanup is infrequent so DELETEs cannot silently consume the daily write budget every five minutes.
  const cleanupDay=await env.DB.prepare("SELECT value FROM data_meta WHERE key='cleanup_day'").first().catch(()=>null);
  if(cleanupDay?.value!==day&&await d1Reserve(env,2,"retention cleanup")){await env.DB.prepare("DELETE FROM market_snapshots WHERE captured_at<?1").bind(now-45*86400000).run().catch(()=>{});await env.DB.prepare("DELETE FROM market_events WHERE captured_at<?1").bind(now-120*86400000).run().catch(()=>{});await d1WriteMeta(env,"cleanup_day",day);}
  console.log("OSRS market sync",JSON.stringify(signal));
}
const SKILLS=["Attack","Strength","Defence","Ranged","Prayer","Magic","Runecraft","Hitpoints","Crafting","Mining","Smithing","Fishing","Cooking","Firemaking","Woodcutting","Agility","Herblore","Thieving","Fletching","Slayer","Farming","Construction","Hunter","Sailing"];
async function seedCatalog(env){for(let i=0;i<SKILLS.length;i++)await env.DB.prepare("INSERT OR IGNORE INTO osrs_skills(id,name,max_level,members) VALUES(?,?,99,?)").bind(i+1,SKILLS[i],i>4?1:0).run();}
async function syncOsrsBox(env,dataset){
 const key=`osrsbox_${dataset}_page`,m=await env.DB.prepare("SELECT value FROM data_meta WHERE key=?").bind(key).first();let page=Math.max(1,+m?.value||1),all=[];
 for(let i=0;i<1;i++,page++){
  const r=await fetch(`${OSRSBOX_API}/${dataset}?page=${page}`,{headers:{"User-Agent":"OSRSHub/2.1 data ingestion"}});if(!r.ok)throw new Error(`${dataset} ${page}: ${r.status}`);
  const j=await r.json(),docs=Array.isArray(j)?j:(j.data||j.results||[]);if(!docs.length){page=1;await env.DB.prepare("INSERT INTO data_meta(key,value,updated_at) VALUES(?, 'complete', ?) ON CONFLICT(key) DO UPDATE SET value='complete',updated_at=excluded.updated_at").bind(`${key}_state`,Date.now()).run();break}all.push(...docs);if(docs.length<25){page=1;await env.DB.prepare("INSERT INTO data_meta(key,value,updated_at) VALUES(?, 'complete', ?) ON CONFLICT(key) DO UPDATE SET value='complete',updated_at=excluded.updated_at").bind(`${key}_state`,Date.now()).run();break}
 }
 const table=dataset==='items'?'osrs_item_data':dataset==='monsters'?'osrs_monster_data':'osrs_prayer_data',idcol=dataset==='items'?'item_id':dataset==='monsters'?'monster_id':'prayer_id',now=Date.now();
 const q=all.filter(x=>x&&x.id!=null).map(x=>env.DB.prepare(`INSERT INTO ${table}(${idcol},name,data_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(${idcol}) DO UPDATE SET name=excluded.name,data_json=excluded.data_json,updated_at=excluded.updated_at`).bind(+x.id,x.name||null,JSON.stringify(x),now));
 const c=all.filter(x=>x&&x.id!=null).map(x=>env.DB.prepare("INSERT INTO osrs_catalog(entity_type,entity_id,name,members,searchable,data_json,updated_at) VALUES(?,?,?,?,1,?,?) ON CONFLICT(entity_type,entity_id) DO UPDATE SET name=excluded.name,members=excluded.members,data_json=excluded.data_json,updated_at=excluded.updated_at").bind(dataset,+x.id,x.name||null,x.members?1:0,JSON.stringify(x),now));
 const baseWrites=q.length+c.length;
 if(baseWrites&&await d1Reserve(env,baseWrites,`OSRSBox ${dataset}`)){for(let i=0;i<q.length;i+=80)await env.DB.batch(q.slice(i,i+80));for(let i=0;i<c.length;i+=80)await env.DB.batch(c.slice(i,i+80));}else{return;}
 if(dataset==='monsters'){const nq=all.filter(x=>x&&x.id!=null).map(x=>{const levels=x.stats||x.levels||{};return env.DB.prepare("INSERT INTO osrs_npcs(npc_id,name,combat_level,hitpoints,attack_level,strength_level,defence_level,ranged_level,magic_level,attributes_json,data_json,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(npc_id) DO UPDATE SET name=excluded.name,combat_level=excluded.combat_level,hitpoints=excluded.hitpoints,attack_level=excluded.attack_level,strength_level=excluded.strength_level,defence_level=excluded.defence_level,ranged_level=excluded.ranged_level,magic_level=excluded.magic_level,attributes_json=excluded.attributes_json,data_json=excluded.data_json,updated_at=excluded.updated_at").bind(+x.id,x.name||null,+x.combat_level||+x.combat||0,+x.hitpoints||+x.hp||0,+levels.attack||x.attack||0,+levels.strength||x.strength||0,+levels.defence||x.defence||0,+levels.ranged||x.ranged||0,+levels.magic||x.magic||0,JSON.stringify(x.attributes||x.attribute||[]),JSON.stringify(x),now)});if(nq.length&&await d1Reserve(env,nq.length,`OSRSBox NPC ${dataset}`)){for(let i=0;i<nq.length;i+=80)await env.DB.batch(nq.slice(i,i+80));}}

 if(dataset==='items'){
  const eq=all.filter(x=>x.equipment||x.equipment_slot||x.slot).map(x=>{const e=x.equipment||{};const slot=e.slot||x.equipment_slot||x.slot||null;const req=e.requirements||x.requirements||{};return env.DB.prepare("INSERT INTO osrs_equipment_catalog(item_id,slot,equipable,weapon,two_handed,attack_speed,requirements_json,bonuses_json,updated_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(item_id) DO UPDATE SET slot=excluded.slot,equipable=excluded.equipable,weapon=excluded.weapon,two_handed=excluded.two_handed,attack_speed=excluded.attack_speed,requirements_json=excluded.requirements_json,bonuses_json=excluded.bonuses_json,updated_at=excluded.updated_at").bind(+x.id,slot,1,e.weapon?1:0,e.two_handed?1:0,Number(e.attack_speed||x.attack_speed||0),JSON.stringify(req),JSON.stringify(e),now)});
  if(eq.length&&await d1Reserve(env,eq.length,`OSRSBox equipment ${dataset}`)){for(let i=0;i<eq.length;i+=80)await env.DB.batch(eq.slice(i,i+80));}
 }
 await env.DB.prepare("INSERT INTO data_meta(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(key,String(page),now).run();
}
const WIKI_CONTENT_PAGES=[
 ["skills","Skills"],["quests","Quests"],["monsters","Monsters"],["npcs","Non-player character"],["bosses","Boss"],["equipment","Equipment"],["weapons","Weapons"],["armour","Armour"],["spells","Spells"],["prayers","Prayer"],["activities","Activities"],["minigames","Minigames"],["diaries","Achievement Diaries"],["clues","Clue Scrolls"],["slayer","Slayer"],["combat","Combat"],["raids","Raids"],["skilling","Skilling"],["money_making","Money making guide"],["drop_tables","Drop table"],["npc_drops","Drop table"],["locations","Locations"],["teleports","Teleportation"],["food","Food"],["potions","Potions"],["items","Item"],["amulets","Amulet"],["rings","Rings"],["weapons","Weapons"],["runecraft","Runecraft"],["herblore","Herblore"],["farming","Farming"],["construction","Construction"],["agility","Agility"],["thieving","Thieving"],["fishing","Fishing"],["mining","Mining"],["smithing","Smithing"],["fletching","Fletching"],["woodcutting","Woodcutting"],["firemaking","Firemaking"]
];
async function syncWikiContent(env){if(!env.DB)return;try{const gate=await env.DB.prepare("SELECT value FROM data_meta WHERE key='wiki_content_gate'").first().catch(()=>null),now=Date.now();if(gate&&now-Number(gate.value||0)<30*60*1000)return;const row=await env.DB.prepare("SELECT value FROM data_meta WHERE key='wiki_content_cursor'").first();let cursor=Math.max(0,Number(row?.value||0));const [type,page]=WIKI_CONTENT_PAGES[cursor%WIKI_CONTENT_PAGES.length];const u=new URL(WIKI_API);u.searchParams.set('action','parse');u.searchParams.set('page',page);u.searchParams.set('prop','wikitext');u.searchParams.set('format','json');u.searchParams.set('formatversion','2');const r=await fetch(u,{headers:{"User-Agent":"OSRSHub/2.1 OSRS data platform"}});if(!r.ok)return;const j=await r.json();const text=String(j?.parse?.wikitext||j?.parse?.wikitext?.['*']||'').slice(0,180000);if(text&&await d1Reserve(env,2,"Wiki content")){await env.DB.prepare("INSERT INTO osrs_content_catalog(content_type,name,data_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(content_type,name) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at").bind(type,page,JSON.stringify({page,type,wikitext:text,source:'Old School RuneScape Wiki',capturedAt:Date.now()}),Date.now()).run();await d1WriteMeta(env,'wiki_content_cursor',String((cursor+1)%WIKI_CONTENT_PAGES.length));await d1WriteMeta(env,'wiki_content_gate',now)}}catch(e){console.warn('Wiki content sync',e?.message)}}
async function syncRichData(env){
  if(!env.DB)return;
  const gate=await env.DB.prepare("SELECT value FROM data_meta WHERE key='rich_sync_gate'").first().catch(()=>null),now=Date.now();
  if(gate&&now-Number(gate.value||0)<15*60*1000)return;
  for(const d of ['items','monsters','prayers']){
    const done=await env.DB.prepare("SELECT value FROM data_meta WHERE key=?").bind(`osrsbox_${d}_state`).first();
    if(done?.value==='complete')continue;
    try{await syncOsrsBox(env,d);await d1WriteMeta(env,'rich_sync_gate',now)}catch(e){console.warn('OSRSBox sync',d,e?.message)}
    break;
  }
}
async function dataApi(request,env){
 const u=new URL(request.url);
 if(u.pathname==='/api/data/health'){
  const names=['market_current','market_snapshots','market_events','market_hourly_stats','osrs_item_data','osrs_monster_data','osrs_prayer_data','osrs_items','osrs_npcs','osrs_catalog','osrs_equipment_catalog','osrs_drop_tables','osrs_content_catalog'];
  const r=await env.DB.batch(names.map(t=>env.DB.prepare(`SELECT COUNT(*) c FROM ${t}`)));
  const out={ok:true,source:DATA_SOURCE};names.forEach((n,i)=>out[n.replaceAll('_','')]=+(r[i]?.results?.[0]?.c||0));const budgetRow=await env.DB.prepare("SELECT value FROM data_meta WHERE key='d1_write_budget'").first().catch(()=>null);let budget={day:utcDayKey(),writes:0};try{if(budgetRow?.value)budget=JSON.parse(budgetRow.value)}catch{}out.d1Writer={day:budget.day,writes:Number(budget.writes||0),softLimit:D1_SOFT_WRITE_LIMIT,remaining:Math.max(0,D1_SOFT_WRITE_LIMIT-Number(budget.writes||0)),percent:Math.min(100,Math.round(Number(budget.writes||0)/D1_SOFT_WRITE_LIMIT*100))};out.marketItems=out.marketcurrent||0;out.snapshots=out.marketsnapshots||0;out.items=out.osrsitemdata||0;out.monsters=out.osrsmonsterdata||0;out.prayers=out.osrsprayerdata||0;out.itemsDatabase=out.osrsitems||0;out.npcs=out.osrsnpcs||0;return json(out)
 }
 if(u.pathname==='/api/data/signals'){
  const minVol=Math.max(0,Number(u.searchParams.get('minVolume')||250)),minDrop=Math.max(1,Number(u.searchParams.get('minDropPct')||8)),minGp=Math.max(0,Number(u.searchParams.get('minDropGp')||100)),minPrice=Math.max(0,Number(u.searchParams.get('minPrice')||100)),crash=Math.max(1,Number(u.searchParams.get('crashHourPct')||6));
  const drops=await env.DB.prepare("SELECT e.*,COALESCE(m.name,json_extract(e.details_json,'$.name')) name,m.icon FROM market_events e LEFT JOIN market_current m ON m.item_id=e.item_id WHERE e.event_type='sudden_drop' AND e.captured_at>?1 AND e.volume>=?2 AND e.current_price>=?3 AND ABS(e.current_price-e.previous_price)>=?4 AND ABS(e.change_pct)>=?5 ORDER BY e.captured_at DESC,ABS(e.change_pct) DESC LIMIT 80").bind(Date.now()-48*3600000,minVol,minPrice,minGp,minDrop).all().catch(()=>({results:[]}));
  const hourly=await env.DB.prepare("SELECT e.*,COALESCE(m.name,json_extract(e.details_json,'$.name')) name,m.icon FROM market_events e LEFT JOIN market_current m ON m.item_id=e.item_id WHERE e.event_type='hourly_crash' AND e.captured_at>?1 AND e.volume>=?2 AND e.current_price>=?3 AND ABS(e.change_pct)>=?4 ORDER BY e.captured_at DESC,ABS(e.change_pct) DESC LIMIT 80").bind(Date.now()-72*3600000,minVol,minPrice,crash).all().catch(()=>({results:[]}));
  const overnight=await env.DB.prepare("SELECT h.item_id,COALESCE(m.name,CAST(h.item_id AS TEXT)) name,m.icon,AVG(h.avg_change_pct) edgePct,SUM(h.samples) samples,MIN(h.local_hour) minHour,MAX(h.local_hour) maxHour FROM market_hourly_stats h LEFT JOIN market_current m ON m.item_id=h.item_id WHERE h.local_hour BETWEEN 0 AND 7 AND h.last_seen>?1 AND h.samples>=2 GROUP BY h.item_id ORDER BY edgePct ASC,samples DESC LIMIT 50").bind(Date.now()-30*86400000).all().catch(()=>({results:[]}));
  return json({drops:(drops.results||[]).map(x=>({...x,itemId:+x.item_id,current:+x.current_price,previous:+x.previous_price,dropPct:Math.abs(+x.change_pct||0),volume:+x.volume||0,icon:x.icon,name:x.name})),hourly:(hourly.results||[]).map(x=>({...x,itemId:+x.item_id,current:+x.current_price,previous:+x.previous_price,dropPct:Math.abs(+x.change_pct||0),volume:+x.volume||0,icon:x.icon,name:x.name})),overnight:(overnight.results||[]).map(x=>({...x,itemId:+x.item_id,edgePct:+x.edgePct||0,samples:+x.samples||0,icon:x.icon,name:x.name,window:`UK ${String(x.minHour).padStart(2,'0')}:00–${String((+x.maxHour+1)%24).padStart(2,'0')}:00`}))})
 }
 if(u.pathname==='/api/data/sync'&&request.method==='POST'){try{await seedCatalog(env);await syncOsrsMarket(env);return json({ok:true})}catch(e){return json({ok:false,error:e.message},502)}}
 if(u.pathname==='/api/data/catalog'&&request.method==='GET'){const type=String(u.searchParams.get('type')||'').slice(0,40),q=String(u.searchParams.get('q')||'').trim().slice(0,80),limit=Math.min(100,Math.max(1,Number(u.searchParams.get('limit')||50)));let sql='SELECT entity_type,entity_id,name,members,data_json,updated_at FROM osrs_catalog WHERE 1=1',args=[];if(type){sql+=' AND entity_type=?';args.push(type)}if(q){sql+=' AND name LIKE ?';args.push(`%${q}%`)}sql+=' ORDER BY name LIMIT ?';args.push(limit);const r=await env.DB.prepare(sql).bind(...args).all();return json({results:r.results||[]})}
 return json({error:'Not found'},404)
}
export default {async fetch(request,env){const url=new URL(request.url);if(url.pathname.startsWith("/api/auth/"))return auth(request,env);if(url.pathname.startsWith("/api/discord/"))return discordIntegration(request,env);if(request.method==="OPTIONS"&&url.pathname==="/api/hiscores")return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET, OPTIONS","Access-Control-Allow-Headers":"Content-Type"}});if(request.method==="GET"&&url.pathname.startsWith("/api/prices/"))return priceProxy(request);if(request.method==="GET"&&url.pathname==="/api/quest")return questDetails(request);if(request.method==="GET"&&url.pathname==="/api/account")return accountSync(request,env);if(url.pathname.startsWith("/api/data/"))return dataApi(request,env);if(request.method==="GET"&&url.pathname==="/api/itemstats")return itemStats(request,env);if(request.method==="GET"&&url.pathname==="/api/hiscores")return hiscores(request);return env.ASSETS.fetch(request)},async scheduled(event,env,ctx){ctx.waitUntil(runDiscordAlertCron(env));ctx.waitUntil(seedCatalog(env).then(()=>syncOsrsMarket(env)).catch(e=>console.warn("OSRS market sync",e?.message)));ctx.waitUntil(syncRichData(env).catch(e=>console.warn("OSRS rich data sync",e?.message)));ctx.waitUntil(syncWikiContent(env).catch(e=>console.warn("OSRS Wiki content sync",e?.message)))}};
