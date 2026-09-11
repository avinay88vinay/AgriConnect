import { useNavigate } from "react-router-dom";
import {
  Leaf,
  ShoppingBasket,
  Truck,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import "./RoleSelection.css";

function RoleSelection() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const roles = [
    {
      title: t("roleSelection.farmer"),
      description: t("roleSelection.farmerDescription"),
      icon: Leaf,
      path: "/farmer-type",
    },
    {
      title: t("roleSelection.customer"),
      description: t("roleSelection.customerDescription"),
      icon: ShoppingBasket,
      path: "/login/consumer",
    },
    {
      title: t("roleSelection.delivery"),
      description: t("roleSelection.deliveryDescription"),
      icon: Truck,
      path: "/login/delivery",
    },
  ];

  return (
    <div className="role-page">

      {/* Background */}
      <div className="role-background-glow role-glow-one"></div>
      <div className="role-background-glow role-glow-two"></div>

      <main className="role-container">

        {/* Back to Language */}
        <button
          type="button"
          className="language-back-arrow"
          onClick={() => navigate("/language")}
          aria-label="Back to language selection"
        >
          <ArrowLeft
            size={19}
            strokeWidth={1.8}
          />
        </button>

        {/* Header */}
        <div className="role-header">

          <div className="role-logo">
            <Leaf
              size={25}
              strokeWidth={1.8}
            />
          </div>

          <h1>
            {t("roleSelection.welcome")}{" "}
            <span>
              {t("roleSelection.brand")}
            </span>
          </h1>

          <p>
            {t("roleSelection.chooseRole")}
          </p>

        </div>

        {/* Role Cards */}
        <div className="role-cards">

          {roles.map((role) => {
            const Icon = role.icon;

            return (
              <button
                key={role.title}
                type="button"
                className="role-card"
                onClick={() => navigate(role.path)}
              >

                <div className="role-icon">
                  <Icon
                    size={30}
                    strokeWidth={1.7}
                  />
                </div>

                <div className="role-info">

                  <h2>
                    {role.title}
                  </h2>

                  <p>
                    {role.description}
                  </p>

                </div>

                <div className="role-arrow">
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
        <p className="role-footer">
          {t("roleSelection.footer")}
        </p>

      </main>
    </div>
  );
}

export default RoleSelection;