# NFT Flags — Telegram Mini App

Минт анимированных NFT-флагов стран и регионов прямо в Telegram, с оплатой в TON
через TonConnect и публикацией в коллекции на Getgems.

## Состав репозитория

```
nft-flags-miniapp/
├── bot/            Telegram-бот (Telegraf), который открывает Mini App
├── frontend/        React + Vite приложение (Telegram WebApp SDK, TonConnect)
├── backend/          Node.js/Express API: каталог, минт, валидация initData
└── README.md
```

## Как это работает (поток пользователя)

1. Пользователь пишет боту `/start` → бот присылает кнопку **«Открыть каталог флагов»**
   (`web_app` button), которая открывает Mini App внутри Telegram.
2. Каталог → карточка флага → **Mint** → экран подтверждения (цена/комиссия/итого)
   → подпись транзакции в Tonkeeper/MyTonWallet через TonConnect.
3. Backend принимает запрос на минт, валидирует `initData`, ставит запись в статус
   `pending`, следит за транзакцией в TON и по завершении помечает NFT как `success`
   со ссылкой на карточку в Getgems (или `error` с понятным текстом).
4. Личный кабинет показывает список заминченных NFT и их статусы.

## ⚠️ Что нужно донастроить перед продакшеном (важно)

Это рабочий, модульный каркас со всей бизнес-логикой, UI и API. Но три вещи
физически невозможно "захардкодить" за вас — они требуют ваших собственных
аккаунтов/ключей/деплоя:

1. **Смарт-контракт коллекции на Getgems.** Коллекцию нужно создать через
   [Getgems Studio](https://getgems.io/) (или задеплоить NFT-коллекцию TON
   стандартом NFT-1.2 самостоятельно) — вы получите `collectionAddress` и
   зададите роялти/адрес получателя прямо в контракте. Впишите адрес в
   `backend/.env` (`NFT_COLLECTION_ADDRESS`).
2. **Пины в IPFS.** Метаданные (`metadata.json`) и превью-анимации нужно
   закрепить в IPFS (например через [nft.storage](https://nft.storage/) или
   [Pinata](https://www.pinata.cloud/)) и подставить `ipfs://...` ссылки в
   `flags.json`. В `backend/src/services/getgemsService.js` есть готовая
   функция `pinToIpfs()` — donастройте под выбранный пиннинг-сервис.
3. **Ончейн-деплой NFT item / вызов mint-сообщения.** В `tonService.js`
   помечены места `// TODO: реальный вызов`, где нужно собрать и отправить
   сообщение минта в соответствии с ABI вашего конкретного контракта
   коллекции (Getgems использует свой NFT-1.2 совместимый формат — точный
   набор полей `mint`-сообщения смотрите в документации вашей коллекции
   после её создания в Getgems Studio).

Всё остальное — валидация initData, идемпотентность запросов, вебхуки
статусов, UI, локализация, TonConnect-подпись — реализовано и готово к работе.

## Быстрый старт (dev)

### 1. Бот
```bash
cd bot
npm install
cp .env.example .env   # впишите BOT_TOKEN и MINI_APP_URL
npm start
```

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env   # впишите BOT_TOKEN, NFT_COLLECTION_ADDRESS, TON_API_KEY и т.д.
npm run dev             # http://localhost:4000
```

### 3. Frontend
```bash
cd frontend
npm install
cp .env.example .env    # VITE_API_URL, VITE_TONCONNECT_MANIFEST_URL
npm run dev              # http://localhost:5173
```

Для теста внутри настоящего Telegram нужно поднять frontend+backend на
публичном HTTPS (например через `ngrok` или деплой на Vercel/Render) и
указать этот URL в `web_app` кнопке бота и в `tonconnect-manifest.json`.

## Технологии

- **Frontend:** React 18, Vite, `@twa-dev/sdk` (Telegram WebApp SDK),
  `@tonconnect/ui-react`, react-i18next (RU/EN), lottie-web для анимаций.
- **Backend:** Node.js, Express, проверка `initData` по HMAC-SHA256
  (официальный алгоритм Telegram), идемпотентность через `Idempotency-Key`.
- **Блокчейн:** TON, TonConnect для подписи, коллекция NFT на Getgems.
- **Данные:** `flags.json` (JSON-каталог всех стран/регионов с атрибутами),
  превью — CDN/IPFS.

## Безопасность

- Каждый запрос из Mini App на backend несёт заголовок `X-Telegram-Init-Data`;
  middleware `validateInitData` проверяет подпись и свежесть (`auth_date`).
- Повторные запросы на минт блокируются идемпотентным ключом
  (userId + flagId + окно времени) — см. `backend/src/middleware/idempotency.js`.
- Секреты (`BOT_TOKEN`, кошелёк, API-ключи) — только в `.env`, никогда в
  коде фронтенда.
