import React from "react";
import DashboardLayout from "../../components/layout/DashboardLayout.jsx";
import WelcomeUser from "./partnerhub/components/WelcomeUser.jsx";

const AdminDashboard = () => {



  return (
    <DashboardLayout role="admin">
      <WelcomeUser />
    </DashboardLayout>
  );  
};

export default AdminDashboard;