import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ru from "./locales/ru.json";
import en from "./locales/en.json";
import { getTelegramLanguageCode } from "../lib/telegram";

const telegramLang = getTelegramLanguageCode();
// Telegram отдаёт коды вроде "ru", "en", "uk" — если это не ru, используем en как запасной
const initialLang = telegramLang?.startsWith("ru") ? "ru" : "en";

i18n.use(initReactI18next).init({
  resources: {
    ru: { translation: ru },
    en: { translation: en },
  },
  lng: initialLang,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
