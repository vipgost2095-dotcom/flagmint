/**
 * Конфигурация TonConnect. Сам провайдер (<TonConnectUIProvider>)
 * подключается в src/App.jsx — здесь только константы и мелкие хелперы.
 */

export const TONCONNECT_MANIFEST_URL =
  import.meta.env.VITE_TONCONNECT_MANIFEST_URL ?? `${window.location.origin}/tonconnect-manifest.json`;

/**
 * Без этого поля кошелёк Telegram Wallet технически подключается (сама
 * транзакция handshake проходит), но TonConnect не может правильно
 * восстановить состояние подключения именно ВНУТРИ Mini App при возврате
 * из чата с @wallet — приложение показывает "не подключено" и кнопку
 * подключить заново, хотя кошелёк уже подтвердил связь на своей стороне.
 *
 * Mini App зарегистрирован в BotFather через /newapp с коротким именем
 * "flagmint" → t.me/flag_mint_bot/flagmint. Оба значения читаются из
 * переменных окружения (VITE_BOT_USERNAME, VITE_MINI_APP_SHORT_NAME),
 * заданных на Railway.
 */
const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME ?? "flag_mint_bot";
const MINI_APP_SHORT_NAME = import.meta.env.VITE_MINI_APP_SHORT_NAME ?? "flagmint";

export const ACTIONS_CONFIGURATION = {
  twaReturnUrl: `https://t.me/${BOT_USERNAME}/${MINI_APP_SHORT_NAME}`,
};

/**
 * TonConnect по умолчанию и так подтягивает стандартный список кошельков
 * из общего реестра TON (Tonkeeper, MyTonWallet, Tonhub, и в том числе
 * сам Telegram Wallet — он там тоже официально зарегистрирован).
 *
 * ВАЖНО: раньше здесь был захардкожен свой конфиг для "Wallet" (Telegram)
 * с вручную вписанным bridgeUrl. Это оказалось источником бага: кошелёк
 * подтверждал подключение на своей стороне, но наше приложение слушало
 * не тот bridge (наш захардкоженный адрес разошёлся с тем, что реально
 * использует @wallet сейчас) — подключение технически происходило, но
 * никогда не долетало обратно в Mini App. Официальный реестр обновляется
 * централизованно, поэтому доверяем ему, а не переписываем его вручную.
 * Остальные кошельки (не входящие в реестр по умолчанию) оставляем.
 */
export const WALLETS_LIST_CONFIGURATION = {
  includeWallets: [
    {
      appName: "tonwallet",
      name: "TON Wallet",
      imageUrl: "https://wallet.ton.org/assets/ui/qr-logo.png",
      aboutUrl: "https://chrome.google.com/webstore/detail/ton-wallet/nphplpgoakhhjchkkhmiggakijnkhfnd",
      universalLink: "https://wallet.ton.org/ton-connect",
      jsBridgeKey: "tonwallet",
      bridgeUrl: "https://bridge.tonapi.io/bridge",
      platforms: ["chrome"],
    },
    {
      appName: "bitgetTonWallet",
      name: "Bitget Wallet",
      imageUrl: "https://raw.githubusercontent.com/bitkeepwallet/download/main/logo/png/bitget_wallet_logo_iOS.png",
      aboutUrl: "https://web3.bitget.com",
      universalLink: "https://bkcode.vip/ton-connect",
      jsBridgeKey: "bitgetTonWallet",
      bridgeUrl: "https://ton-connect-bridge.bgwapi.io/bridge",
      platforms: ["ios", "android", "macos", "windows", "linux"],
    },
    {
      appName: "bitgetWalletLite",
      name: "Bitget Wallet Lite",
      imageUrl: "https://raw.githubusercontent.com/bitgetwallet/download/main/logo/png/bitget_wallet_lite_logo.png",
      aboutUrl: "https://web3.bitget.com",
      universalLink: "https://t.me/BitgetWallet_TGBot?attach=wallet",
      bridgeUrl: "https://ton-connect-bridge.bgwapi.io/bridge",
      platforms: ["ios", "android", "macos", "windows", "linux"],
    },
  ],
};

/**
 * Отправляет транзакцию минта, полученную от backend, на подпись в
 * кошелёк пользователя (Tonkeeper/MyTonWallet и т.п.) через TonConnect UI.
 *
 * @param {import('@tonconnect/ui-react').TonConnectUI} tonConnectUI
 * @param {object} transaction - объект transaction из ответа /api/mint/prepare
 */
export async function signAndSendMintTransaction(tonConnectUI, transaction) {
  // TonConnect UI ожидает формат { validUntil, messages: [{ address, amount, payload }] }
  return tonConnectUI.sendTransaction({
    validUntil: transaction.validUntil,
    messages: transaction.messages,
  });
}

