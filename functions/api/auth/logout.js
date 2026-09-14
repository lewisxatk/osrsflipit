import {COOKIE,cookie,json} from "./_shared.js";
export async function onRequestPost(){return json({ok:true},200,{"Set-Cookie":cookie(COOKIE,"",0)})}
