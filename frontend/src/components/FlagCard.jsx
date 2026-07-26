import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AnimatedFlagPreview from "./AnimatedFlagPreview";
import { hapticSelection } from "../lib/telegram";

export default function FlagCard({ flag }) {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const lang = i18n.language === "ru" ? "ru" : "en";

  return (
    <div
      className="flag-card"
      onClick={() => {
        hapticSelection();
        navigate(`/flag/${flag.id}`);
      }}
    >
      <div className="flag-card__preview">
        <AnimatedFlagPreview animation={flag.animation} variant="poster" alt={flag.name[lang]} />
      </div>
      <div className="flag-card__body">
        <p className="flag-card__title">{flag.name[lang]}</p>
        <p className="flag-card__subtitle">{flag.attributes.region}</p>
      </div>
    </div>
  );
}
