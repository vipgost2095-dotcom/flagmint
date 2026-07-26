/**
 * Минимальная in-memory "база данных" минтов, чтобы проект был рабочим из
 * коробки без внешней БД. Интерфейс намеренно узкий и изолированный —
 * чтобы заменить на настоящую БД (Postgres/Mongo), достаточно переписать
 * реализацию этих трёх функций, не трогая роуты.
 *
 * Структура записи о минте:
 * {
 *   id, userId, flagId, status: 'pending'|'success'|'error',
 *   txHash, nftAddress, getgemsUrl, priceTon, createdAt, updatedAt, errorMessage
 * }
 */

const mints = new Map(); // id -> mint record
let counter = 1;

export function createMint({ userId, flagId, priceTon }) {
  const id = `mint_${Date.now()}_${counter++}`;
  const record = {
    id,
    userId,
    flagId,
    status: "pending",
    txHash: null,
    nftAddress: null,
    getgemsUrl: null,
    priceTon,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    errorMessage: null,
  };
  mints.set(id, record);
  return record;
}

export function updateMint(id, patch) {
  const existing = mints.get(id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };
  mints.set(id, updated);
  return updated;
}

export function getMint(id) {
  return mints.get(id) ?? null;
}

export function listMintsByUser(userId) {
  return [...mints.values()]
    .filter((m) => String(m.userId) === String(userId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
