const UPSTREAM = "https://secure.runescape.com/m=hiscore_oldschool/index_lite.ws";

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const player = (url.searchParams.get("player") || "").trim();
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Cache-Control": "public, max-age=60"
  };

  if (!player || player.length > 12 || /[\u0000-\u001F\u007F]/.test(player)) {
    return new Response("Invalid OSRS username", { status: 400, headers: { ...cors, "Content-Type": "text/plain; charset=utf-8" } });
  }

  try {
    const upstream = await fetch(`${UPSTREAM}?player=${encodeURIComponent(player)}`, {
      headers: {
        "User-Agent": "OSRS-Hub/1.0 account lookup",
        "Accept": "text/plain,text/*;q=0.9,*/*;q=0.8"
      }
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: { ...cors, "Content-Type": "text/plain; charset=utf-8" }
    });
  } catch {
    return new Response("Unable to reach OSRS HiScores", { status: 502, headers: { ...cors, "Content-Type": "text/plain; charset=utf-8" } });
  }
}

export function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
