/**
 * "База данных" минтов с сохранением на диск.
 *
 * ⚠️ ВАЖНО: чтобы история РЕАЛЬНО переживала передеплой на Railway, нужно
 * подключить Volume (постоянный диск) — иначе файловая система контейнера
 * пересоздаётся с нуля при каждом деплое, и это сохранение на диск не
 * поможет так же, как не помогала оперативная память. См. инструкцию в
 * README про добавление Railway Volume, смонтированного в DATA_DIR.
 *
 * Интерфейс намеренно узкий и изолированный — чтобы в будущем заменить на
 * настоящую БД (Postgres/Mongo), достаточно переписать реализацию этих
 * функций, не трогая роуты.
 *
 * Структура записи о минте:
 * {
 *   id, userId, flagId, status: 'pending'|'success'|'error',
 *   txHash, nftAddress, getgemsUrl, priceTon, createdAt, updatedAt,
 *   errorMessage, groupNotified
 * }
 */
import fs from "fs";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || "/data";
const DATA_FILE = path.join(DATA_DIR, "mints.json");

function loadMints() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      const arr = JSON.parse(raw);
      console.log(`[memoryDb] Загружено ${arr.length} сохранённых минтов из ${DATA_FILE}`);
      return new Map(arr.map((m) => [m.id, m]));
    }
    console.log(`[memoryDb] Файл ${DATA_FILE} ещё не существует — начинаем с пустой истории`);
  } catch (err) {
    console.error("[memoryDb] Не удалось загрузить сохранённые минты:", err.message);
  }
  return new Map();
}

function saveMints(mintsMap) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify([...mintsMap.values()], null, 2), "utf-8");
  } catch (err) {
    console.error("[memoryDb] Не удалось сохранить минты на диск:", err.message);
  }
}

const mints = loadMints();
let counter = mints.size + 1;

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
    groupNotified: false,
  };
  mints.set(id, record);
  saveMints(mints);
  return record;
}

export function updateMint(id, patch) {
  const existing = mints.get(id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };
  mints.set(id, updated);
  saveMints(mints);
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

/**
 * Считает "зарезервированные" минты по ВСЕЙ коллекции (не только текущего
 * пользователя) — pending и success вместе, чтобы не допустить превышения
 * общего лимита тиража даже при нескольких одновременных попытках минта.
 * Ошибочные (error) попытки не учитываются — они не отняли место в тираже.
 */
export function countReservedMints() {
  return [...mints.values()].filter((m) => m.status === "pending" || m.status === "success").length;
}
