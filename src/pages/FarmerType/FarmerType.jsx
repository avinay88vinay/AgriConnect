import { useNavigate } from "react-router-dom";
import {
  Leaf,
  Building2,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import "./FarmerType.css";

function FarmerType() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const farmerTypes = [
    {
      title: t("farmerType.individual"),
      description: t("farmerType.individualDescription"),
      icon: Leaf,
      path: "/login/farmer/individual",
    },
    {
      title: t("farmerType.fpo"),
      description: t("farmerType.fpoDescription"),
      icon: Building2,
      path: "/login/farmer/fpo",
    },
  ];

  return (
    <div className="farmer-type-page">

      <div className="farmer-type-glow farmer-type-glow-one"></div>

      <div className="farmer-type-glow farmer-type-glow-two"></div>

      <main className="farmer-type-container">

        {/* Back to Role Selection */}
        <button
          type="button"
          className="back-button"
          onClick={() => navigate("/roles")}
        >
          <ArrowLeft
            size={17}
            strokeWidth={1.8}
          />

          <span>
            {t("farmerType.back")}
          </span>
        </button>


        {/* Header */}
        <div className="farmer-type-header">

          <div className="farmer-type-logo">
            <Leaf
              size={27}
              strokeWidth={1.8}
            />
          </div>

          <p className="small-heading">
            {t("farmerType.farmer")}
          </p>

          <h1>
            {t("farmerType.title")}
          </h1>

          <p className="farmer-type-subtitle">
            {t("farmerType.subtitle")}
          </p>

        </div>


        {/* Farmer Type Cards */}
        <div className="farmer-type-cards">

          {farmerTypes.map((type) => {
            const Icon = type.icon;

            return (
              <button
                key={type.title}
                type="button"
                className="farmer-type-card"
                onClick={() => navigate(type.path)}
              >

                <div className="farmer-type-icon">
                  <Icon
                    size={31}
                    strokeWidth={1.7}
                  />
                </div>

                <div className="farmer-type-content">

                  <h2>
                    {type.title}
                  </h2>

                  <p>
                    {type.description}
                  </p>

                </div>

                <div className="farmer-type-arrow">
                  <ArrowRight
                    size={19}
                    strokeWidth={1.7}
                  />
                </div>

              </button>
            );
          })}

        </div>


        {/* Footer */}
        <p className="farmer-type-footer">
          {t("farmerType.footer")}
        </p>

      </main>
    </div>
  );
}

export default FarmerType;