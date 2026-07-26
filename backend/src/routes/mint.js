import { Router } from "express";
import { getFlagById } from "./flags.js";
import { buildMintTransaction, checkMintTransactionStatus } from "../services/tonService.js";
import { buildGetgemsNftUrl } from "../services/getgemsService.js";
import { createMint, getMint, updateMint } from "../db/memoryDb.js";
import { idempotency } from "../middleware/idempotency.js";

export const mintRouter = Router();

/**
 * POST /api/mint/prepare
 * body: { flagId, walletAddress }
 * Требует Idempotency-Key в заголовках (см. middleware/idempotency.js) —
 * защищает от повторного создания записи о минте при двойном тапе/ретрае.
 *
 * Возвращает:
 *  - mintId — id записи в нашей БД, по которому потом отслеживается статус
 *  - transaction — объект для передачи в tonConnectUI.sendTransaction() на фронтенде
 *  - priceBreakdown — цена/комиссия/итог для экрана подтверждения
 */
mintRouter.post("/prepare", idempotency(), async (req, res) => {
  const { flagId, walletAddress } = req.body ?? {};
  const userId = req.telegramUser.id;

  if (!flagId || !walletAddress) {
    const errorBody = { error: "BAD_REQUEST", message: "flagId и walletAddress обязательны" };
    req.saveIdempotentResult(errorBody);
    return res.status(400).json(errorBody);
  }

  const flag = getFlagById(flagId);
  if (!flag) {
    const errorBody = { error: "FLAG_NOT_FOUND" };
    req.saveIdempotentResult(errorBody);
    return res.status(404).json(errorBody);
  }

  try {
    const transaction = buildMintTransaction({
      flagId: flag.id,
      userWalletAddress: walletAddress,
      priceTon: flag.priceTon,
    });

    const mint = createMint({ userId, flagId: flag.id, priceTon: flag.priceTon });

    const responseBody = {
      mintId: mint.id,
      transaction,
      priceBreakdown: {
        priceTon: flag.priceTon,
        networkFeeTon: transaction.meta.networkFeeTon,
        totalTon: transaction.meta.totalTon,
      },
    };

    req.saveIdempotentResult(responseBody);
    return res.status(201).json(responseBody);
  } catch (err) {
    const errorBody = { error: "PREPARE_FAILED", message: err.message };
    req.saveIdempotentResult(errorBody);
    return res.status(500).json(errorBody);
  }
});

/**
 * POST /api/mint/:id/submitted
 * body: { walletAddress }
 * Клиент вызывает сразу после того, как кошелёк (Tonkeeper/MyTonWallet)
 * подтвердил отправку транзакции. Здесь мы не считаем минт завершённым —
 * только фиксируем факт отправки и начинаем проверять статус в сети.
 */
mintRouter.post("/:id/submitted", async (req, res) => {
  const mint = getMint(req.params.id);
  if (!mint || String(mint.userId) !== String(req.telegramUser.id)) {
    return res.status(404).json({ error: "MINT_NOT_FOUND" });
  }

  const { walletAddress } = req.body ?? {};
  if (!walletAddress) {
    return res.status(400).json({ error: "BAD_REQUEST", message: "walletAddress обязателен" });
  }

  updateMint(mint.id, { status: "pending" });

  // В реальной системе тут стоит поставить задачу в очередь (BullMQ/Cron)
  // вместо синхронного ожидания — оставляем простую немедленную проверку,
  // а полный опрос статуса делает GET /api/mint/:id (см. ниже).
  const check = await checkMintTransactionStatus({ userWalletAddress: walletAddress });

  if (check.confirmed) {
    const network = process.env.TON_NETWORK ?? "testnet";
    const getgemsUrl = buildGetgemsNftUrl({ network, nftAddress: check.nftAddress });
    const updated = updateMint(mint.id, {
      status: "success",
      txHash: check.txHash,
      nftAddress: check.nftAddress,
      getgemsUrl,
    });
    return res.json(updated);
  }

  return res.status(202).json({ ...mint, status: "pending" });
});

/**
 * GET /api/mint/:id
 * Фронтенд опрашивает этот эндпоинт (poll) на экране подтверждения, пока
 * не получит status !== 'pending', либо подписывается на пуш-уведомление
 * (см. notifications в боте).
 */
mintRouter.get("/:id", async (req, res) => {
  const mint = getMint(req.params.id);
  if (!mint || String(mint.userId) !== String(req.telegramUser.id)) {
    return res.status(404).json({ error: "MINT_NOT_FOUND" });
  }

  if (mint.status === "pending") {
    // Повторно проверяем сеть на каждый poll — простое, но рабочее решение
    // для MVP. Для масштабирования вынесите в фоновый воркер + вебхуки.
    try {
      const check = await checkMintTransactionStatus({ userWalletAddress: req.query.walletAddress });
      if (check.confirmed) {
        const network = process.env.TON_NETWORK ?? "testnet";
        const getgemsUrl = buildGetgemsNftUrl({ network, nftAddress: check.nftAddress });
        const updated = updateMint(mint.id, {
          status: "success",
          txHash: check.txHash,
          nftAddress: check.nftAddress,
          getgemsUrl,
        });
        return res.json(updated);
      }
    } catch (err) {
      // Ошибка проверки статуса — не считаем это ошибкой минта, просто
      // сообщаем что статус пока pending, поллинг продолжится.
    }
  }

  res.json(mint);
});
