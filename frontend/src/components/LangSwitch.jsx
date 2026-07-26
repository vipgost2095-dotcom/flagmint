import { useTranslation } from "react-i18next";

export default function LangSwitch() {
  const { i18n } = useTranslation();

  return (
    <div className="lang-switch">
      <button
        className={i18n.language === "ru" ? "active" : ""}
        onClick={() => i18n.changeLanguage("ru")}
      >
        RU
      </button>
      <button
        className={i18n.language === "en" ? "active" : ""}
        onClick={() => i18n.changeLanguage("en")}
      >
        EN
      </button>
    </div>
  );
}
