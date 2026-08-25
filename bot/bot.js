/**
 * bot.js — минимальный Telegram-бот, который открывает Mini App.
 * Вся бизнес-логика (каталог, минт) живёт в backend/frontend — бот
 * нужен только как точка входа и канал для уведомлений о статусе минта.
 */
import "dotenv/config";
import { Telegraf, Markup } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const MINI_APP_URL = process.env.MINI_APP_URL; // публичный HTTPS-адрес фронтенда — используется как fallback
const BACKEND_URL = process.env.BACKEND_URL; // публичный HTTPS-адрес backend, напр. https://miraculous-gratitude-production-a2be.up.railway.app
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET; // тот же секрет, что и в backend Variables

/**
 * Ссылка вида t.me/flag_mint_bot/flagmint — Mini App, зарегистрированный
 * в BotFather через /newapp. Открывать нужно именно через неё (а не через
 * сырой MINI_APP_URL), иначе TonConnect не может корректно восстановить
 * подключение кошелька Telegram Wallet при возврате из чата с @wallet
 * (см. frontend/src/lib/tonconnect.js — ACTIONS_CONFIGURATION.twaReturnUrl
 * указывает именно на эту ссылку, так что открывать приложение нужно тем
 * же путём, иначе Telegram не свяжет сессии).
 */
const MINI_APP_DIRECT_LINK = process.env.MINI_APP_DIRECT_LINK; // напр. https://t.me/flag_mint_bot/flagmint

if (!BOT_TOKEN) throw new Error("BOT_TOKEN не задан в bot/.env");
if (!MINI_APP_URL) throw new Error("MINI_APP_URL не задан в bot/.env");
if (!MINI_APP_DIRECT_LINK) throw new Error("MINI_APP_DIRECT_LINK не задан в bot/.env (напр. https://t.me/flag_mint_bot/flagmint)");

const bot = new Telegraf(BOT_TOKEN);

const locales = {
  ru: {
    usersLine: (count) => `👥 Уже с нами: ${count.toLocaleString("ru-RU")}\n\n`,
    welcome:
      "Привет! Здесь можно заминтить анимированный NFT-флаг любой страны или региона — оплата в TON, коллекция сразу доступна на Getgems.",
    openApp: "🎌 Открыть каталог флагов",
  },
  en: {
    usersLine: (count) => `👥 Already joined: ${count.toLocaleString("en-US")}\n\n`,
    welcome:
      "Hi! Mint an animated NFT flag of any country or region — pay in TON, the collection is instantly visible on Getgems.",
    openApp: "🎌 Open flag catalog",
  },
};

function textFor(ctx) {
  const lang = ctx.from?.language_code?.startsWith("ru") ? "ru" : "en";
  return locales[lang];
}

/**
 * Регистрирует пользователя (если он новый) и возвращает актуальное
 * общее число уникальных пользователей — для показа наверху приветствия,
 * как это принято у многих ботов ("👥 Уже с нами: N"). При недоступности
 * backend просто не показываем строку со счётчиком — не блокируем вход.
 */
async function trackUserAndGetCount(ctx) {
  if (!BACKEND_URL || !INTERNAL_API_SECRET) return null;
  try {
    await fetch(`${BACKEND_URL}/api/stats/track-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": INTERNAL_API_SECRET,
      },
      body: JSON.stringify({ userId: ctx.from.id }),
    });
    const res = await fetch(`${BACKEND_URL}/api/stats/users-count`, {
      headers: { "X-Internal-Secret": INTERNAL_API_SECRET },
    });
    const data = await res.json();
    return typeof data.count === "number" ? data.count : null;
  } catch (err) {
    console.error("[stats] Не удалось учесть пользователя/получить счётчик:", err.message);
    return null;
  }
}

/**
 * Если человек пришёл по реферальной ссылке вида t.me/FlagMintBot?start=ref_12345,
 * Telegraf кладёт "ref_12345" в ctx.startPayload. Сообщаем об этом backend'у —
 * он сам решит, засчитывать реферала или нет (самореферал / уже был засчитан
 * раньше и т.п.). Это одностороннее уведомление, ошибки тут не критичны —
 * не блокируем пользователя от открытия приложения, если backend недоступен.
 */
async function reportReferralIfAny(ctx) {
  const payload = ctx.startPayload; // например "ref_123456789"
  if (!payload || !payload.startsWith("ref_")) return;
  if (!BACKEND_URL || !INTERNAL_API_SECRET) {
    console.warn("[referral] BACKEND_URL/INTERNAL_API_SECRET не заданы — пропускаем учёт реферала");
    return;
  }

  const referrerId = payload.slice("ref_".length);
  try {
    await fetch(`${BACKEND_URL}/api/referrals/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": INTERNAL_API_SECRET,
      },
      body: JSON.stringify({ newUserId: ctx.from.id, referrerId }),
    });
  } catch (err) {
    console.error("[referral] Не удалось сообщить backend о реферале:", err.message);
  }
}

bot.start(async (ctx) => {
  const usersCount = await trackUserAndGetCount(ctx);
  await reportReferralIfAny(ctx);
  const t = textFor(ctx);
  const messageText = (usersCount !== null ? t.usersLine(usersCount) : "") + t.welcome;
  return ctx.reply(
    messageText,
    Markup.inlineKeyboard([Markup.button.url(t.openApp, MINI_APP_DIRECT_LINK)])
  );
});

// Позволяет открыть приложение и из обычного сообщения/команды /app
bot.command("app", (ctx) => {
  const t = textFor(ctx);
  return ctx.reply(t.openApp, Markup.inlineKeyboard([Markup.button.url(t.openApp, MINI_APP_DIRECT_LINK)]));
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
