import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import enTranslation from "./locales/en/translation.json";
import esTranslation from "./locales/es/translation.json";
import frTranslation from "./locales/fr/translation.json";
import plTranslation from "./locales/pl/translation.json";
import ptBrTranslation from "./locales/pt-BR/translation.json";
import deTranslation from "./locales/de/translation.json";
import itTranslation from "./locales/it/translation.json";
import zhCnTranslation from "./locales/zh-CN/translation.json";
import jaTranslation from "./locales/ja/translation.json";
import koTranslation from "./locales/ko/translation.json";
import ruTranslation from "./locales/ru/translation.json";
import ukTranslation from "./locales/uk/translation.json";
import pseudoTranslation from "./locales/en-xa/translation.json";

void i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: {
                translation: enTranslation,
            },
            pl: {
                translation: plTranslation,
            },
            es: {
                translation: esTranslation,
            },
            fr: {
                translation: frTranslation,
            },
            "pt-BR": {
                translation: ptBrTranslation,
            },
            pt: {
                translation: ptBrTranslation,
            },
            de: {
                translation: deTranslation,
            },
            it: {
                translation: itTranslation,
            },
            "zh-CN": {
                translation: zhCnTranslation,
            },
            zh: {
                translation: zhCnTranslation,
            },
            ja: {
                translation: jaTranslation,
            },
            ko: {
                translation: koTranslation,
            },
            ru: {
                translation: ruTranslation,
            },
            uk: {
                translation: ukTranslation,
            },
            "en-xa": {
                translation: pseudoTranslation,
            },
        },
        fallbackLng: "en",
        supportedLngs: [
            "en",
            "pl",
            "es",
            "fr",
            "pt-BR",
            "pt",
            "de",
            "it",
            "zh-CN",
            "zh",
            "ja",
            "ko",
            "ru",
            "uk",
            "en-xa",
        ],
        nonExplicitSupportedLngs: true,
        defaultNS: "translation",
        interpolation: {
            escapeValue: false,
        },
        detection: {
            order: ["localStorage", "navigator", "htmlTag"],
            caches: ["localStorage"],
            lookupLocalStorage: "sokoban-language",
        },
        react: {
            useSuspense: false,
        },
        returnNull: false,
    });

export default i18n;
