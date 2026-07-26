import { TonConnectButton, useTonAddress } from "@tonconnect/ui-react";
import { useTranslation } from "react-i18next";

/**
 * Меню выбора/подключения кошелька.
 *
 * <TonConnectButton /> — готовый компонент TonConnect UI:
 *  - если кошелёк не подключён — показывает кнопку, по нажатию открывает
 *    модалку со списком кошельков (Tonkeeper, MyTonWallet, Telegram Wallet,
 *    Bitget Wallet и т.д. — см. lib/tonconnect.js);
 *  - если кошелёк уже подключён — показывает сокращённый адрес и по
 *    нажатию открывает меню с адресом и кнопкой "Отключить".
 *
 * Один и тот же TonConnect UI используется во всём приложении, поэтому
 * подключение здесь сразу видно и на экране подтверждения минта.
 */
export default function WalletMenu() {
  const { t } = useTranslation();
  const address = useTonAddress();

  return (
    <div className="wallet-menu">
      <span className="wallet-menu__label">
        {address ? t("wallet.connected") : t("wallet.notConnected")}
      </span>
      <TonConnectButton />
    </div>
  );
}
