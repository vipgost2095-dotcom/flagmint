import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTonAddress } from "@tonconnect/ui-react";

import AnimatedFlagPreview from "../components/AnimatedFlagPreview";
import StatusBadge from "../components/StatusBadge";
import { api } from "../lib/api";
import { useMint } from "../hooks/useMint";

export default function ConfirmMintScreen() {
  const { flagId } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "ru" ? "ru" : "en";
  const walletAddress = useTonAddress();

  const [flag, setFlag] = useState(null);

  useEffect(() => {
    api.getFlag(flagId).then(setFlag).catch(() => setFlag(null));
  }, [flagId]);

  const { state, errorMessage, priceBreakdown, result, startMint, reset } = useMint(flag);

  if (!flag) return <div className="screen" />;

  const price = priceBreakdown?.priceTon ?? flag.priceTon;
  const fee = priceBreakdown?.networkFeeTon ?? "—";
  const total = priceBreakdown?.totalTon ?? "—";

  return (
    <div className="screen">
      <h1>{t("confirm.title")}</h1>

      <div className="card">
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: 12, overflow: "hidden", flexShrink: 0 }}>
            <AnimatedFlagPreview animation={flag.animation} variant="poster" alt={flag.name[lang]} />
          </div>
          <div>
            <strong>{flag.name[lang]}</strong>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="price-row">
            <span>{t("confirm.price")}</span>
            <span>{price} TON</span>
          </div>
          <div className="price-row">
            <span>{t("confirm.networkFee")}</span>
            <span>{fee} TON</span>
          </div>
          <div className="price-row price-row--total">
            <span>{t("confirm.total")}</span>
            <span>{total} TON</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <StatusSection
          state={state}
          errorMessage={errorMessage}
          result={result}
          walletAddress={walletAddress}
          t={t}
        />
      </div>

      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
        <MintActionButton
          state={state}
          walletConnected={!!walletAddress}
          onStart={startMint}
          onRetry={() => {
            reset();
            startMint();
          }}
          t={t}
        />

        {(state === "success" || state === "error") && (
          <button className="btn-secondary" onClick={() => navigate("/")}>
            {t("confirm.backToCatalog")}
          </button>
        )}

        {state === "pending" && (
          <button className="btn-secondary" onClick={() => navigate("/profile")}>
            {t("confirm.goToProfile")}
          </button>
        )}
      </div>
    </div>
  );
}

function StatusSection({ state, errorMessage, result, walletAddress, t }) {
  if (state === "idle" && !walletAddress) return null;

  if (state === "preparing" || state === "awaiting-signature") {
    return (
      <p>
        <StatusBadge status="pending" /> {t("confirm.signing")}
      </p>
    );
  }

  if (state === "pending") {
    return (
      <p>
        <StatusBadge status="pending" /> {t("confirm.pending")}
      </p>
    );
  }

  if (state === "success") {
    return (
      <div>
        <p>
          <StatusBadge status="success" /> {t("confirm.success")}
        </p>
        {result?.getgemsUrl && (
          <a className="btn-secondary" style={{ display: "block", textAlign: "center", textDecoration: "none" }} href={result.getgemsUrl} target="_blank" rel="noreferrer">
            {t("confirm.viewOnGetgems")}
          </a>
        )}
      </div>
    );
  }

  if (state === "error") {
    return (
      <p>
        <StatusBadge status="error" /> {t(errorMessage ?? "errors.generic")}
      </p>
    );
  }

  return null;
}

function MintActionButton({ state, walletConnected, onStart, onRetry, t }) {
  if (state === "success") return null;

  if (state === "error") {
    return (
      <button className="btn-primary" onClick={onRetry}>
        {t("confirm.tryAgain")}
      </button>
    );
  }

  const busy = state === "preparing" || state === "awaiting-signature" || state === "pending";

  return (
    <button className="btn-primary" onClick={onStart} disabled={busy}>
      {walletConnected ? t("confirm.confirmButton") : t("confirm.connectWalletButton")}
    </button>
  );
}
