import { Router } from "express";
import { listMintsByUser, updateMint } from "../db/memoryDb.js";
import { getFlagById } from "./flags.js";
import { getGetgemsMintStatus, normalizeStatusResponse } from "../services/getgemsMintingApi.js";
import { buildGetgemsNftUrl } from "../services/getgemsService.js";

export const nftsRouter = Router();

/**
 * GET /api/nfts
 * Личный кабинет: список всех попыток минта текущего пользователя со
 * статусами и ссылкой на Getgems (когда минт успешен).
 *
 * Важно: для записей со статусом "pending" мы АКТИВНО перепроверяем статус
 * у Getgems прямо здесь — раньше проверка происходила только пока был
 * открыт экран подтверждения минта, и если пользователь уходил с него
 * раньше, чем Getgems заканчивал минт, статус так и оставался "pending"
 * навсегда, даже если NFT уже готов. Теперь при каждом открытии профиля
 * зависшие записи получают шанс обновиться.
 */
nftsRouter.get("/", async (req, res) => {
  const userId = req.telegramUser.id;
  const rawMints = listMintsByUser(userId);

  const mints = await Promise.all(
    rawMints.map(async (mint) => {
      let current = mint;
      if (current.status === "pending") {
        try {
          const statusData = await getGetgemsMintStatus({ requestId: current.id });
          const { done, failed, nftAddress, getgemsUrl } = normalizeStatusResponse(statusData);
          if (done) {
            const network = process.env.TON_NETWORK ?? "testnet";
            const finalUrl = getgemsUrl ?? buildGetgemsNftUrl({ network, nftAddress });
            current = updateMint(current.id, { status: "success", nftAddress, getgemsUrl: finalUrl });
          } else if (failed) {
            current = updateMint(current.id, {
              status: "error",
              errorMessage: "Getgems сообщил об ошибке создания NFT",
            });
          }
        } catch (err) {
          // Не удалось проверить сейчас — просто оставляем как есть,
          // попробуем ещё раз при следующем открытии профиля.
          console.error("[nfts list] status recheck error:", err.message);
        }
      }
      return current;
    })
  );

  const withFlags = mints.map((mint) => {
    const flag = getFlagById(mint.flagId);
    return {
      ...mint,
      flag: flag
        ? { id: flag.id, code: flag.code, name: flag.name, animation: flag.animation }
        : null,
    };
  });

  res.json({ items: withFlags, total: withFlags.length });
});
