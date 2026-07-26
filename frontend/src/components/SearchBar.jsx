import { useTranslation } from "react-i18next";

export default function SearchBar({ value, onChange }) {
  const { t } = useTranslation();
  return (
    <input
      className="search-input"
      type="search"
      inputMode="search"
      placeholder={t("catalog.searchPlaceholder")}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
