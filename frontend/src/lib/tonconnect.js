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
 * ⚠️ VITE_MINI_APP_SHORT_NAME — это короткое имя Web App, которое ты
 * указывал в BotFather при регистрации Mini App (/newapp или /myapps →
 * Bot Settings → Menu Button / Web App). Не имя бота, а именно short name
 * приложения — то, что идёт после юзернейма бота в ссылке вида
 * t.me/FlagMintBot/appname. Если не задать переменную, используется
 * дефолт "app" — проверьте, что он совпадает с реальным short name.
 */
const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME ?? "FlagMintBot";
const MINI_APP_SHORT_NAME = import.meta.env.VITE_MINI_APP_SHORT_NAME ?? "app";

export const ACTIONS_CONFIGURATION = {
  twaReturnUrl: `https://t.me/${BOT_USERNAME}/${MINI_APP_SHORT_NAME}`,
};

/**
 * TonConnect по умолчанию и так подтягивает стандартный список кошельков
 * (Tonkeeper, MyTonWallet, Tonhub и т.д.) из общего реестра TON. Поле
 * includeWallets НЕ заменяет этот список, а лишь ДОБАВЛЯЕТ к нему — здесь
 * явно добавлены ещё 4 кошелька (данные — из официальной документации
 * TonConnect/Bitget, а не "на глаз", чтобы bridge/ссылки точно были рабочими).
 */
export const WALLETS_LIST_CONFIGURATION = {
  includeWallets: [
    {
      appName: "telegram-wallet",
      name: "Wallet",
      imageUrl: "https://wallet.tg/images/logo-288.png",
      aboutUrl: "https://wallet.tg/",
      universalLink: "https://t.me/wallet/start",
      bridgeUrl: "https://bridge.ton.space/bridge",
      platforms: ["ios", "android", "macos", "windows", "linux"],
    },
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

