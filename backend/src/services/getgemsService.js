/**
 * getgemsService.js
 * -----------------
 * Вспомогательные функции для интеграции с Getgems:
 * формирование ссылок на карточку NFT/коллекции в интерфейсе Getgems.
 *
 * Getgems сам по себе не предоставляет "API минта" — минт происходит
 * ончейн через сообщение в контракт коллекции (см. tonService.js); Getgems
 * лишь индексирует готовые NFT из блокчейна и показывает их в своём
 * каталоге. Поэтому никакого отдельного вызова "создать NFT в Getgems"
 * после успешной ончейн-транзакции не требуется — карточка появится
 * автоматически после индексации (обычно от нескольких секунд до пары минут).
 *
 * Метаданные NFT (name/description/image/attributes) отдаёт наш собственный
 * backend по HTTPS — см. routes/nftMetadata.js. Отдельный IPFS-пиннинг не
 * нужен: стандарт TEP-64 разрешает любой HTTPS-адрес, не только ipfs://.
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
