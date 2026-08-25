/**
 * routes/stats.js
 * ----------------
 * Внутренняя статистика (сколько всего пользователей запускали бота).
 * НЕ для фронтенда/пользователей Mini App — только для бота (админ-команда)
 * и защищена тем же internal-секретом, что и /api/referrals/register.
 */
import { Router } from "express";
import { trackUser, getUsersCount } from "../db/usersDb.js";

export const statsRouter = Router();

function requireInternalSecret(req, res, next) {
  const provided = req.header("X-Internal-Secret");
  const expected = process.env.INTERNAL_API_SECRET;
  if (!expected || provided !== expected) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }
  next();
}

/**
 * POST /api/stats/track-user
 * body: { userId }
 * Бот вызывает это при каждом /start. Идемпотентно.
 */
statsRouter.post("/track-user", requireInternalSecret, (req, res) => {
  const { userId } = req.body ?? {};
  if (!userId) {
    return res.status(400).json({ error: "BAD_REQUEST", message: "userId обязателен" });
  }
  const isNew = trackUser(userId);
  res.json({ ok: true, isNew });
});

/**
 * GET /api/stats/users-count
 * Бот вызывает это по админ-команде /stats.
 */
statsRouter.get("/users-count", requireInternalSecret, (req, res) => {
  res.json({ count: getUsersCount() });
});
