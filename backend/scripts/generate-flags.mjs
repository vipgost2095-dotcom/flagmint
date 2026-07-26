/**
 * generate-flags.mjs
 * -------------------
 * Генерирует полный каталог flags.json для всех стран (и добавляет
 * несколько отдельных регионов вручную) на основе списка кодов ISO 3166-1
 * alpha-2. Названия на русском/английском берутся из встроенного в Node.js
 * модуля Intl.DisplayNames — интернет не нужен.
 *
 * ВАЖНО: список кодов ниже основан на общепринятом перечне ISO 3166-1
 * (страны — члены и наблюдатели ООН). Перед продакшен-запуском сверьте
 * его с актуальным официальным реестром ISO 3166-1, т.к. список стран
 * периодически меняется (появляются/переименовываются государства).
 *
 * Запуск: node scripts/generate-flags.mjs
 * Результат: src/data/flags.json
 */

import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ISO 3166-1 alpha-2 коды стран (общепринятый список ~195 государств).
// Сверьте и дополните при необходимости.
const COUNTRY_CODES = [
  "AF","AL","DZ","AD","AO","AG","AR","AM","AU","AT","AZ","BS","BH","BD","BB","BY","BE","BZ","BJ","BT",
  "BO","BA","BW","BR","BN","BG","BF","BI","CV","KH","CM","CA","CF","TD","CL","CN","CO","KM","CG","CD",
  "CR","CI","HR","CU","CY","CZ","DK","DJ","DM","DO","EC","EG","SV","GQ","ER","EE","SZ","ET","FJ","FI",
  "FR","GA","GM","GE","DE","GH","GR","GD","GT","GN","GW","GY","HT","HN","HU","IS","IN","ID","IR","IQ",
  "IE","IL","IT","JM","JP","JO","KZ","KE","KI","KP","KR","KW","KG","LA","LV","LB","LS","LR","LY","LI",
  "LT","LU","MG","MW","MY","MV","ML","MT","MH","MR","MU","MX","FM","MD","MC","MN","ME","MA","MZ","MM",
  "NA","NR","NP","NL","NZ","NI","NE","NG","MK","NO","OM","PK","PW","PA","PG","PY","PE","PH","PL","PT",
  "QA","RO","RU","RW","KN","LC","VC","WS","SM","ST","SA","SN","RS","SC","SL","SG","SK","SI","SB","SO",
  "ZA","SS","ES","LK","SD","SR","SE","CH","SY","TJ","TZ","TH","TL","TG","TO","TT","TN","TR","TM","TV",
  "UG","UA","AE","GB","US","UY","UZ","VU","VA","VE","VN","YE","ZM","ZW"
];

// Отдельные "регионы" (не входят в ISO как суверенные государства,
// но представляют интерес для коллекции: спецрегионы, союзы и т.п.)
const REGIONS = [
  { code: "EU", nameRu: "Европейский союз", nameEn: "European Union", region: "Europe" },
  { code: "HK", nameRu: "Гонконг", nameEn: "Hong Kong", region: "Asia" },
  { code: "MO", nameRu: "Макао", nameEn: "Macau", region: "Asia" },
  { code: "SCT", nameRu: "Шотландия", nameEn: "Scotland", region: "Europe" },
  { code: "WLS", nameRu: "Уэльс", nameEn: "Wales", region: "Europe" },
  { code: "CAT", nameRu: "Каталония", nameEn: "Catalonia", region: "Europe" },
  { code: "UN", nameRu: "Организация Объединённых Наций", nameEn: "United Nations", region: "World" },
];

const regionNamesEn = new Intl.DisplayNames(["en"], { type: "region" });
const regionNamesRu = new Intl.DisplayNames(["ru"], { type: "region" });

// Приблизительная привязка кода страны к континенту/региону для фильтра.
// При желании замените на более точный справочник (например, из
// официальной таблицы UN M49).
function guessContinent(code) {
  const continents = {
    Africa: ["DZ","AO","BJ","BW","BF","BI","CV","CM","CF","TD","KM","CG","CD","CI","DJ","EG","GQ","ER","SZ","ET","GA","GM","GH","GN","GW","KE","LS","LR","LY","MG","MW","ML","MR","MU","MA","MZ","NA","NE","NG","RW","ST","SN","SC","SL","SO","ZA","SS","SD","TZ","TG","TN","UG","ZM","ZW"],
    Asia: ["AF","AM","AZ","BH","BD","BT","BN","KH","CN","GE","IN","ID","IR","IQ","IL","JP","JO","KZ","KP","KR","KW","KG","LA","LB","MY","MV","MN","MM","NP","OM","PK","PH","QA","SA","SG","LK","SY","TJ","TH","TL","TR","TM","AE","UZ","VN","YE","HK","MO"],
    Europe: ["AL","AD","AT","BY","BE","BA","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IS","IE","IT","LV","LI","LT","LU","MT","MD","MC","ME","NL","MK","NO","PL","PT","RO","RU","SM","RS","SK","SI","ES","SE","CH","UA","GB","VA","EU","SCT","WLS","CAT"],
    "North America": ["AG","BS","BB","BZ","CA","CR","CU","DM","DO","SV","GD","GT","HT","HN","JM","MX","NI","PA","KN","LC","VC","TT","US"],
    "South America": ["AR","BO","BR","CL","CO","EC","GY","PY","PE","SR","UY","VE"],
    Oceania: ["AU","FJ","KI","MH","FM","NR","NZ","PW","PG","WS","SB","TO","TV","VU"],
  };
  for (const [continent, codes] of Object.entries(continents)) {
    if (codes.includes(code)) return continent;
  }
  return "World";
}

function buildAnimationUrls(code) {
  const lower = code.toLowerCase();
  return {
    type: "lottie",
    // Замените на реальные пути после заливки анимаций на CDN/IPFS
    previewUrl: `https://cdn.example.com/flags/${lower}/preview.json`,
    fallbackGifUrl: `https://cdn.example.com/flags/${lower}/preview.gif`,
  };
}

const catalog = [];

for (const code of COUNTRY_CODES) {
  const nameEn = regionNamesEn.of(code) ?? code;
  const nameRu = regionNamesRu.of(code) ?? code;
  catalog.push({
    id: `country-${code.toLowerCase()}`,
    code,
    type: "country",
    name: { ru: nameRu, en: nameEn },
    description: {
      ru: `Флаг страны «${nameRu}» с зацикленной анимацией развевания на ветру.`,
      en: `Flag of ${nameEn} with a looping waving-in-the-wind animation.`,
    },
    animation: buildAnimationUrls(code),
    attributes: {
      country: nameEn,
      region: guessContinent(code),
      animation_type: "wave-loop",
      edition: 1000,
    },
    priceTon: 1.5,
  });
}

for (const r of REGIONS) {
  catalog.push({
    id: `region-${r.code.toLowerCase()}`,
    code: r.code,
    type: "region",
    name: { ru: r.nameRu, en: r.nameEn },
    description: {
      ru: `Флаг региона «${r.nameRu}» с зацикленной анимацией развевания.`,
      en: `Flag of ${r.nameEn} with a looping waving animation.`,
    },
    animation: buildAnimationUrls(r.code),
    attributes: {
      country: null,
      region: r.region,
      animation_type: "wave-loop",
      edition: 500,
    },
    priceTon: 2,
  });
}

const outPath = path.join(__dirname, "..", "src", "data", "flags.json");
writeFileSync(outPath, JSON.stringify(catalog, null, 2), "utf-8");
console.log(`Сгенерировано ${catalog.length} флагов → ${outPath}`);
