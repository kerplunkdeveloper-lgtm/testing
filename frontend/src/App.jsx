import React from "react";
import AppRoutes from "./routes/AppRoutes";
import ThemeSettingsPanel from "./components/common/ThemeSettingsPanel";
import Preloader from "./components/common/Preloader";
import OfficeHoursPausedPopup from "./components/common/OfficeHoursPausedPopup";
import ResumePausedTasksPopup from "./components/common/ResumePausedTasksPopup";

const App = () => {
  return (
    <>
      <Preloader />
      <AppRoutes />
      <ThemeSettingsPanel />
      <OfficeHoursPausedPopup />
      <ResumePausedTasksPopup />
    </>
  );
};

export default App;