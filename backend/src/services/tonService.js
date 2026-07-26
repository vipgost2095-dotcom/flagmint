/**
 * tonService.js
 * -------------
 * Инкапсулирует всё взаимодействие с сетью TON:
 *  - сборка транзакции минта, которую фронтенд отправит на подпись через
 *    TonConnect (Tonkeeper/MyTonWallet);
 *  - проверка статуса транзакции в сети после того, как кошелёк её отправил.
 *
 * Реальный формат mint-сообщения зависит от ABI конкретного контракта
 * коллекции (Getgems создаёт коллекции по стандарту, совместимому с
 * NFT-1.2, но точные op-коды/поля нужно взять из документации вашей
 * коллекции после её создания в Getgems Studio — см. README).
 * Места, где нужно подставить реальную логику, помечены TODO.
 */

import { Address, beginCell, toNano } from "@ton/core";
import { TonClient } from "@ton/ton";

let tonClientInstance = null;

function getTonClient() {
  if (tonClientInstance) return tonClientInstance;
  tonClientInstance = new TonClient({
    endpoint: process.env.TON_API_ENDPOINT,
    apiKey: process.env.TON_API_KEY,
  });
  return tonClientInstance;
}

/**
 * Собирает транзакцию (набор сообщений) в формате, который принимает
 * TonConnect UI (`tonConnectUI.sendTransaction(...)`) на фронтенде.
 *
 * @param {object} params
 * @param {string} params.flagId - id флага из каталога
 * @param {string} params.userWalletAddress - адрес кошелька пользователя (из TonConnect)
 * @param {number} params.priceTon - цена минта в TON
 * @returns {object} transactionRequest — формат BOC-сообщения для TonConnect
 */
export function buildMintTransaction({ flagId, userWalletAddress, priceTon }) {
  const collectionAddress = process.env.NFT_COLLECTION_ADDRESS;
  if (!collectionAddress) {
    throw new Error(
      "NFT_COLLECTION_ADDRESS не задан в .env — сначала создайте коллекцию в Getgems Studio"
    );
  }

  // TODO: реальный вызов — замените payload на point-message коллекции Getgems.
  // Ниже — иллюстративная структура тела сообщения с op-кодом "mint" и
  // произвольным полем content (в реальности сюда пойдут metadata-ссылка
  // на IPFS и/или per-item nft index согласно ABI вашей коллекции).
  const body = beginCell()
    .storeUint(0x1, 32) // op: mint (ЗАГЛУШКА — замените на реальный op-код вашей коллекции)
    .storeUint(Date.now(), 64) // query_id
    .storeStringTail(flagId) // произвольные данные, которые распознает ваш контракт/индексатор
    .endCell();

  const feeBufferTon = Number(process.env.ESTIMATED_NETWORK_FEE_TON || 0.05);
  const totalTon = Number(priceTon) + feeBufferTon;

  return {
    validUntil: Math.floor(Date.now() / 1000) + 5 * 60, // 5 минут на подпись
    messages: [
      {
        address: Address.parse(collectionAddress).toString(),
        amount: toNano(totalTon.toFixed(9)).toString(),
        payload: body.toBoc().toString("base64"),
      },
    ],
    // Метаданные для UI — не часть самой транзакции TON
    meta: {
      priceTon,
      networkFeeTon: feeBufferTon,
      totalTon,
      collectionAddress,
    },
  };
}

/**
 * Проверяет по хэшу/адресу отправителя, прошла ли транзакция минта в сети,
 * и пытается определить адрес созданного NFT-item.
 *
 * TODO: реальный вызов — используйте индексатор (TonAPI/Toncenter) для
 * поиска исходящего сообщения от коллекции с NFT-item деплоем, либо
 * слушайте вебхук/событие от Getgems, если оно поддерживается.
 */
export async function checkMintTransactionStatus({ userWalletAddress, sinceLt }) {
  const client = getTonClient();

  try {
    const address = Address.parse(userWalletAddress);
    const transactions = await client.getTransactions(address, { limit: 5 });

    // ЗАГЛУШКА: в реальности здесь нужно найти исходящее сообщение к
    // NFT_COLLECTION_ADDRESS с нужным query_id/telegram userId и вычислить
    // адрес задеплоенного NFT-item (обычно детерминирован по коллекции + индексу).
    const found = transactions.find((tx) => tx.inMessage?.info?.type === "external-in");

    if (!found) {
      return { confirmed: false };
    }

    return {
      confirmed: true,
      txHash: found.hash().toString("hex"),
      // nftAddress здесь должен вычисляться реальной логикой (см. TODO выше)
      nftAddress: null,
    };
  } catch (err) {
    return { confirmed: false, error: err.message };
  }
}
