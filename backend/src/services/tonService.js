/**
 * tonService.js
 * -------------
 * Раз сам NFT минтит Getgems через свой Minting API (см.
 * services/getgemsMintingApi.js) — от TON-транзакции пользователя больше
 * не требуется вызывать контракт коллекции. Единственное, что должен
 * подписать пользователь в кошельке — это ПРОСТОЙ ПЕРЕВОД оплаты (цены
 * флага) на наш собственный кошелёк (PAYMENT_RECEIVER_ADDRESS).
 */

import { Address, beginCell, toNano } from "@ton/core";

/**
 * Комментарий к простому TON-переводу (стандартный формат: op=0 + текст).
 */
function buildCommentPayload(text) {
  return beginCell().storeUint(0, 32).storeStringTail(text).endCell();
}

/**
 * Собирает транзакцию оплаты минта — обычный перевод TON на наш кошелёк,
 * без вызова какого-либо смарт-контракта. Формат — то, что принимает
 * `tonConnectUI.sendTransaction(...)` на фронтенде.
 *
 * @param {object} params
 * @param {string} params.flagId
 * @param {number} params.priceTon
 * @returns {object} { validUntil, messages, meta }
 */
export function buildPaymentTransaction({ flagId, priceTon }) {
  const receiverAddress = process.env.PAYMENT_RECEIVER_ADDRESS;
  if (!receiverAddress) {
    throw new Error("PAYMENT_RECEIVER_ADDRESS не задан в .env — куда пользователь должен платить за минт");
  }

  const feeBufferTon = Number(process.env.ESTIMATED_NETWORK_FEE_TON || 0.02);
  const totalTon = Number(priceTon) + feeBufferTon;

  const body = buildCommentPayload(`FlagMint: ${flagId}`);

  return {
    validUntil: Math.floor(Date.now() / 1000) + 5 * 60, // 5 минут на подпись
    messages: [
      {
        address: Address.parse(receiverAddress).toString(),
        amount: toNano(totalTon.toFixed(9)).toString(),
        payload: body.toBoc().toString("base64"),
      },
    ],
    meta: {
      priceTon,
      networkFeeTon: feeBufferTon,
      totalTon,
      receiverAddress,
    },
  };
}
