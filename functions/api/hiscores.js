const UPSTREAM = "https://secure.runescape.com/m=hiscore_oldschool/index_lite.ws";

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const player = (url.searchParams.get("player") || "").trim();
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Cache-Control": "public, max-age=60",
    "Content-Type": "application/json; charset=utf-8"
  };
  if (!player || player.length > 12 || /[\u0000-\u001F\u007F]/.test(player)) {
    return new Response(JSON.stringify({error:"Invalid OSRS username",code:"INVALID_NAME"}), {status:400,headers});
  }
  try {
    const upstream = await fetch(`${UPSTREAM}?player=${encodeURIComponent(player)}`, {
      headers: {"User-Agent":"OSRS-Hub/1.1 account lookup","Accept":"text/plain,*/*;q=0.8"}
    });
    const body = await upstream.text();
    if (!upstream.ok) return new Response(JSON.stringify({error:upstream.status===404?"Account not found on OSRS HiScores":`OSRS HiScores returned HTTP ${upstream.status}`,code:upstream.status===404?"NOT_FOUND":"UPSTREAM_ERROR"}), {status:upstream.status,headers});
    return new Response(JSON.stringify({player,data:body}), {status:200,headers});
  } catch {
    return new Response(JSON.stringify({error:"OSRS HiScores could not be reached from the Cloudflare edge",code:"UPSTREAM_UNAVAILABLE"}), {status:502,headers});
  }
}

export function onRequestOptions() {
  return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET, OPTIONS","Access-Control-Allow-Headers":"Content-Type"}});
}
