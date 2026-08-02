import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import StatusBadge from "../components/StatusBadge";
import WalletMenu from "../components/WalletMenu";
import { api } from "../lib/api";
import { getTelegramUser, shareReferralLink, openExternalTelegramLink } from "../lib/telegram";
import { SUPPORT_CONTACT } from "../content/legal";

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME ?? "FlagMintBot";

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.language === "ru" ? "ru" : "en";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [referralCount, setReferralCount] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const telegramUser = getTelegramUser();
  const referralLink = telegramUser ? `https://t.me/${BOT_USERNAME}?start=ref_${telegramUser.id}` : null;

  useEffect(() => {
    api
      .getMyNfts()
      .then((data) => setItems(data.items))
      .catch((err) => setError(err))
      .finally(() => setLoading(false));

    api
      .getReferralStats()
      .then((data) => setReferralCount(data.referralCount))
      .catch(() => {
        // Счётчик рефералов не критичен для основного экрана — тихо игнорируем,
        // основная ошибка (если есть) уже показана по списку NFT выше.
      });
  }, []);

  const handleRemove = (mintId) => {
    if (!window.confirm(t("profile.removeConfirm"))) return;
    api
      .hideMint(mintId)
      .then(() => setItems((prev) => prev.filter((item) => item.id !== mintId)))
      .catch((err) => setError(err));
  };

  const handleShare = () => {
    if (!referralLink) return;
    shareReferralLink(referralLink, t("profile.inviteShareText"));
  };

  const handleCopyLink = () => {
    if (!referralLink) return;
    navigator.clipboard?.writeText(referralLink).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const handleOpenSupport = () => {
    const username = SUPPORT_CONTACT.replace(/^@/, "");
    openExternalTelegramLink(`https://t.me/${username}`);
  };

  return (
    <div className="screen">
      <h1>{t("profile.title")}</h1>

      <WalletMenu />

      {referralLink && (
        <div className="referral-block">
          <button type="button" className="referral-block__share-btn" onClick={handleShare}>
            {t("profile.inviteFriends")}
          </button>
          <div className="referral-block__row">
            <button type="button" className="referral-block__copy-link" onClick={handleCopyLink}>
              {linkCopied ? t("profile.linkCopied") : referralLink}
            </button>
          </div>
          {referralCount !== null && (
            <p className="referral-block__count">
              {t("profile.referralCount", { count: referralCount })}
            </p>
          )}
        </div>
      )}

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

      <div className="profile-footer-links">
        <button type="button" className="profile-footer-links__item" onClick={() => navigate("/terms")}>
          {t("profile.termsOfUse")}
        </button>
        <button type="button" className="profile-footer-links__item" onClick={handleOpenSupport}>
          {t("profile.support")}
        </button>
      </div>
    </div>
  );
}
