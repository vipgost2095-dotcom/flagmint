/**
 * Защита от повторных запросов на минт.
 *
 * Клиент обязан передавать заголовок Idempotency-Key — уникальную строку,
 * сгенерированную один раз на попытку минта (например, uuid, созданный при
 * открытии экрана подтверждения). Если тот же ключ приходит повторно
 * (двойной тап по кнопке, повтор из-за плохой сети, retry на фронтенде),
 * backend просто возвращает ранее сохранённый результат вместо повторного
 * запуска транзакции.
 *
 * Хранилище — простой in-memory Map с TTL. Для продакшена с несколькими
 * инстансами backend замените на Redis (SET key value NX EX ttl).
 */

const store = new Map(); // key -> { status: 'pending'|'done', response, expiresAt }
const TTL_MS = 10 * 60 * 1000; // 10 минут достаточно, чтобы перекрыть окно ретраев

function cleanupExpired() {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.expiresAt < now) store.delete(key);
  }
}

export function idempotency() {
  return function middleware(req, res, next) {
    const key = req.header("Idempotency-Key");
    if (!key) {
      return res.status(400).json({
        error: "MISSING_IDEMPOTENCY_KEY",
        message: "Заголовок Idempotency-Key обязателен для этого запроса",
      });
    }

    cleanupExpired();
    const existing = store.get(key);

    if (existing) {
      // Уже видели этот ключ — не даём запросу пойти дальше, отдаём сохранённый ответ
      return res.status(existing.status === "pending" ? 202 : 200).json(existing.response);
    }

    // Резервируем ключ, чтобы параллельный дублирующий запрос увидел "pending"
    store.set(key, {
      status: "pending",
      response: { status: "pending", message: "Запрос уже обрабатывается" },
      expiresAt: Date.now() + TTL_MS,
    });

    // Даём хендлеру способ зафиксировать финальный ответ под этим ключом
    req.idempotencyKey = key;
    req.saveIdempotentResult = (responseBody) => {
      store.set(key, {
        status: "done",
        response: responseBody,
        expiresAt: Date.now() + TTL_MS,
      });
    };

    next();
  };
}
