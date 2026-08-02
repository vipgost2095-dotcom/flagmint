/**
 * Текст "Условия использования" — короткая версия в духе того, как это
 * обычно оформляют другие Telegram Mini Apps (дополняет общие условия
 * Telegram для Mini Apps, а не дублирует их полностью).
 *
 * Хранится отдельно от src/i18n/locales — это юридический текст, а не UI-строки,
 * и его не стоит смешивать с обычными переводами интерфейса.
 *
 * ⚠️ Впишите свои данные перед публикацией: дату обновления и контакт поддержки
 * (сейчас та же переменная SUPPORT_CONTACT ниже используется и в этом тексте,
 * и в кнопке "Поддержка" на экране профиля).
 */

export const SUPPORT_CONTACT = "@bayrakov95";

export const legalContent = {
  ru: {
    title: "Условия использования",
    updatedAt: "Последнее обновление: [впишите дату]",
    paragraphs: [
      "FlagMint — это Telegram Mini App для создания (минта) NFT-изображений анимированных флагов стран и регионов в сети TON.",
      `FlagMint работает как независимый сервис-провайдер внутри платформы Telegram Mini Apps. Используя приложение, вы также соглашаетесь с условиями использования Mini Apps от Telegram (telegram.org/tos/mini-apps) и политикой конфиденциальности Telegram — они распространяются на все Mini Apps автоматически. Ниже — только то, что относится непосредственно к FlagMint.`,
      "Что делает FlagMint: приложение позволяет подключить TON-кошелёк (через TonConnect) и создать NFT-флаг за фиксированную плату в TON. NFT создаётся через официальный Getgems Minting API и поступает напрямую на ваш кошелёк.",
      "Оплата и минт: все платежи проходят напрямую в блокчейне TON через ваш кошелёк — FlagMint не хранит и не имеет доступа к вашим средствам или приватным ключам. Транзакции в блокчейне необратимы — проверяйте сумму и детали перед подтверждением в кошельке. Возврат средств за уже созданный NFT не производится — это техническая особенность блокчейна, а не решение FlagMint. Если оплата прошла, а NFT не создался из-за технического сбоя — напишите в поддержку, разберёмся.",
      "Что вы получаете: купленный NFT принадлежит вам как токен в блокчейне TON. Права на сам дизайн флага как графический объект отдельно не передаются, если не указано иное в описании коллекции на Getgems.",
      "Ответственность: FlagMint предоставляется «как есть». Мы не несём ответственности за курс TON, работу сети TON, сторонних кошельков или Getgems, а также за действия, совершённые вами по ошибке (неверный адрес, потеря доступа к кошельку и т.п.).",
      "Возраст: пользоваться FlagMint и распоряжаться криптовалютой могут только совершеннолетние пользователи, имеющие законное право владеть и управлять своим кошельком.",
      "Изменения: мы можем обновлять эти условия — актуальная версия всегда доступна в приложении. Продолжая пользоваться FlagMint, вы соглашаетесь с текущей версией.",
    ],
    disclaimer:
      "Это упрощённый документ в духе того, как оформляют условия другие Telegram Mini Apps — он дополняет официальные условия Telegram, а не заменяет их, и не является юридической консультацией.",
  },
  en: {
    title: "Terms of Use",
    updatedAt: "Last updated: [fill in date]",
    paragraphs: [
      "FlagMint is a Telegram Mini App for creating (minting) animated NFT flags of countries and regions on the TON blockchain.",
      "FlagMint operates as an independent service provider within the Telegram Mini Apps platform. By using the app, you also agree to Telegram's Terms of Service for Mini Apps (telegram.org/tos/mini-apps) and Telegram's Privacy Policy, which apply to all Mini Apps automatically. Below are only the terms specific to FlagMint.",
      "What FlagMint does: the app lets you connect a TON wallet (via TonConnect) and create an NFT flag for a fixed price in TON. The NFT is created via the official Getgems Minting API and sent directly to your wallet.",
      "Payment and minting: all payments happen directly on the TON blockchain through your wallet — FlagMint never stores or has access to your funds or private keys. Blockchain transactions are irreversible — double-check the amount and details before confirming in your wallet. Refunds are not issued for an NFT that has already been minted — this is a technical property of the blockchain, not a FlagMint policy. If payment went through but the NFT wasn't created due to a technical failure, contact support and we'll sort it out.",
      "What you get: the purchased NFT belongs to you as a token on the TON blockchain. Rights to the flag artwork itself are not separately transferred unless stated otherwise in the collection description on Getgems.",
      "Liability: FlagMint is provided \"as is\". We are not responsible for TON's exchange rate, the TON network's operation, third-party wallets or Getgems, or for actions you take by mistake (wrong address, lost wallet access, etc.).",
      "Age: only users of legal age who have the legal right to own and control their own wallet may use FlagMint and transact in cryptocurrency.",
      "Changes: we may update these terms — the current version is always available in the app. Continuing to use FlagMint means you agree to the current version.",
    ],
    disclaimer:
      "This is a simplified document in the style typically used by other Telegram Mini Apps — it complements Telegram's official terms rather than replacing them, and is not legal advice.",
  },
};
