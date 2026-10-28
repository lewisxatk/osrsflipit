/**
 * Browser client for the separately deployed OSRS Hub combat Worker.
 * The runtime URL is explicit configuration; no fake or estimated result is
 * ever returned when the service is missing or unavailable.
 */
export function normaliseRuntimeUrl(value) {
  const raw = String(value ?? "").trim();
  return raw ? raw.replace(/\/+$/, "") : "";
}

export async function calculateLiveCombat({
  baseUrl,
  request,
  fetchImpl = globalThis.fetch,
  timeoutMs = 12000,
} = {}) {
  const base = normaliseRuntimeUrl(baseUrl);
  if (!base) {
    return {
      status: "unavailable",
      result: null,
      issues: ["Live combat runtime is not configured. Set VITE_COMBAT_RUNTIME_URL to the deployed Worker URL."],
    };
  }
  if (typeof fetchImpl !== "function") {
    return { status: "unavailable", result: null, issues: ["Fetch is unavailable in this environment."] };
  }
  if (!request || typeof request !== "object" || !request.player || !Number.isInteger(request.monsterId)) {
    return { status: "review-required", result: null, issues: ["A validated player and canonical monster ID are required."] };
  }

  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const health = await fetchImpl(`${base}/health`, {
      method: "GET",
      headers: { Accept: "application/json" },
      ...(controller ? { signal: controller.signal } : {}),
    });
    if (!health.ok) {
      return { status: "unavailable", result: null, issues: [`Combat runtime health check failed (${health.status}).`] };
    }
    const healthBody = await health.json().catch(() => null);
    if (healthBody?.status !== "ok" || healthBody?.service !== "osrshub-combat-runtime") {
      return { status: "unavailable", result: null, issues: ["Combat runtime health response was not recognised."] };
    }

    const response = await fetchImpl(`${base}/api/calculate`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(request),
      ...(controller ? { signal: controller.signal } : {}),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const issues = Array.isArray(payload?.issues) ? payload.issues.filter(x => typeof x === "string") : [];
      if (typeof payload?.error === "string") issues.push(payload.error);
      return {
        status: payload?.status === "review-required" ? "review-required" : "error",
        result: null,
        issues: issues.length ? issues : [`Combat calculation request failed (${response.status}).`],
      };
    }
    if (payload?.status !== "calculated" || !payload.result
      || ![payload.result.dps, payload.result.maxHit, payload.result.accuracy,
        payload.result.attackRoll, payload.result.npcDefenceRoll, payload.result.attackSpeed].every(Number.isFinite)) {
      return {
        status: payload?.status === "review-required" ? "review-required" : "error",
        result: null,
        issues: Array.isArray(payload?.issues) && payload.issues.length
          ? payload.issues.filter(x => typeof x === "string")
          : ["Runtime response did not contain a complete, finite calculation result."],
      };
    }
    return { status: "calculated", result: payload.result, issues: [] };
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    return {
      status: "unavailable",
      result: null,
      issues: [timedOut ? "Combat runtime request timed out." : "Could not reach the combat runtime. Check its URL and deployment status."],
    };
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
}
