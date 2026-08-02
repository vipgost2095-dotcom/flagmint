import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { legalContent } from "../content/legal";

export default function TermsScreen() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.language === "ru" ? "ru" : "en";
  const content = legalContent[lang];

  return (
    <div className="screen">
      <button type="button" className="back-button" onClick={() => navigate(-1)}>
        ← {t("common.back")}
      </button>

      <h1>{content.title}</h1>
      <p className="terms-updated-at">{content.updatedAt}</p>

      {content.paragraphs.map((paragraph, i) => (
        <p className="terms-paragraph" key={i}>
          {paragraph}
        </p>
      ))}

      <p className="terms-disclaimer">{content.disclaimer}</p>
    </div>
  );
}
