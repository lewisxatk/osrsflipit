/**
 * Client for the separately deployed OSRS Hub combat Worker.
 *
 * The Worker is intentionally deployed manually. No default production URL is
 * assumed, and this client never substitutes estimated DPS when the service is
 * unavailable or returns a review-required response.
 */
const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);

export function createCombatRuntimeClient({ baseUrl = "", fetchImpl = globalThis.fetch } = {}) {
  const endpoint = String(baseUrl || "").trim().replace(/\/+$/, "");

  async function request(path, options = {}) {
    if (!endpoint) {
      return { ok: false, status: "not-configured", error: "Combat runtime URL is not configured." };
    }
    if (typeof fetchImpl !== "function") {
      return { ok: false, status: "unavailable", error: "Fetch is not available in this environment." };
    }

    let response;
    try {
      response = await fetchImpl(endpoint + path, {
        ...options,
        headers: { Accept: "application/json", ...(options.headers || {}) },
      });
    } catch {
      return { ok: false, status: "unavailable", error: "Combat runtime could not be reached." };
    }

    let payload;
    try {
      payload = await response.json();
    } catch {
      return { ok: false, status: "invalid-response", error: "Combat runtime returned invalid JSON.", httpStatus: response.status };
    }
    if (!isRecord(payload)) {
      return { ok: false, status: "invalid-response", error: "Combat runtime returned an unexpected response shape.", httpStatus: response.status };
    }
    if (!response.ok) {
      return {
        ok: false,
        status: typeof payload.status === "string" ? payload.status : "http-error",
        error: typeof payload.error === "string" ? payload.error : "Combat runtime rejected the request.",
        issues: Array.isArray(payload.issues) ? payload.issues : [],
        httpStatus: response.status,
        payload,
      };
    }
    return { ok: true, status: payload.status || "unknown", payload, httpStatus: response.status };
  }

  return {
    async health() {
      return request("/health", { method: "GET" });
    },
    async calculate(body) {
      if (!isRecord(body) || !isRecord(body.player)
        || !Number.isInteger(body.monsterId) || body.monsterId <= 0) {
        return {
          ok: false,
          status: "invalid-request",
          error: "Calculation request requires a player object and positive integer monsterId.",
        };
      }
      return request("/api/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },
  };
}
