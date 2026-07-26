import { useTranslation } from "react-i18next";
import { hapticSelection } from "../lib/telegram";

const OPTIONS = [
  { value: "all", labelKey: "catalog.filterAll" },
  { value: "country", labelKey: "catalog.filterCountries" },
  { value: "region", labelKey: "catalog.filterRegions" },
];

export default function FilterTabs({ value, onChange }) {
  const { t } = useTranslation();
  return (
    <div className="filter-tabs">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          className={`filter-tab ${value === opt.value ? "active" : ""}`}
          onClick={() => {
            hapticSelection();
            onChange(opt.value);
          }}
        >
          {t(opt.labelKey)}
        </button>
      ))}
    </div>
  );
}
