import React from "react";
import AppRoutes from "./routes/AppRoutes";
import ThemeSettingsPanel from "./components/common/ThemeSettingsPanel";
import Preloader from "./components/common/Preloader";
import InReviewNotificationPopup from "./components/common/InReviewNotificationPopup";

const App = () => {
  return (
    <>
      <Preloader />
      <AppRoutes />
      <ThemeSettingsPanel />
      <InReviewNotificationPopup />
    </>
  );
};

export default App;