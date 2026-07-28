/**
 * getgemsService.js
 * -----------------
 * Вспомогательные функции для интеграции с Getgems: формирование ссылок на
 * карточку NFT/коллекции в интерфейсе Getgems.
 *
 * Сам минт NFT происходит через официальный Getgems Minting API (см.
 * services/getgemsMintingApi.js) — Getgems создаёт NFT у себя и сам
 * пересылает его на кошелёк пользователя, используя свой служебный
 * кошелёк для газа. Метаданные (name/description/image/attributes)
 * передаются прямо в теле запроса к их API — отдельный HTTPS-эндпоинт с
 * метаданными или IPFS-пиннинг не нужны.
 */

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
