import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Leaf, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import "./Splash.css";

function Splash({ nextPath = "/language" }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate(nextPath);
    }, 6000);

    return () => clearTimeout(timer);
  }, [navigate, nextPath]);

  return (
    <div className="splash-screen">

      {/* Background decorative elements */}
      <div className="splash-glow splash-glow-one"></div>
      <div className="splash-glow splash-glow-two"></div>

      <div className="farm-lines">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>

      {/* Main Content */}
      <main className="splash-content">

        {/* AgriConnect Logo */}
        <div className="logo-wrapper">

          <div className="logo-box">
            <Leaf
              size={38}
              strokeWidth={1.8}
            />
          </div>

          <div className="logo-status"></div>

        </div>

        {/* Brand Name */}
        <h1 className="brand-name">
          Agri<span>Connect</span>
        </h1>

        <div className="brand-line"></div>

        {/* Tagline */}
        <p className="tagline">
          {t("splash.tagline")}
        </p>

        <p className="description">
          {t("splash.description")}
        </p>

        {/* Connection Animation */}
        <div className="connection">

          <div className="connection-point"></div>

          <div className="connection-line">
            <div className="connection-moving-dot"></div>
          </div>

          <div className="connection-logo">
            <Leaf
              size={17}
              strokeWidth={1.8}
            />
          </div>

          <div className="connection-line">
            <div className="connection-moving-dot reverse"></div>
          </div>

          <div className="connection-point"></div>

        </div>

        {/* Loading */}
        <div className="loading-container">

          <p>
            {t("splash.loading")}
          </p>

          <div className="loading-track">
            <div className="loading-progress"></div>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="splash-footer">

        <span>{t("splash.fresh")}</span>

        <span className="separator">•</span>

        <span>{t("splash.local")}</span>

        <span className="separator">•</span>

        <span>{t("splash.trusted")}</span>

        <ArrowRight
          size={14}
          strokeWidth={1.5}
        />

      </footer>

    </div>
  );
}

export default Splash;