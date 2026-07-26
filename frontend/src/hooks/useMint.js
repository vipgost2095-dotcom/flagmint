import { useCallback, useRef, useState } from "react";
import { useTonConnectUI, useTonAddress } from "@tonconnect/ui-react";
import { api, ApiError } from "../lib/api";
import { signAndSendMintTransaction } from "../lib/tonconnect";
import { hapticError, hapticSuccess } from "../lib/telegram";

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 2 * 60 * 1000; // 2 минуты — дальше считаем, что что-то пошло не так

/**
 * Состояния: idle -> preparing -> awaiting-signature -> pending -> success | error
 */
export function useMint(flag) {
  const [tonConnectUI] = useTonConnectUI();
  const walletAddress = useTonAddress();

  const [state, setState] = useState("idle");
  const [errorMessage, setErrorMessage] = useState(null);
  const [priceBreakdown, setPriceBreakdown] = useState(null);
  const [result, setResult] = useState(null); // { getgemsUrl, txHash, ... }

  const pollTimerRef = useRef(null);
  const pollDeadlineRef = useRef(null);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    pollTimerRef.current = null;
  }, []);

  const pollStatus = useCallback(
    async (mintId) => {
      try {
        const mint = await api.getMintStatus({ mintId, walletAddress });

        if (mint.status === "success") {
          setState("success");
          setResult(mint);
          hapticSuccess();
          stopPolling();
          return;
        }

        if (mint.status === "error") {
          setState("error");
          setErrorMessage(mint.errorMessage ?? "errors.generic");
          hapticError();
          stopPolling();
          return;
        }

        if (Date.now() > pollDeadlineRef.current) {
          setState("error");
          setErrorMessage("errors.generic");
          stopPolling();
          return;
        }

        pollTimerRef.current = setTimeout(() => pollStatus(mintId), POLL_INTERVAL_MS);
      } catch (err) {
        setState("error");
        setErrorMessage("errors.network");
        stopPolling();
      }
    },
    [walletAddress, stopPolling]
  );

  const startMint = useCallback(async () => {
    if (!flag) return;

    if (!walletAddress) {
      // Кошелёк не подключён — открываем модалку подключения TonConnect
      await tonConnectUI.openModal();
      return;
    }

    setState("preparing");
    setErrorMessage(null);

    try {
      // Уникальный ключ на попытку минта — защищает от повторного списания
      // при двойном тапе или ретрае сети (см. backend/middleware/idempotency.js)
      const idempotencyKey = `${flag.id}:${walletAddress}:${crypto.randomUUID()}`;

      const prepared = await api.prepareMint({
        flagId: flag.id,
        walletAddress,
        idempotencyKey,
      });
      setPriceBreakdown(prepared.priceBreakdown);

      setState("awaiting-signature");
      await signAndSendMintTransaction(tonConnectUI, prepared.transaction);

      setState("pending");
      await api.markMintSubmitted({ mintId: prepared.mintId, walletAddress });

      pollDeadlineRef.current = Date.now() + POLL_TIMEOUT_MS;
      pollStatus(prepared.mintId);
    } catch (err) {
      hapticError();
      if (err?.message?.toLowerCase?.().includes("reject")) {
        setErrorMessage("errors.walletRejected");
      } else if (err instanceof ApiError) {
        setErrorMessage("errors.generic");
      } else {
        setErrorMessage("errors.network");
      }
      setState("error");
    }
  }, [flag, walletAddress, tonConnectUI, pollStatus]);

  const reset = useCallback(() => {
    stopPolling();
    setState("idle");
    setErrorMessage(null);
    setResult(null);
  }, [stopPolling]);

  return {
    state,
    errorMessage,
    priceBreakdown,
    result,
    walletAddress,
    startMint,
    reset,
  };
}
