import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import AnimatedFlagPreview from "../components/AnimatedFlagPreview";
import { api } from "../lib/api";
import { hapticSelection } from "../lib/telegram";

export default function FlagDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "ru" ? "ru" : "en";

  const [flag, setFlag] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getFlag(id)
      .then((data) => !cancelled && setFlag(data))
      .catch((err) => !cancelled && setError(err));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <div className="screen">
        <p className="error-text">{t("errors.generic")}</p>
      </div>
    );
  }

  if (!flag) {
    return <div className="screen" />; // можно заменить на скелетон-лоадер
  }

  return (
    <div className="screen">
      <div className="detail-preview">
        <AnimatedFlagPreview animation={flag.animation} variant="animated" alt={flag.name[lang]} />
      </div>

      <h1>{flag.name[lang]}</h1>
      <p style={{ color: "var(--tg-hint)" }}>{flag.description[lang]}</p>

      <div className="attributes-list">
        <AttributeRow label={t("detail.attributes.country")} value={flag.attributes.country ?? "—"} />
        <AttributeRow label={t("detail.attributes.region")} value={flag.attributes.region} />
        <AttributeRow
          label={t("detail.attributes.animation_type")}
          value={flag.attributes.animation_type}
        />
        <AttributeRow
          label={t("detail.attributes.edition")}
          value={t("catalog.edition", { count: flag.attributes.edition })}
        />
      </div>

      <button
        className="btn-primary"
        onClick={() => {
          hapticSelection();
          navigate(`/mint/${flag.id}`);
        }}
      >
        {t("detail.mintButton", { price: flag.priceTon })}
      </button>
    </div>
  );
}

function AttributeRow({ label, value }) {
  return (
    <div className="attribute-row">
      <span className="attribute-row__label">{label}</span>
      <span>{value}</span>
    </div>
  );
}
