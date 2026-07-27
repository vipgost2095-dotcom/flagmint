import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";

import { validateInitData } from "./middleware/validateInitData.js";
import { flagsRouter } from "./routes/flags.js";
import { mintRouter } from "./routes/mint.js";
import { nftsRouter } from "./routes/nfts.js";

const app = express();

// Railway (как и большинство PaaS) работает через собственный reverse-proxy,
// который добавляет заголовок X-Forwarded-For. Без этой настройки
// express-rate-limit не может корректно определить IP клиента и выбрасывает
// ValidationError на каждый запрос — именно это ломало API целиком.
app.set("trust proxy", 1);

app.use(express.json());

const allowedOrigins = (process.env.CORS_ORIGIN ?? "").split(",").map((s) => s.trim()).filter(Boolean);
app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
  })
);

// Общий rate-limit на всё API — грубая защита от флуда поверх идемпотентности
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/health", (req, res) => res.json({ ok: true }));

// Каталог флагов не требует авторизации — им можно делиться ссылкой,
// его видно и до открытия внутри Telegram (например, в веб-версии).
app.use("/api/flags", flagsRouter);

// Всё, что связано с минтом и личным кабинетом, требует валидного initData
const requireTelegramAuth = validateInitData({
  botToken: process.env.BOT_TOKEN,
  maxAgeSeconds: Number(process.env.INIT_DATA_MAX_AGE_SECONDS ?? 86400),
});

app.use("/api/mint", requireTelegramAuth, mintRouter);
app.use("/api/nfts", requireTelegramAuth, nftsRouter);

// Единый обработчик ошибок — не отдаём стектрейсы наружу
app.use((err, req, res, next) => {
  console.error("[unhandled error]", err);
  res.status(500).json({ error: "INTERNAL_ERROR", message: "Внутренняя ошибка сервера" });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`NFT Flags backend запущен на http://localhost:${port}`);
});
