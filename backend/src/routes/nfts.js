import { Router } from "express";
import { listMintsByUser } from "../db/memoryDb.js";
import { getFlagById } from "./flags.js";

export const nftsRouter = Router();

/**
 * GET /api/nfts
 * Личный кабинет: список всех попыток минта текущего пользователя со
 * статусами и ссылкой на Getgems (когда минт успешен).
 */
nftsRouter.get("/", (req, res) => {
  const userId = req.telegramUser.id;
  const mints = listMintsByUser(userId).map((mint) => {
    const flag = getFlagById(mint.flagId);
    return {
      ...mint,
      flag: flag
        ? { id: flag.id, code: flag.code, name: flag.name, animation: flag.animation }
        : null,
    };
  });

  res.json({ items: mints, total: mints.length });
});
