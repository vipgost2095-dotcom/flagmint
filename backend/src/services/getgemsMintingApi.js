/**
 * getgemsMintingApi.js
 * --------------------
 * Обёртка над РЕАЛЬНЫМ Getgems Minting API (не ончейн-вызов контракта, а
 * обычный HTTP API). Формат подтверждён из официальной документации
 * (github.com/getgems-io/nft-contracts/blob/main/docs/minting-api-ru.md),
 * которую прислал бот @getgems_testnet_bot после подключения Telegram.
 *
 * Как это работает:
 *  - Getgems минтит NFT САМ, используя свой служебный кошелёк (тот,
 *    который вы пополняли по инструкции бота, ~0.023 TON на один NFT);
 *  - наш backend просто вызывает их API с адресом получателя и
 *    метаданными — никакой транзакции от лица пользователя для самого
 *    минта не требуется;
 *  - оплату цены флага (5 TON) пользователь делает ОТДЕЛЬНЫМ простым
 *    переводом на наш собственный кошелёк — см. tonService.js.
 *
 * ⚠️ Точная структура ОТВЕТА статус-эндпоинта (какие поля содержат адрес
 * NFT, ссылку на Getgems, статус) не была явно видна в присланных
 * скриншотах — код ниже читает несколько вероятных вариантов названий
 * полей. Если в реальном ответе окажутся другие названия — понадобится
 * скорректировать `normalizeStatusResponse` под реальный JSON (проще
 * всего — залогировать один реальный ответ и прислать мне).
 */

function getConfig() {
  const host = process.env.GETGEMS_API_HOST;
  const collectionAddress = process.env.NFT_COLLECTION_ADDRESS;
  const apiKey = process.env.GETGEMS_API_KEY;

  if (!host) throw new Error("GETGEMS_API_HOST не задан в .env (например https://api.testnet.getgems.io)");
  if (!collectionAddress) throw new Error("NFT_COLLECTION_ADDRESS не задан в .env");
  if (!apiKey) throw new Error("GETGEMS_API_KEY не задан в .env");

  return { host, collectionAddress, apiKey };
}

/**
 * Запускает создание NFT в коллекции через Getgems Minting API.
 * NFT создаётся не мгновенно — от 6 секунд до нескольких минут, поэтому
 * этот вызов только СТАВИТ задачу, а не подтверждает готовность.
 *
 * @param {object} params
 * @param {string} params.requestId - уникальный id (используем id нашего mint-а)
 * @param {string} params.ownerAddress - адрес кошелька получателя (пользователя)
 * @param {string} params.name
 * @param {string} params.description
 * @param {string} params.image - публичный HTTPS-адрес картинки
 * @param {Array<{trait_type: string, value: string|number}>} params.attributes
 */
export async function createNftViaGetgems({ requestId, ownerAddress, name, description, image, attributes }) {
  const { host, collectionAddress, apiKey } = getConfig();

  const res = await fetch(`${host}/public-api/minting/${collectionAddress}`, {
    method: "POST",
    headers: {
      accept: "application/json",
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ requestId, ownerAddress, name, description, image, attributes }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(`Getgems Minting API вернул ошибку ${res.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

/**
 * Проверяет статус ранее запущенного создания NFT.
 * Согласно документации, при timeout/500 запрос безопасно повторить с тем
 * же requestId.
 */
export async function getGetgemsMintStatus({ requestId }) {
  const { host, collectionAddress, apiKey } = getConfig();

  const res = await fetch(`${host}/public-api/minting/${collectionAddress}/${requestId}`, {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: apiKey,
    },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(`Getgems Minting Status API вернул ошибку ${res.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

/**
 * Приводит ответ статус-эндпоинта к единому виду { done, failed, nftAddress, getgemsUrl, raw }.
 * См. предупреждение в шапке файла про неподтверждённые названия полей.
 */
export function normalizeStatusResponse(data) {
  if (!data) return { done: false, failed: false, nftAddress: null, getgemsUrl: null, raw: data };

  const statusText = String(data.status ?? data.state ?? "").toLowerCase();
  const failed = statusText.includes("fail") || statusText.includes("error") || Boolean(data.error);
  const done =
    !failed &&
    (statusText.includes("success") ||
      statusText.includes("done") ||
      statusText.includes("mint") ||
      Boolean(data.address) ||
      Boolean(data.nftAddress) ||
      Boolean(data.nft?.address));

  const nftAddress = data.nftAddress ?? data.address ?? data.nft?.address ?? null;
  const getgemsUrl = data.getgemsUrl ?? data.link ?? data.url ?? data.nft?.getgemsUrl ?? null;

  return { done, failed, nftAddress, getgemsUrl, raw: data };
}
