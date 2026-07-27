/**
 * telegramNotify.js
 * -----------------
 * Отправляет анонс о заминченном NFT в Telegram-группу (t.me/flagsmint) —
 * анимацию флага (GIF) и кнопку со ссылкой на карточку NFT на Getgems.
 *
 * Использует обычный HTTP-вызов Telegram Bot API (sendAnimation) с тем же
 * BOT_TOKEN, что уже есть у backend — отдельный бот-сервис трогать не нужно.
 *
 * Требует переменную MINT_ANNOUNCE_CHAT_ID в .env — для публичной группы
 * это её @username (например "@flagsmint"). Если группа приватная —
 * понадобится числовой chat_id (его можно получить, добавив бота в группу
 * и один раз вызвав getUpdates после того, как кто-то напишет туда сообщение).
 *
 * ⚠️ Обязательное условие: бот должен быть добавлен в группу
 * https://t.me/flagsmint как участник (для супергрупп этого обычно
 * достаточно; если бот не сможет писать — добавьте его администратором).
 */

export async function notifyGroupMint({ flagNameRu, flagNameEn, animationUrl, getgemsUrl }) {
  const token = process.env.BOT_TOKEN;
  const chatId = process.env.MINT_ANNOUNCE_CHAT_ID;

  if (!token || !chatId) {
    console.warn(
      "[telegramNotify] BOT_TOKEN или MINT_ANNOUNCE_CHAT_ID не заданы — анонс в группу пропущен"
    );
    return;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendAnimation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        animation: animationUrl,
        caption: `🎉 Новый NFT-флаг заминчен: «${flagNameRu}» (${flagNameEn})!`,
        reply_markup: {
          inline_keyboard: [[{ text: "🔗 Смотреть на Getgems", url: getgemsUrl }]],
        },
      }),
    });

    const data = await res.json().catch(() => null);
    if (!data?.ok) {
      console.error("[telegramNotify] Telegram API вернул ошибку:", JSON.stringify(data));
    }
  } catch (err) {
    console.error("[telegramNotify] запрос не удался:", err.message);
  }
}
