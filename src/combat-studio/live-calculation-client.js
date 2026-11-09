/**
 * Browser client for the separately deployed OSRS Hub combat Worker.
 * The runtime URL is explicit configuration; no fake or estimated result is
 * ever returned when the service is missing or unavailable.
 */
const healthCache = new WeakMap();
const resultCache = new WeakMap();
const HEALTH_CACHE_MS = 5 * 60 * 1000;
const RESULT_CACHE_MS = 60 * 1000;
const cacheFor = (cache, fetchImpl) => { let value=cache.get(fetchImpl); if(!value){value=new Map();cache.set(fetchImpl,value)} return value; };
const copy = value => JSON.parse(JSON.stringify(value));

export function normaliseRuntimeUrl(value) {
  const raw = String(value ?? "").trim();
  return raw ? raw.replace(/\/+$/, "") : "";
}

const ammoCompatibilityCache = new WeakMap();

export async function getLiveAmmoCompatibility({
  baseUrl,
  weaponId,
  fetchImpl = globalThis.fetch,
  timeoutMs = 8000,
} = {}) {
  const base = normaliseRuntimeUrl(baseUrl);
  if (!base || !Number.isInteger(Number(weaponId)) || Number(weaponId) <= 0) {
    return { status: "unavailable", compatibleAmmoIds: [], issues: ["A configured combat runtime and canonical weapon ID are required for ammunition compatibility."] };
  }
  if (typeof fetchImpl !== "function") {
    return { status: "unavailable", compatibleAmmoIds: [], issues: ["Fetch is unavailable for engine ammunition compatibility."] };
  }
  let cache = ammoCompatibilityCache.get(fetchImpl);
  if (!cache) { cache = new Map(); ammoCompatibilityCache.set(fetchImpl, cache); }
  const cacheKey = base + ":" + Number(weaponId);
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < 5 * 60 * 1000) return copy(cached.value);

  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const response = await fetchImpl(base + "/api/ammo-compatibility?weaponId=" + encodeURIComponent(Number(weaponId)), {
      method: "GET",
      headers: { Accept: "application/json" },
      ...(controller ? { signal: controller.signal } : {}),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return {
        status: "unavailable",
        compatibleAmmoIds: [],
        issues: [payload?.error || "Combat runtime ammunition compatibility check failed (" + response.status + "). Update the Worker before running weapon optimisation."],
      };
    }
    if (!["required", "not-required", "incomplete-source"].includes(payload?.status)
      || !Array.isArray(payload?.compatibleAmmoIds)
      || payload.compatibleAmmoIds.some(id => !Number.isInteger(id) || id <= 0)) {
      return { status: "unavailable", compatibleAmmoIds: [], issues: ["Combat runtime returned an invalid ammunition-compatibility record."] };
    }
    const value = {
      status: payload.status,
      weaponId: Number(weaponId),
      compatibleAmmoIds: [...payload.compatibleAmmoIds],
      weaponName: payload.weaponName,
      weaponVersion: payload.weaponVersion,
      issues: payload.status === "incomplete-source" ? ["The engine has no complete ammunition list for this weapon; it was not treated as ammo-compatible."] : [],
    };
    cache.set(cacheKey, { at: Date.now(), value });
    return copy(value);
  } catch (error) {
    return {
      status: "unavailable",
      compatibleAmmoIds: [],
      issues: [error?.name === "AbortError" ? "Engine ammunition-compatibility request timed out." : "Could not reach the combat engine ammunition catalogue."],
    };
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
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

  const healthMemo = cacheFor(healthCache, fetchImpl);
  const resultsMemo = cacheFor(resultCache, fetchImpl);
  const resultKey = base + "\\n" + JSON.stringify(request);
  const cachedResult = resultsMemo.get(resultKey);
  if (cachedResult && Date.now() - cachedResult.at < RESULT_CACHE_MS) return copy(cachedResult.value);
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const healthAt = healthMemo.get(base);
    if (!healthAt || Date.now() - healthAt > HEALTH_CACHE_MS) {
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
      healthMemo.set(base, Date.now());
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
    const completed = { status: "calculated", result: payload.result, issues: [] };
    resultsMemo.set(resultKey, { at: Date.now(), value: completed });
    if (resultsMemo.size > 160) resultsMemo.delete(resultsMemo.keys().next().value);
    return completed;
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
