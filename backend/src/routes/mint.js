import { Router } from "express";
import { getFlagById } from "./flags.js";
import { buildPaymentTransaction } from "../services/tonService.js";
import {
  createNftViaGetgems,
  getGetgemsMintStatus,
  normalizeStatusResponse,
} from "../services/getgemsMintingApi.js";
import { buildGetgemsNftUrl } from "../services/getgemsService.js";
import { createMint, getMint, updateMint } from "../db/memoryDb.js";
import { idempotency } from "../middleware/idempotency.js";

export const mintRouter = Router();

/**
 * POST /api/mint/prepare
 * body: { flagId, walletAddress }
 *
 * Готовит ПРОСТОЙ перевод оплаты на наш кошелёк — сам NFT минтит Getgems
 * отдельно через свой Minting API (см. /:id/submitted ниже), а не эта
 * транзакция.
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
    const transaction = buildPaymentTransaction({ flagId: flag.id, priceTon: flag.priceTon });

    const mint = createMint({ userId, flagId: flag.id, priceTon: flag.priceTon });
    updateMint(mint.id, { walletAddress });

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
    console.error("[mint prepare] error:", err.message);
    const errorBody = { error: "PREPARE_FAILED", message: err.message };
    req.saveIdempotentResult(errorBody);
    return res.status(500).json(errorBody);
  }
});

/**
 * POST /api/mint/:id/submitted
 *
 * Клиент вызывает сразу после того, как кошелёк подтвердил отправку
 * оплаты. Здесь мы ЗАПУСКАЕМ реальный минт через Getgems Minting API —
 * само создание NFT происходит у них в фоне (6 секунд — несколько минут).
 *
 * ⚠️ Упрощение для MVP: мы не проверяем, что платёж пользователя реально
 * подтвердился в сети TON, прежде чем запускать платный вызов Getgems API
 * (~0.023 TON списывается с вашего служебного кошелька на каждый вызов).
 * Для продакшена стоит сначала убедиться, что оплата дошла (например,
 * проверкой входящих транзакций на PAYMENT_RECEIVER_ADDRESS), и только
 * затем вызывать createNftViaGetgems.
 */
mintRouter.post("/:id/submitted", async (req, res) => {
  const mint = getMint(req.params.id);
  if (!mint || String(mint.userId) !== String(req.telegramUser.id)) {
    return res.status(404).json({ error: "MINT_NOT_FOUND" });
  }

  const { walletAddress } = req.body ?? {};
  const ownerAddress = walletAddress || mint.walletAddress;
  if (!ownerAddress) {
    return res.status(400).json({ error: "BAD_REQUEST", message: "walletAddress обязателен" });
  }

  const flag = getFlagById(mint.flagId);
  if (!flag) {
    return res.status(404).json({ error: "FLAG_NOT_FOUND" });
  }

  updateMint(mint.id, { status: "pending", walletAddress: ownerAddress });

  try {
    const frontendUrl = process.env.FRONTEND_PUBLIC_URL;
    await createNftViaGetgems({
      requestId: mint.id,
      ownerAddress,
      name: `${flag.name.en} Flag`,
      description: flag.description.en,
      image: `${frontendUrl}${flag.animation.fallbackGifUrl}`,
      attributes: [
        { trait_type: "country", value: flag.attributes.country ?? "—" },
        { trait_type: "region", value: flag.attributes.region },
        { trait_type: "animation_type", value: flag.attributes.animation_type },
        { trait_type: "edition", value: flag.attributes.edition },
      ],
    });

    const updated = updateMint(mint.id, { status: "pending" });
    return res.status(202).json(updated);
  } catch (err) {
    // Раньше эта ошибка нигде не печаталась — в логах Railway было пусто,
    // хотя минт падал. Теперь реальный текст ошибки Getgems виден в консоли.
    console.error("[mint submitted] Getgems API error:", err.message);
    const updated = updateMint(mint.id, { status: "error", errorMessage: err.message });
    return res.status(502).json({ error: "GETGEMS_MINT_FAILED", message: err.message, ...updated });
  }
});

/**
 * GET /api/mint/:id
 * Фронтенд опрашивает этот эндпоинт (poll), пока не получит status !== 'pending'.
 * Здесь спрашиваем статус создания NFT у самого Getgems.
 */
mintRouter.get("/:id", async (req, res) => {
  const mint = getMint(req.params.id);
  if (!mint || String(mint.userId) !== String(req.telegramUser.id)) {
    return res.status(404).json({ error: "MINT_NOT_FOUND" });
  }

  if (mint.status === "pending") {
    try {
      const statusData = await getGetgemsMintStatus({ requestId: mint.id });
      const { done, failed, nftAddress, getgemsUrl } = normalizeStatusResponse(statusData);

      if (failed) {
        const updated = updateMint(mint.id, {
          status: "error",
          errorMessage: "Getgems сообщил об ошибке создания NFT",
        });
        return res.json(updated);
      }

      if (done) {
        const network = process.env.TON_NETWORK ?? "testnet";
        const finalGetgemsUrl = getgemsUrl ?? buildGetgemsNftUrl({ network, nftAddress });
        const updated = updateMint(mint.id, {
          status: "success",
          nftAddress,
          getgemsUrl: finalGetgemsUrl,
        });
        return res.json(updated);
      }
    } catch (err) {
      // Ошибка проверки статуса — не считаем это ошибкой минта, просто
      // сообщаем что статус пока pending, поллинг продолжится. Но теперь
      // хотя бы печатаем её, чтобы не гадать по пустым логам.
      console.error("[mint status poll] error:", err.message);
    }
  }

  res.json(mint);
});
