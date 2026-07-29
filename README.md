# FlagMint — Telegram Mini App

Минт анимированных NFT-флагов всех стран и регионов прямо в Telegram — оплата
простым переводом в TON, сам NFT создаётся и передаётся пользователю через
официальный **Getgems Minting API** и сразу появляется в коллекции на Getgems.

## Состав репозитория

```
nft-flags-miniapp/
├── bot/            Telegram-бот (Telegraf), который открывает Mini App
│                   и постит анонс в группу при успешном минте
├── frontend/       React + Vite приложение (Telegram WebApp SDK, TonConnect)
│                   + готовые анимации флагов (frontend/public/flags/*.gif, *.png)
├── backend/        Node.js/Express API: каталог, минт, валидация initData
└── README.md
```

## Как это работает (поток пользователя)

1. Пользователь пишет боту `/start` → бот присылает кнопку **«Открыть каталог
   флагов»** (`web_app` button), которая открывает Mini App внутри Telegram.
2. Каталог → карточка флага → **Mint** → экран подтверждения (цена/комиссия/
   итого) → подпись **простого TON-перевода** в Tonkeeper/MyTonWallet на
   собственный кошелёк проекта (`PAYMENT_RECEIVER_ADDRESS`).
3. После отправки оплаты backend вызывает **Getgems Minting API**
   (`POST /public-api/minting/{collectionAddress}`), передавая адрес
   кошелька пользователя, метаданные флага и его порядковый номер в
   коллекции. Сам NFT создаёт и присылает пользователю Getgems — это не
   ончейн-вызов контракта с нашей стороны.
4. Backend опрашивает статус создания у Getgems (обычно 6 секунд — пара
   минут) и помечает минт как `success` со ссылкой на карточку NFT, или
   `error` с понятным текстом.
5. Личный кабинет («Мои NFT») показывает список всех попыток минта и их
   статусы — при каждом открытии backend сам перепроверяет зависшие
   `pending`-записи у Getgems.
6. При успешном минте backend дополнительно постит анонс (анимация + кнопка
   «Смотреть на Getgems») в Telegram-группу — см. `MINT_ANNOUNCE_CHAT_ID`.

## ⚠️ Что нужно донастроить перед запуском

1. **Коллекция на Getgems.** Создайте коллекцию через Getgems Studio
   (testnet: `testnet.getgems.io`, мейннет: `getgems.io`) с включённым
   переключателем **«Создать API ключ»**. После создания придёт сообщение
   от служебного бота Getgems с `host`, `collectionAddress` и
   `authorization`-токеном — впишите их в `GETGEMS_API_HOST`,
   `NFT_COLLECTION_ADDRESS`, `GETGEMS_API_KEY`.
2. **Служебный кошелёк Getgems.** В том же сообщении будет адрес кошелька,
   который нужно пополнить TON (~0.023 TON списывается на каждый созданный
   Getgems NFT) — это ИХ внутренний расход на газ, отдельно от цены,
   которую платит пользователь.
3. **Собственный кошелёк для приёма оплаты.** `PAYMENT_RECEIVER_ADDRESS` —
   ваш кошелёк, куда идёт цена флага от пользователя (это НЕ то же самое,
   что кошелёк Getgems из пункта 2).
4. **Постоянное хранилище истории минтов.** История минтов сохраняется в
   JSON-файл на диске (`backend/src/db/memoryDb.js`, путь `DATA_DIR`).
   Чтобы это переживало передеплой на Railway — подключите **Volume**,
   смонтированный в `DATA_DIR` (по умолчанию `/data`), в настройках
   backend-сервиса.
5. **Каталог и анимации флагов уже готовы** (`backend/src/data/flags.json`,
   `frontend/public/flags/*.gif` + `*.png`) — сгенерированы отдельным
   Python-инструментарием (не входит в этот репозиторий как рабочий код,
   только результат). Если понадобится перегенерировать или добавить
   недостающие флаги — потребуется этот инструментарий отдельно.

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
cp .env.example .env   # см. список переменных ниже
npm run dev             # http://localhost:4000
```

### 3. Frontend
```bash
cd frontend
npm install
cp .env.example .env    # VITE_API_URL, VITE_TONCONNECT_MANIFEST_URL
npm run dev              # http://localhost:5173
```

Для теста внутри настоящего Telegram frontend+backend должны быть на
публичном HTTPS (например, через деплой на Railway) — этот URL указывается
в `web_app`-кнопке бота и в `tonconnect-manifest.json`.

## Переменные окружения backend (см. `.env.example`)

| Переменная | Назначение |
|---|---|
| `BOT_TOKEN` | токен бота — для проверки `initData` и отправки анонсов в группу |
| `GETGEMS_API_HOST` | `https://api.testnet.getgems.io` или `https://api.getgems.io` |
| `GETGEMS_API_KEY` | `authorization`-токен из сообщения бота Getgems |
| `NFT_COLLECTION_ADDRESS` | адрес коллекции из того же сообщения |
| `PAYMENT_RECEIVER_ADDRESS` | ваш кошелёк для приёма оплаты от пользователей |
| `FRONTEND_PUBLIC_URL` | публичный адрес фронтенда (оттуда берутся картинки NFT) |
| `MINT_ANNOUNCE_CHAT_ID` | `@username` группы для анонсов об успешном минте |
| `MINT_SUPPLY_CAP` | общий лимит NFT на всю коллекцию (0 = без лимита) |
| `DATA_DIR` | путь для сохранения истории минтов (смонтируйте сюда Volume) |
| `TON_NETWORK` | `testnet` или `mainnet` |
| `CORS_ORIGIN` | адрес фронтенда, разрешённый для CORS |

## Технологии

- **Frontend:** React 18, Vite, `@twa-dev/sdk` (Telegram WebApp SDK),
  `@tonconnect/ui-react`, react-i18next (RU/EN).
- **Backend:** Node.js, Express, проверка `initData` по HMAC-SHA256,
  идемпотентность через `Idempotency-Key`, интеграция с Getgems Minting API.
- **Блокчейн:** TON, TonConnect — только для простого перевода оплаты;
  сам минт NFT делает Getgems через свой API.
- **Данные:** `flags.json` (201 флаг: 194 страны + 7 регионов), анимации —
  GIF (физическая симуляция волны ткани через OpenCV), статичные постеры —
  PNG, всё раздаётся самим frontend-сервисом.

## Безопасность

- Каждый запрос из Mini App на backend несёт заголовок `X-Telegram-Init-Data`;
  middleware `validateInitData` проверяет подпись и свежесть (`auth_date`).
- Повторные запросы на минт блокируются идемпотентным ключом
  (`Idempotency-Key`) — см. `backend/src/middleware/idempotency.js`.
- Секреты (`BOT_TOKEN`, кошелёк, API-ключи) — только в `.env`, никогда в
  коде фронтенда.
- `backend/scripts/generate-flags.mjs` — устаревший черновой генератор
  каталога, оставлен только для истории и заблокирован от случайного
  запуска (см. комментарий в файле). Актуальный `flags.json` создан другим
  инструментарием и содержать реальные анимации/цену/лимит тиража. 
