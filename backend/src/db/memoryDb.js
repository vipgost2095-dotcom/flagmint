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
    // Пишем во временный файл и переименовываем поверх основного — rename на
    // одной файловой системе атомарен, поэтому если Railway убьёт процесс
    // ровно в момент записи (например, из-за редеплоя), mints.json никогда
    // не окажется наполовину записанным / битым JSON-ом.
    const tmpFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify([...mintsMap.values()], null, 2), "utf-8");
    fs.renameSync(tmpFile, DATA_FILE);
  } catch (err) {
    console.error("[memoryDb] Не удалось сохранить минты на диск:", err.message);
  }
}

const mints = loadMints();
let counter = mints.size + 1;

// Явная диагностика при старте: если DATA_DIR не примонтирован как
// постоянный Railway Volume, история будет обнуляться при каждом
// редеплое — печатаем это прямо в лог, чтобы не искать причину вслепую.
if (mints.size === 0) {
  console.warn(
    `[memoryDb] ⚠️ История минтов пуста при старте. Если это НЕ первый ` +
      `запуск проекта — скорее всего к сервису backend не подключён Volume, ` +
      `смонтированный ровно в DATA_DIR (сейчас: "${DATA_DIR}"). Проверьте ` +
      `Railway → сервис backend → Settings → Volumes.`
  );
}

export function createMint({ userId, flagId, priceTon }) {
  const id = `mint_${Date.now()}_${counter++}`;
  const network = process.env.TON_NETWORK ?? "testnet";
  const record = {
    id,
    userId,
    flagId,
    status: "pending",
    txHash: null,
    nftAddress: null,
    getgemsUrl: null,
    priceTon,
    network,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    errorMessage: null,
    groupNotified: false,
  };
  mints.set(id, record);
  saveMints(mints);
  console.log(`[memoryDb] createMint: ${id} (userId=${userId}, flagId=${flagId}, network=${network}) — всего в памяти: ${mints.size}`);
  return record;
}

export function updateMint(id, patch) {
  const existing = mints.get(id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };
  mints.set(id, updated);
  saveMints(mints);
  console.log(`[memoryDb] updateMint: ${id} -> status=${updated.status}`);
  return updated;
}

export function getMint(id) {
  return mints.get(id) ?? null;
}

export function listMintsByUser(userId) {
  return [...mints.values()]
    .filter((m) => String(m.userId) === String(userId) && !m.hidden)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Считает "зарезервированные" минты (pending и success) ТОЛЬКО в рамках
 * текущей сети (TON_NETWORK) — так номер издания (serialNumber) считается
 * отдельно для testnet и для mainnet. Записи без поля network (созданные
 * до этого изменения) считаются как testnet, чтобы не задвоить нумерацию
 * уже существующих тестовых минтов.
 * Ошибочные (error) попытки не учитываются — они не отняли место в тираже.
 */
export function countReservedMints() {
  const currentNetwork = process.env.TON_NETWORK ?? "testnet";
  return [...mints.values()].filter(
    (m) =>
      (m.status === "pending" || m.status === "success") &&
      (m.network ?? "testnet") === currentNetwork
  ).length;
}
