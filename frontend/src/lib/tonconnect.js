/**
 * Конфигурация TonConnect. Сам провайдер (<TonConnectUIProvider>)
 * подключается в src/App.jsx — здесь только константы и мелкие хелперы.
 */

export const TONCONNECT_MANIFEST_URL =
  import.meta.env.VITE_TONCONNECT_MANIFEST_URL ?? `${window.location.origin}/tonconnect-manifest.json`;

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
