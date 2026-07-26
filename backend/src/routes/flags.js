import { Router } from "express";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const flagsPath = path.join(__dirname, "..", "data", "flags.json");

// Каталог читаем один раз при старте процесса — он статический, менять
// его в рантайме не требуется. Для перегенерации используйте
// `npm run generate-flags` и перезапуск сервера.
const flags = JSON.parse(readFileSync(flagsPath, "utf-8"));

export const flagsRouter = Router();

/**
 * GET /api/flags?search=&type=country|region&region=
 * Каталог с поиском по названию и фильтром по типу/региону.
 */
flagsRouter.get("/", (req, res) => {
  const { search = "", type, region } = req.query;
  const query = String(search).trim().toLowerCase();

  let result = flags;

  if (type === "country" || type === "region") {
    result = result.filter((f) => f.type === type);
  }

  if (region) {
    result = result.filter((f) => f.attributes.region === region);
  }

  if (query) {
    result = result.filter(
      (f) =>
        f.name.ru.toLowerCase().includes(query) ||
        f.name.en.toLowerCase().includes(query) ||
        f.code.toLowerCase().includes(query)
    );
  }

  res.json({ items: result, total: result.length });
});

/** GET /api/flags/:id — карточка одного флага */
flagsRouter.get("/:id", (req, res) => {
  const flag = flags.find((f) => f.id === req.params.id);
  if (!flag) {
    return res.status(404).json({ error: "FLAG_NOT_FOUND" });
  }
  res.json(flag);
});

export function getFlagById(id) {
  return flags.find((f) => f.id === id) ?? null;
}
