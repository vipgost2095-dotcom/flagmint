import { useEffect, useState } from "react";
import { api } from "../lib/api";

/**
 * Загружает каталог флагов с backend, автоматически перезапрашивая при
 * изменении поиска/фильтра (с небольшим дебаунсом, чтобы не долбить API
 * на каждое нажатие клавиши).
 */
export function useFlags({ search, type }) {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const timeoutId = setTimeout(async () => {
      try {
        const data = await api.getFlags({ search, type: type === "all" ? undefined : type });
        if (!cancelled) setFlags(data.items);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [search, type]);

  return { flags, loading, error };
}
