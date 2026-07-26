import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { TonConnectUIProvider } from "@tonconnect/ui-react";

import "./i18n/i18n"; // важно инициализировать до рендера, чтобы язык был готов сразу
import { initTelegramApp } from "./lib/telegram";
import { TONCONNECT_MANIFEST_URL, WALLETS_LIST_CONFIGURATION } from "./lib/tonconnect";
import App from "./App";

// Инициализация Telegram WebApp SDK: тема, полноэкранный режим, готовность
initTelegramApp();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <TonConnectUIProvider
      manifestUrl={TONCONNECT_MANIFEST_URL}
      walletsListConfiguration={WALLETS_LIST_CONFIGURATION}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </TonConnectUIProvider>
  </React.StrictMode>
);
