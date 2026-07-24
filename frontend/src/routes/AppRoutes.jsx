import React, { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import ScrollToTop from "../components/common/ScrollToTop";

// Synchronous core wrappers
import ProtectedRoute from "../components/common/ProtectedRoute.jsx";

// Helper to retry dynamic imports when chunks fail to load (e.g., after a new deployment)
const lazyWithRetry = (importFn) => {
  return React.lazy(async () => {
    try {
      const module = await importFn();
      window.sessionStorage.removeItem("lazy-retry-failed");
      return module;
    } catch (error) {
      // Check if we have already retried to prevent infinite reloads
      const hasRetried = window.sessionStorage.getItem("lazy-retry-failed");
      if (!hasRetried) {
        window.sessionStorage.setItem("lazy-retry-failed", "true");
        window.location.reload();
        return new Promise(() => {}); // Return a pending promise to avoid rendering broken state before reload
      }
      throw error;
    }
  });
};

// Lazy Loaded Pages & Layouts
const Login = lazyWithRetry(() => import("../pages/auth/Login.jsx"));
const DashboardLayout = lazyWithRetry(() => import("../components/layout/DashboardLayout.jsx"));
const Dashboardmain = lazyWithRetry(() => import("../pages/Dashboard/Dashboardmain.jsx"));
const Project = lazyWithRetry(() => import("../pages/projects/Project.jsx"));
const AdminUsers = lazyWithRetry(() => import("../pages/admin/AdminUsers.jsx"));
const PartnerHub = lazyWithRetry(() => import("../pages/admin/partnerhub/PartnerHub.jsx"));
const Profile = lazyWithRetry(() => import("../pages/profile/Profile.jsx"));
const Settings = lazyWithRetry(() => import("../pages/settings/Settings.jsx"));
const OperationHome = lazyWithRetry(() => import("../pages/OperationMananger/OperationHome.jsx"));
const OperationProjects = lazyWithRetry(() => import("../pages/OperationMananger/OperationProjects.jsx"));
const TeamHome = lazyWithRetry(() => import("../pages/team/TeamHome.jsx"));
const EodReports = lazyWithRetry(() => import("../pages/team/EodReports.jsx"));
const AdminEodReports = lazyWithRetry(() => import("../pages/admin/AdminEodReports.jsx"));
const Templatelib = lazyWithRetry(() => import("../pages/admin/templatelibrary/Templatelib.jsx"));
const Clients = lazyWithRetry(() => import("../pages/admin/clients/Clients.jsx"));
const CalendarPage = lazyWithRetry(() => import("../pages/calendar/CalendarPage.jsx"));
const Notifications = lazyWithRetry(() => import("../pages/notifications/Notifications.jsx"));
const Task = lazyWithRetry(() => import("../pages/tasks/Task.jsx"));
const ChatPage = lazyWithRetry(() => import("../pages/chat/ChatPage.jsx"));
const Portfolio = lazyWithRetry(() => import("../pages/admin/portfolio/Portfolio.jsx"));
const Workload = lazyWithRetry(() => import("../pages/workload/Workload.jsx"));

// Elegant, premium animated page loader
const PageLoader = () => (
  <div className="fixed inset-0 bg-slate-50 dark:bg-[#020710] flex flex-col items-center justify-center z-[9999]">
    <div className="relative w-12 h-12 flex items-center justify-center">
      <div className="absolute inset-0 rounded-full border-[3px] border-slate-200 dark:border-slate-800/80" />
      <div className="absolute inset-0 rounded-full border-[3px] border-indigo-500 dark:border-indigo-400 border-t-transparent animate-spin" />
    </div>
    <span className="mt-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-widest uppercase animate-pulse select-none">
      Loading...
    </span>
  </div>
);

const AppRoutes = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <ScrollToTop />
      <Routes>

      {/* LOGIN */}
      <Route
        path="/"
        element={<Login />}
      />

      {/* ADMIN ROUTES */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardLayout role="admin" />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={<Dashboardmain />}
        />

        <Route
          path="clients"
          element={<ProtectedRoute requiredPermission="manage_clients"><Clients /></ProtectedRoute>}
        />

        <Route
          path="portfolio"
          element={<ProtectedRoute requiredPermission="manage_settings"><Portfolio /></ProtectedRoute>}
        />

        <Route
          path="projects"
          element={<ProtectedRoute requiredPermission="manage_projects"><Project /></ProtectedRoute>} 
        />

        <Route
          path="tasks"
          element={<ProtectedRoute requiredPermission="manage_tasks"><Task /></ProtectedRoute>} 
        />

        <Route
          path="users"
          element={<ProtectedRoute requiredPermission="manage_users"><AdminUsers /></ProtectedRoute>}
        />

        <Route
          path="eod-reports"
          element={<ProtectedRoute requiredPermission="view_reports"><AdminEodReports /></ProtectedRoute>}
        />

        
        <Route
          path="profile"
          element={<Profile />}
        />

        <Route
          path="settings"
          element={<Settings />}
        />

   
        <Route
          path="template-library"
          element={<ProtectedRoute requiredPermission="manage_settings"><Templatelib /></ProtectedRoute>}
        />
        
        <Route
          path="calendar"
          element={<CalendarPage />}
        />

        <Route
          path="partnerhub"
          element={<ProtectedRoute requiredPermission="manage_settings"><PartnerHub /></ProtectedRoute>}
        />
        
        <Route
          path="notifications"
          element={<Notifications />}
        />
        
        <Route
          path="chat"
          element={<ChatPage />}
        />


        
      
        
      </Route>

      {/* OPERATION MANAGER ROUTES */}
      <Route
        path="/operationmanager"
        element={
          <ProtectedRoute
            allowedRoles={["operationmanager"]}
          >
            <DashboardLayout role="operationmanager" />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={<Dashboardmain/>}
        />

         <Route
          path="clients"
          element={<ProtectedRoute requiredPermission="manage_clients"><Clients /></ProtectedRoute>}
        />

           <Route
          path="portfolio"
          element={<ProtectedRoute requiredPermission="manage_settings"><Portfolio /></ProtectedRoute>}
        />

        <Route
          path="projects"
          element={<ProtectedRoute requiredPermission="manage_projects"><Project /></ProtectedRoute>} 
        />

        <Route
          path="tasks"
          element={<ProtectedRoute requiredPermission="manage_tasks"><Task /></ProtectedRoute>}   
        />

         <Route
          path="eod-reports"
          element={<ProtectedRoute requiredPermission="view_reports"><AdminEodReports /></ProtectedRoute>}
        />

        <Route
          path="profile"
          element={<Profile />}
        />

        <Route
          path="settings"
          element={<Settings />}
        />

        <Route
          path="calendar"
          element={<CalendarPage />}
        />

        <Route
          path="template-library"
          element={<ProtectedRoute requiredPermission="manage_settings"><Templatelib /></ProtectedRoute>}
        />



        <Route
          path="users"
          element={<ProtectedRoute requiredPermission="manage_users"><AdminUsers /></ProtectedRoute>}
        />

        <Route
          path="notifications"
          element={<Notifications />}
        />

        <Route
          path="chat"
          element={<ChatPage />}
        />






      </Route>



      {/* TEAM ROUTES */}
      <Route
        path="/team"
        element={
          <ProtectedRoute allowedRoles={["team"]}>
            <DashboardLayout role="team" />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={<Dashboardmain />}
        />

        <Route
          path="clients"
          element={<ProtectedRoute requiredPermission="manage_clients"><Clients /></ProtectedRoute>}
        />



             <Route
          path="portfolio"
          element={<ProtectedRoute requiredPermission="manage_settings"><Portfolio /></ProtectedRoute>}
        />

        <Route
          path="projects"
          element={<ProtectedRoute requiredPermission="manage_projects"><Project /></ProtectedRoute>} 
        />

        

        <Route
          path="tasks"
          element={<ProtectedRoute requiredPermission="manage_tasks"><Task /></ProtectedRoute>}   
        />

        <Route
          path="calendar"
          element={<CalendarPage />}
        />

        <Route
          path="eod-reports"
          element={<ProtectedRoute requiredPermission="view_reports"><EodReports /></ProtectedRoute>}
        />

        <Route
          path="users"
          element={<ProtectedRoute requiredPermission="manage_users"><AdminUsers /></ProtectedRoute>}
        />

        <Route
          path="profile"
          element={<Profile />}
        />

        <Route
          path="settings"
          element={<Settings />}
        />

        <Route
          path="notifications"
          element={<Notifications />}
        />

        <Route
          path="chat"
          element={<ChatPage />}
        />
      </Route>
     

      </Routes>
    </Suspense>
  );
};

export default AppRoutes;