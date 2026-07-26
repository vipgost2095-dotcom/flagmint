/**
 * bot.js — минимальный Telegram-бот, который открывает Mini App.
 * Вся бизнес-логика (каталог, минт) живёт в backend/frontend — бот
 * нужен только как точка входа и канал для уведомлений о статусе минта.
 */
import "dotenv/config";
import { Telegraf, Markup } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const MINI_APP_URL = process.env.MINI_APP_URL; // публичный HTTPS-адрес фронтенда

if (!BOT_TOKEN) throw new Error("BOT_TOKEN не задан в bot/.env");
if (!MINI_APP_URL) throw new Error("MINI_APP_URL не задан в bot/.env");

const bot = new Telegraf(BOT_TOKEN);

const locales = {
  ru: {
    welcome:
      "Привет! Здесь можно заминтить анимированный NFT-флаг любой страны или региона — оплата в TON, коллекция сразу доступна на Getgems.",
    openApp: "🎌 Открыть каталог флагов",
  },
  en: {
    welcome:
      "Hi! Mint an animated NFT flag of any country or region — pay in TON, the collection is instantly visible on Getgems.",
    openApp: "🎌 Open flag catalog",
  },
};

function textFor(ctx) {
  const lang = ctx.from?.language_code?.startsWith("ru") ? "ru" : "en";
  return locales[lang];
}

bot.start((ctx) => {
  const t = textFor(ctx);
  return ctx.reply(
    t.welcome,
    Markup.inlineKeyboard([Markup.button.webApp(t.openApp, MINI_APP_URL)])
  );
});

// Позволяет открыть приложение и из обычного сообщения/команды /app
bot.command("app", (ctx) => {
  const t = textFor(ctx);
  return ctx.reply(t.openApp, Markup.inlineKeyboard([Markup.button.webApp(t.openApp, MINI_APP_URL)]));
});

/**
 * Уведомление о статусе минта. Backend вызывает эту функцию (либо HTTP-эндпоинт
 * бота, либо напрямую, если бот и backend — один процесс) после того, как
 * транзакция минта подтвердилась или упала с ошибкой.
 *
 * Здесь — для наглядности — экспортируем функцию отправки; в реальном
 * деплое проще всего поднять у бота небольшой HTTP-эндпоинт (например,
 * POST /notify) и звать его из backend/src/routes/mint.js после обновления
 * статуса в БД.
 */
export async function notifyMintStatus({ telegramUserId, lang = "ru", flagName, status, getgemsUrl }) {
  const messages = {
    ru: {
      pending: `⏳ Минт флага «${flagName}» отправлен в сеть, ждём подтверждения…`,
      success: `✅ Флаг «${flagName}» успешно заминтен! Смотрите карточку на Getgems: ${getgemsUrl}`,
      error: `❌ Не удалось заминтить флаг «${flagName}». Попробуйте ещё раз или обратитесь в поддержку.`,
    },
    en: {
      pending: `⏳ Mint of "${flagName}" was sent to the network, waiting for confirmation…`,
      success: `✅ "${flagName}" flag minted successfully! View it on Getgems: ${getgemsUrl}`,
      error: `❌ Failed to mint "${flagName}". Please try again or contact support.`,
    },
  };

  const text = messages[lang]?.[status] ?? messages.ru[status];
  await bot.telegram.sendMessage(telegramUserId, text);
}

bot.launch();
console.log("Bot запущен");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
