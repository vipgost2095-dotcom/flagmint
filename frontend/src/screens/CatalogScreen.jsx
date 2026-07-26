import { useState } from "react";
import { useTranslation } from "react-i18next";

import SearchBar from "../components/SearchBar";
import FilterTabs from "../components/FilterTabs";
import FlagCard from "../components/FlagCard";
import LangSwitch from "../components/LangSwitch";
import { useFlags } from "../hooks/useFlags";

export default function CatalogScreen() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");

  const { flags, loading, error } = useFlags({ search, type });

  return (
    <div className="screen">
      <LangSwitch />
      <h1>{t("catalog.title")}</h1>

      <SearchBar value={search} onChange={setSearch} />
      <FilterTabs value={type} onChange={setType} />

      {error && <p className="error-text">{t("errors.network")}</p>}

      {!loading && !error && flags.length === 0 && (
        <p className="empty-state">{t("catalog.empty")}</p>
      )}

      <div className="flag-grid">
        {flags.map((flag) => (
          <FlagCard key={flag.id} flag={flag} />
        ))}
      </div>
    </div>
  );
}
