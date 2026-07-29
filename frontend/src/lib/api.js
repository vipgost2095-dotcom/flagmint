import { getInitDataRaw } from "./telegram";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

class ApiError extends Error {
  constructor(status, body) {
    super(body?.message || body?.error || `API error ${status}`);
    this.status = status;
    this.body = body;
  }
}

async function request(path, { method = "GET", body, headers = {}, auth = false } = {}) {
  const finalHeaders = { "Content-Type": "application/json", ...headers };

  if (auth) {
    // Каждый авторизованный запрос несёт актуальный initData — backend
    // проверит подпись и свежесть на своей стороне (см. validateInitData.js)
    finalHeaders["X-Telegram-Init-Data"] = getInitDataRaw();
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  let json = null;
  try {
    json = await res.json();
  } catch {
    // тело может быть пустым, например для 204
  }

  if (!res.ok) {
    throw new ApiError(res.status, json);
  }
  return json;
}

export const api = {
  getFlags: ({ search = "", type, region } = {}) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (type) params.set("type", type);
    if (region) params.set("region", region);
    return request(`/api/flags?${params.toString()}`);
  },

  getFlag: (id) => request(`/api/flags/${id}`),

  prepareMint: ({ flagId, walletAddress, idempotencyKey }) =>
    request("/api/mint/prepare", {
      method: "POST",
      auth: true,
      headers: { "Idempotency-Key": idempotencyKey },
      body: { flagId, walletAddress },
    }),

  markMintSubmitted: ({ mintId, walletAddress }) =>
    request(`/api/mint/${mintId}/submitted`, {
      method: "POST",
      auth: true,
      body: { walletAddress },
    }),

  getMintStatus: ({ mintId, walletAddress }) =>
    request(`/api/mint/${mintId}?walletAddress=${encodeURIComponent(walletAddress ?? "")}`, {
      auth: true,
    }),

  getMyNfts: () => request("/api/nfts", { auth: true }),

  hideMint: (mintId) =>
    request(`/api/nfts/${mintId}`, {
      method: "DELETE",
      auth: true,
    }),
};

export { ApiError };
