import {
  LuBuilding2,
  LuFolderKanban,
  LuLayoutTemplate,
  LuUsers,
  LuCalendarDays,
  LuHandshake,
  LuMessagesSquare,
  LuClipboardCheck,
  LuFolderOpen,
  LuActivity,
} from "react-icons/lu";
import { FiBarChart2, FiUser, FiHome, FiBell, FiSettings } from "react-icons/fi";

export const sidebarConfig = {
  admin: [
    { name: "Dashboard", path: "/admin", icon: FiHome },
    { name: "Clients Management", path: "/admin/clients", icon: LuBuilding2, permissionKey: "manage_clients" },
    { name: "Portfolio", path: "/admin/portfolio", icon: LuFolderOpen, permissionKey: "manage_portfolios" },
    { name: "Projects Overview", path: "/admin/projects", icon: LuFolderKanban, permissionKey: "manage_projects" },
    { name: "Tasks", path: "/admin/tasks", icon: LuClipboardCheck, permissionKey: "manage_tasks" },
    { name: "Template Library", path: "/admin/template-library", icon: LuLayoutTemplate, permissionKey: "manage_settings" },

    { name: "Users Management", path: "/admin/users", icon: LuUsers, permissionKey: "manage_users" },
    { name: "EOD Reports", path: "/admin/eod-reports", icon: FiBarChart2, permissionKey: "view_reports" },
    { name: "Calendar", path: "/admin/calendar", icon: LuCalendarDays },
    { name: "PartnerHub", path: "/admin/partnerhub", icon: LuHandshake, permissionKey: "manage_settings" },
    { name: "Profile", path: "/admin/profile", icon: FiUser },
    { name: "Chat", path: "/admin/chat", icon: LuMessagesSquare },
    
    { name: "Settings", path: "/admin/settings", icon: FiSettings },
  ],

  operationmanager: [
    { name: "Dashboard", path: "/operationmanager", icon: FiHome },
    { name: "Clients Management", path: "/operationmanager/clients", icon: LuBuilding2, permissionKey: "manage_clients" },
    { name: "Portfolio", path: "/operationmanager/portfolio", icon: LuFolderOpen, permissionKey: "manage_portfolios" },
    { name: "Projects Overview", path: "/operationmanager/projects", icon: LuFolderKanban, permissionKey: "manage_projects" },
    { name: "Tasks overview", path: "/operationmanager/tasks", icon: LuClipboardCheck, permissionKey: "manage_tasks" },
    { name: "Template Library", path: "/operationmanager/template-library", icon: LuLayoutTemplate, permissionKey: "manage_settings" },
    { name: "Calendar", path: "/operationmanager/calendar", icon: LuCalendarDays },
    { name: "Users Management", path: "/operationmanager/users", icon: LuUsers, permissionKey: "manage_users" },
    { name: "EOD Reports", path: "/operationmanager/eod-reports", icon: FiBarChart2, permissionKey: "view_reports" },
    { name: "Profile", path: "/operationmanager/profile", icon: FiUser },
    { name: "Chat", path: "/operationmanager/chat", icon: LuMessagesSquare },

    { name: "Settings", path: "/operationmanager/settings", icon: FiSettings },
  ],

  team: [
    { name: "Dashboard", path: "/team", icon: FiHome },
    { name: "Assigned Clients", path: "/team/clients", icon: LuBuilding2, permissionKey: "manage_clients" },
    { name: "Portfolio", path: "/team/portfolio", icon: LuFolderOpen, permissionKey: "manage_portfolios" },
    { name: "Projects Overview", path: "/team/projects", icon: LuFolderKanban, permissionKey: "manage_projects" },
    { name: "Tasks", path: "/team/tasks", icon: LuClipboardCheck, permissionKey: "manage_tasks" },
  
    { name: "Reports", path: "/team/eod-reports", icon: FiBarChart2, permissionKey: "view_reports" },
    { name: "Users", path: "/team/users", icon: LuUsers, permissionKey: "manage_users" },
    { name: "Profile", path: "/team/profile", icon: FiUser },
      { name: "Calendar", path: "/team/calendar", icon: LuCalendarDays },
    { name: "Chat", path: "/team/chat", icon: LuMessagesSquare },
    { name: "Settings", path: "/team/settings", icon: FiSettings },
  ],
};

