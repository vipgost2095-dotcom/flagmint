/**
 * getgemsService.js
 * -----------------
 * Вспомогательные функции для интеграции с Getgems:
 *  - формирование ссылки на карточку NFT/коллекции в Getgems UI;
 *  - пиннинг метаданных (metadata.json) в IPFS перед минтом (NFT-стандарт
 *    TON ожидает, что content NFT-item ссылается на IPFS/HTTPS JSON с
 *    полями name/description/image/attributes).
 *
 * Getgems сам по себе не предоставляет "API минта" — минт происходит
 * ончейн через сообщение в контракт коллекции; Getgems лишь индексирует
 * готовые NFT из блокчейна и показывает их в своём каталоге. Поэтому
 * никакого отдельного вызова "создать NFT в Getgems" после успешной
 * ончейн-транзакции не требуется — карточка появится автоматически после
 * индексации (обычно от нескольких секунд до пары минут).
 */

const GETGEMS_BASE_URL = "https://getgems.io";

/**
 * @param {string} network 'mainnet' | 'testnet'
 * @param {string} nftAddress адрес задеплоенного NFT-item
 */
export function buildGetgemsNftUrl({ network, nftAddress }) {
  if (!nftAddress) return null;
  const host = network === "testnet" ? "testnet.getgems.io" : "getgems.io";
  return `https://${host}/nft/${nftAddress}`;
}

export function buildGetgemsCollectionUrl({ network, collectionAddress }) {
  const host = network === "testnet" ? "testnet.getgems.io" : "getgems.io";
  return `https://${host}/collection/${collectionAddress}`;
}

/**
 * Публикует metadata.json флага в IPFS через выбранный пиннинг-сервис и
 * возвращает ipfs:// ссылку, которую нужно использовать как content NFT-item.
 *
 * TODO: реальный вызов — подключите SDK/HTTP API выбранного провайдера
 * (nft.storage, Pinata, web3.storage и т.д.) используя
 * process.env.IPFS_PINNING_API_KEY.
 */
export async function pinFlagMetadataToIpfs(flag) {
  const metadata = {
    name: `${flag.name.en} Flag`,
    description: flag.description.en,
    image: flag.animation.fallbackGifUrl, // превью для маркетплейсов, не поддерживающих Lottie
    animation_url: flag.animation.previewUrl,
    attributes: [
      { trait_type: "country", value: flag.attributes.country ?? "—" },
      { trait_type: "region", value: flag.attributes.region },
      { trait_type: "animation_type", value: flag.attributes.animation_type },
      { trait_type: "edition", value: flag.attributes.edition },
    ],
  };

  // ЗАГЛУШКА: замените на реальный HTTP-вызов вашего пиннинг-провайдера.
  // Пример (nft.storage): POST https://api.nft.storage/upload с телом metadata
  // и заголовком Authorization: Bearer <IPFS_PINNING_API_KEY>.
  console.warn(
    "[getgemsService] pinFlagMetadataToIpfs: используется заглушка — " +
      "настройте реальный пиннинг-провайдер перед продакшеном"
  );

  const fakeCid = `stub-${flag.id}`;
  return { ipfsUri: `ipfs://${fakeCid}/metadata.json`, metadata };
}
