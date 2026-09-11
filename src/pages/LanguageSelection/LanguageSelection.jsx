import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Leaf, ArrowRight, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import "./LanguageSelection.css";

function LanguageSelection() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [selectedLanguage, setSelectedLanguage] = useState(
    i18n.language || "en"
  );

  const languages = [
    {
      code: "en",
      name: t("language.english"),
      nativeName: "English",
      subtitle: "English",
    },
    {
      code: "te",
      name: t("language.telugu"),
      nativeName: "తెలుగు",
      subtitle: "Telugu",
    },
    {
      code: "hi",
      name: t("language.hindi"),
      nativeName: "हिन्दी",
      subtitle: "Hindi",
    },
  ];

  const handleLanguageChange = (code) => {
    setSelectedLanguage(code);
    i18n.changeLanguage(code);
  };

  const handleContinue = () => {
    localStorage.setItem(
      "agriconnect_language",
      selectedLanguage
    );

    navigate("/roles");
  };

  return (
    <div className="language-page">

      <div className="language-glow language-glow-one"></div>
      <div className="language-glow language-glow-two"></div>

      <main className="language-container">

        {/* Logo */}
        <div className="language-logo">
          <Leaf size={30} strokeWidth={1.8} />
        </div>

        {/* Header */}
        <div className="language-header">
          <h1>
            {t("language.title")}
          </h1>

          <p>
            {t("language.subtitle")}
          </p>
        </div>

        {/* Language List */}
        <div className="language-list">

          {languages.map((language) => (
            <button
              key={language.code}
              className={`language-card ${
                selectedLanguage === language.code
                  ? "language-card-selected"
                  : ""
              }`}
              onClick={() =>
                handleLanguageChange(language.code)
              }
            >

              <div className="language-name">

                <strong>
                  {language.nativeName}
                </strong>

                <span>
                  {language.name}
                </span>

              </div>

              <div className="language-check">

                {selectedLanguage === language.code && (
                  <Check
                    size={18}
                    strokeWidth={2}
                  />
                )}

              </div>

            </button>
          ))}

        </div>

        {/* Continue */}
        <button
          className="language-continue"
          onClick={handleContinue}
        >
          <span>
            {t("language.continue")}
          </span>

          <ArrowRight
            size={18}
            strokeWidth={1.8}
          />
        </button>

        {/* Footer */}
        <p className="language-footer">
          AgriConnect • From Farm to Your Home
        </p>

      </main>
    </div>
  );
}

export default LanguageSelection;