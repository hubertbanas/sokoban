import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import enTranslation from "./locales/en/translation.json";
import pseudoTranslation from "./locales/en-xa/translation.json";

void i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: {
                translation: enTranslation,
            },
            "en-xa": {
                translation: pseudoTranslation,
            },
        },
        fallbackLng: "en",
        supportedLngs: ["en", "en-xa"],
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
