/**
 * usersDb.js
 * ----------
 * Учёт уникальных пользователей бота — только для статистики (сколько
 * человек всего запускали бота), не хранит ничего личного кроме
 * Telegram user id и даты первого визита.
 *
 * Персистентность — тот же принцип, что и в memoryDb.js: пишем на диск
 * по пути DATA_DIR, чтобы данные переживали передеплой (тот же Volume,
 * который уже подключён для истории минтов).
 */
import fs from "fs";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || "/data";
const FILE_PATH = path.join(DATA_DIR, "users.json");

let users = new Map(); // userId (string) -> { firstSeenAt: ISO-строка }

function loadFromDisk() {
  try {
    if (fs.existsSync(FILE_PATH)) {
      const raw = fs.readFileSync(FILE_PATH, "utf-8");
      const arr = JSON.parse(raw);
      users = new Map(arr.map((u) => [String(u.userId), { firstSeenAt: u.firstSeenAt }]));
    }
  } catch (err) {
    console.error("[usersDb] Не удалось прочитать users.json:", err.message);
  }
}

function saveToDisk() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const arr = Array.from(users.entries()).map(([userId, data]) => ({ userId, ...data }));
    fs.writeFileSync(FILE_PATH, JSON.stringify(arr, null, 2), "utf-8");
  } catch (err) {
    console.error("[usersDb] Не удалось сохранить users.json:", err.message);
  }
}

loadFromDisk();

/**
 * Регистрирует пользователя, если он ещё не был известен.
 * Идемпотентно — повторный вызов для того же userId ничего не меняет.
 * @returns {boolean} true, если пользователь был НОВЫМ (записан впервые)
 */
export function trackUser(userId) {
  const key = String(userId);
  if (users.has(key)) return false;
  users.set(key, { firstSeenAt: new Date().toISOString() });
  saveToDisk();
  return true;
}

export function getUsersCount() {
  return users.size;
}
