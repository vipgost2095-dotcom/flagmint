/**
 * Тонкая обёртка над window.Telegram.WebApp, чтобы остальной код не был
 * жёстко завязан на глобальный объект и легче тестировался.
 */

function getWebApp() {
  return window?.Telegram?.WebApp ?? null;
}

export function initTelegramApp() {
  const webApp = getWebApp();
  if (!webApp) {
    console.warn("Telegram WebApp SDK недоступен — приложение запущено вне Telegram");
    return null;
  }

  webApp.ready();
  webApp.expand(); // сразу разворачиваем на полный экран
  applyTelegramThemeVars(webApp);

  webApp.onEvent("themeChanged", () => applyTelegramThemeVars(webApp));

  return webApp;
}

/**
 * Прокидывает цвета темы Telegram (light/dark) в CSS-переменные, которые
 * использует src/styles/theme.css — это и есть адаптация под тему клиента.
 */
export function applyTelegramThemeVars(webApp) {
  const p = webApp.themeParams ?? {};
  const root = document.documentElement.style;

  if (p.bg_color) root.setProperty("--tg-bg", p.bg_color);
  if (p.text_color) root.setProperty("--tg-text", p.text_color);
  if (p.hint_color) root.setProperty("--tg-hint", p.hint_color);
  if (p.link_color) root.setProperty("--tg-link", p.link_color);
  if (p.button_color) root.setProperty("--tg-button", p.button_color);
  if (p.button_text_color) root.setProperty("--tg-button-text", p.button_text_color);
  if (p.secondary_bg_color) root.setProperty("--tg-secondary-bg", p.secondary_bg_color);

  document.body.dataset.colorScheme = webApp.colorScheme; // 'light' | 'dark'
}

/** Сырая initData-строка — отправляется на backend для проверки подписи */
export function getInitDataRaw() {
  return getWebApp()?.initData ?? "";
}

/** Распарсенные данные пользователя (только для UI — не доверяем им без проверки на backend!) */
export function getTelegramUser() {
  return getWebApp()?.initDataUnsafe?.user ?? null;
}

export function getTelegramLanguageCode() {
  return getWebApp()?.initDataUnsafe?.user?.language_code ?? "en";
}

export function hapticSuccess() {
  getWebApp()?.HapticFeedback?.notificationOccurred("success");
}

export function hapticError() {
  getWebApp()?.HapticFeedback?.notificationOccurred("error");
}

export function hapticSelection() {
  getWebApp()?.HapticFeedback?.selectionChanged();
}

export function showMainButton({ text, onClick }) {
  const webApp = getWebApp();
  if (!webApp) return () => {};
  webApp.MainButton.setText(text);
  webApp.MainButton.show();
  webApp.MainButton.onClick(onClick);
  return () => {
    webApp.MainButton.offClick(onClick);
    webApp.MainButton.hide();
  };
}

export function closeApp() {
  getWebApp()?.close();
}

/**
 * Открывает нативный диалог "поделиться" в Telegram с готовым текстом и
 * реферальной ссылкой (пользователь выбирает, в какой чат переслать).
 * Вне Telegram (например, если открыли Mini App в обычном браузере для
 * теста) — просто открывает t.me/share в новой вкладке как запасной вариант.
 */
export function shareReferralLink(link, text) {
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
  openExternalTelegramLink(shareUrl);
}

/** Открывает произвольную t.me-ссылку (чат поддержки, канал и т.п.) нативно в Telegram. */
export function openExternalTelegramLink(url) {
  const webApp = getWebApp();
  if (webApp?.openTelegramLink) {
    webApp.openTelegramLink(url);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
