import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { hapticSelection } from "../lib/telegram";

export default function BottomNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    { path: "/", icon: "🎌", labelKey: "nav.catalog" },
    { path: "/profile", icon: "👤", labelKey: "nav.profile" },
  ];

  return (
    <nav className="bottom-nav">
      {items.map((item) => {
        const active = location.pathname === item.path;
        return (
          <button
            key={item.path}
            className={`bottom-nav__item ${active ? "active" : ""}`}
            onClick={() => {
              if (!active) {
                hapticSelection();
                navigate(item.path);
              }
            }}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span>{t(item.labelKey)}</span>
          </button>
        );
      })}
    </nav>
  );
}
