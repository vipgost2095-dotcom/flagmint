import { useTranslation } from "react-i18next";

const ICONS = { pending: "⏳", success: "✅", error: "❌" };

export default function StatusBadge({ status }) {
  const { t } = useTranslation();
  return (
    <span className={`status-badge status-badge--${status}`}>
      {ICONS[status]} {t(`profile.status.${status}`)}
    </span>
  );
}
