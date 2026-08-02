import { Routes, Route, useLocation } from "react-router-dom";

import CatalogScreen from "./screens/CatalogScreen";
import FlagDetailScreen from "./screens/FlagDetailScreen";
import ConfirmMintScreen from "./screens/ConfirmMintScreen";
import ProfileScreen from "./screens/ProfileScreen";
import TermsScreen from "./screens/TermsScreen";
import BottomNav from "./components/BottomNav";

export default function App() {
  const location = useLocation();
  // На экране подтверждения нижнюю навигацию скрываем — пользователь должен
  // сфокусироваться на одном действии (подписать транзакцию), не отвлекаясь
  const hideNav = location.pathname.startsWith("/mint/");

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<CatalogScreen />} />
        <Route path="/flag/:id" element={<FlagDetailScreen />} />
        <Route path="/mint/:flagId" element={<ConfirmMintScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="/terms" element={<TermsScreen />} />
      </Routes>
      {!hideNav && <BottomNav />}
    </div>
  );
}
