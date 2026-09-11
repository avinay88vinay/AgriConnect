import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import te from "./locales/te.json";
import hi from "./locales/hi.json";

const savedLanguage =
  localStorage.getItem("agriconnect_language") || "en";

const updateDocumentLanguage = (language) => {
  document.documentElement.lang = language;
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: en,
      },
      te: {
        translation: te,
      },
      hi: {
        translation: hi,
      },
    },

    lng: savedLanguage,

    fallbackLng: "en",

    interpolation: {
      escapeValue: false,
    },

    returnNull: false,
  });

/* Set initial language */
updateDocumentLanguage(savedLanguage);

/* Update HTML lang whenever language changes */
i18n.on("languageChanged", (language) => {
  updateDocumentLanguage(language);
});

export default i18n;