import crypto from "crypto";

/**
 * Валидация Telegram WebApp initData.
 *
 * Алгоритм (официальный, см. https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app):
 * 1. Строка initData — это querystring вида "key1=val1&key2=val2&hash=...".
 * 2. Убираем поле hash, остальные пары сортируем по ключу и склеиваем в
 *    "key=value" через "\n" — получаем data-check-string.
 * 3. secretKey = HMAC_SHA256("WebAppData", BOT_TOKEN)
 * 4. Вычисленный HMAC_SHA256(data-check-string, secretKey) в hex должен
 *    совпасть с переданным hash.
 * 5. Дополнительно проверяем auth_date — initData не должен быть "протухшим",
 *    иначе его можно переиспользовать (replay-атака).
 *
 * Ожидаем initData в заголовке X-Telegram-Init-Data (фронтенд берёт его
 * из window.Telegram.WebApp.initData и передаёт как есть, без модификаций).
 */
export function validateInitData({ botToken, maxAgeSeconds = 86400 }) {
  if (!botToken) {
    // Явная ошибка конфигурации — лучше упасть на старте, чем молча пропускать запросы
    throw new Error("validateInitData: BOT_TOKEN не задан в .env");
  }

  return function middleware(req, res, next) {
    try {
      const initData = req.header("X-Telegram-Init-Data");

      if (!initData || typeof initData !== "string") {
        return res.status(401).json({
          error: "MISSING_INIT_DATA",
          message: "Отсутствует заголовок X-Telegram-Init-Data",
        });
      }

      const params = new URLSearchParams(initData);
      const receivedHash = params.get("hash");
      if (!receivedHash) {
        return res.status(401).json({ error: "INVALID_INIT_DATA", message: "Нет поля hash" });
      }
      params.delete("hash");

      // Сортировка ключей и сборка data-check-string
      const dataCheckArr = [];
      for (const [key, value] of [...params.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        dataCheckArr.push(`${key}=${value}`);
      }
      const dataCheckString = dataCheckArr.join("\n");

      const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
      const computedHash = crypto
        .createHmac("sha256", secretKey)
        .update(dataCheckString)
        .digest("hex");

      const validSignature = timingSafeEqualHex(computedHash, receivedHash);
      if (!validSignature) {
        return res.status(401).json({
          error: "INVALID_SIGNATURE",
          message: "Подпись initData не совпадает — запрос отклонён",
        });
      }

      // Проверка "свежести" данных
      const authDate = Number(params.get("auth_date"));
      if (!authDate || Number.isNaN(authDate)) {
        return res.status(401).json({ error: "INVALID_AUTH_DATE" });
      }
      const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
      if (ageSeconds > maxAgeSeconds) {
        return res.status(401).json({
          error: "INIT_DATA_EXPIRED",
          message: "initData устарел, откройте приложение заново из Telegram",
        });
      }

      // Парсим объект пользователя и прокидываем дальше по цепочке middleware
      const userRaw = params.get("user");
      const user = userRaw ? JSON.parse(userRaw) : null;
      if (!user || !user.id) {
        return res.status(401).json({ error: "NO_USER_IN_INIT_DATA" });
      }

      req.telegramUser = user;
      req.initDataParsed = Object.fromEntries(params.entries());
      next();
    } catch (err) {
      // Не пропускаем запрос дальше ни при каких ошибках парсинга
      return res.status(401).json({ error: "INIT_DATA_PARSE_ERROR", message: err.message });
    }
  };
}

function timingSafeEqualHex(a, b) {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
