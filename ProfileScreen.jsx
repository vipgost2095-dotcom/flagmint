import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import StatusBadge from "../components/StatusBadge";
import WalletMenu from "../components/WalletMenu";
import { api } from "../lib/api";

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "ru" ? "ru" : "en";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .getMyNfts()
      .then((data) => setItems(data.items))
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = (mintId) => {
    if (!window.confirm(t("profile.removeConfirm"))) return;
    api
      .hideMint(mintId)
      .then(() => setItems((prev) => prev.filter((item) => item.id !== mintId)))
      .catch((err) => setError(err));
  };

  return (
    <div className="screen">
      <h1>{t("profile.title")}</h1>

      <WalletMenu />

      {error && <p className="error-text">{t("errors.network")}</p>}

      {!loading && !error && items.length === 0 && (
        <p className="empty-state">{t("profile.empty")}</p>
      )}

      {items.map((item) => (
        <div className="nft-list-item" key={item.id}>
          <div className="nft-list-item__thumb">
            {item.flag && (
              <img src={item.flag.animation.fallbackGifUrl} alt={item.flag.name[lang]} loading="lazy" />
            )}
          </div>
          <div className="nft-list-item__body">
            <p className="nft-list-item__title">{item.flag?.name?.[lang] ?? item.flagId}</p>
            <StatusBadge status={item.status} />
            {item.status === "success" && item.getgemsUrl && (
              <div>
                <a className="nft-list-item__link" href={item.getgemsUrl} target="_blank" rel="noreferrer">
                  {t("profile.viewOnGetgems")}
                </a>
              </div>
            )}
            <button
              type="button"
              className="nft-list-item__remove"
              onClick={() => handleRemove(item.id)}
            >
              {t("profile.remove")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
