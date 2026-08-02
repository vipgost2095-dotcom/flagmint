import { Router } from "express";
import { listMintsByUser, updateMint, getMint } from "../db/memoryDb.js";
import { getFlagById } from "./flags.js";
import { getGetgemsMintStatus, normalizeStatusResponse } from "../services/getgemsMintingApi.js";
import { buildGetgemsNftUrl } from "../services/getgemsService.js";
import { notifyGroupMint } from "../services/telegramNotify.js";

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

            if (!current.groupNotified) {
              const flag = getFlagById(current.flagId);
              if (flag) {
                const frontendUrl = process.env.FRONTEND_PUBLIC_URL;
                const cacheBuster = Date.now();
                notifyGroupMint({
                  flagNameRu: flag.name.ru,
                  flagNameEn: flag.name.en,
                  animationUrl: `${frontendUrl}${flag.animation.previewUrl}?v=${cacheBuster}`,
                  getgemsUrl: finalUrl,
                }).catch((err) => console.error("[nfts list] notifyGroupMint failed:", err.message));
              }
              current = updateMint(current.id, { groupNotified: true });
            }
          } else if (failed) {
            current = updateMint(current.id, {
              status: "error",
              errorMessage: "Getgems сообщил об ошибке создания NFT",
            });
          }
        } catch (err) {
          // "unknown request id" — это не временный сбой, а окончательный
          // отказ: Getgems больше не знает про этот requestId (например,
          // запрос был отправлен ещё до смены коллекции/сети или устарел
          // на их стороне) и никогда не ответит по-другому. Если оставить
          // как pending, каждое открытие профиля будет бить по API и
          // спамить логи одной и той же ошибкой бесконечно — фиксируем
          // как error один раз, дальше recheck для неё уже не запускается.
          const isUnknownRequestId = err.message.includes("400") && err.message.toLowerCase().includes("unknown request id");
          if (isUnknownRequestId) {
            current = updateMint(current.id, {
              status: "error",
              errorMessage: "Getgems не распознал запрос на минт (устаревший requestId)",
            });
            console.warn(`[nfts list] mint ${current.id} помечен как error — Getgems не знает про этот requestId`);
          } else {
            // Настоящий временный сбой (сеть, 5xx и т.п.) — оставляем pending,
            // попробуем ещё раз при следующем открытии профиля.
            console.error("[nfts list] status recheck error:", err.message);
          }
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

/**
 * DELETE /api/nfts/:mintId
 * Скрывает запись минта из личного кабинета пользователя ("Убрать").
 * Это НЕ физическое удаление и НЕ отзыв самого NFT (сам NFT, если он
 * уже создан на Getgems, никуда не девается) — просто помечаем запись
 * hidden:true, чтобы она пропала из списка "Мои NFT". История и нумерация
 * изданий (serialNumber/countReservedMints) при этом не затрагиваются,
 * так как считают все записи независимо от hidden.
 */
nftsRouter.delete("/:mintId", (req, res) => {
  const userId = req.telegramUser.id;
  const { mintId } = req.params;

  const mint = getMint(mintId);
  if (!mint) {
    return res.status(404).json({ error: "MINT_NOT_FOUND" });
  }
  if (String(mint.userId) !== String(userId)) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }

  updateMint(mintId, { hidden: true });
  res.status(204).end();
});
