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
    { name: "Home", path: "/admin", icon: FiHome },
      { name: "Chat", path: "/admin/chat", icon: LuMessagesSquare },
    { name: "Clients", path: "/admin/clients", icon: LuBuilding2, permissionKey: "manage_clients" },
    { name: "Projects", path: "/admin/projects", icon: LuFolderKanban, permissionKey: "manage_projects" },
   { name: "Tasks", path: "/admin/tasks", icon: LuClipboardCheck, permissionKey: "manage_tasks" },
    { name: "Portfolio", path: "/admin/portfolio", icon: LuFolderOpen, permissionKey: "manage_portfolios" },
  
 
    { name: "Template", path: "/admin/template-library", icon: LuLayoutTemplate, permissionKey: "manage_settings" },

    { name: "Users", path: "/admin/users", icon: LuUsers, permissionKey: "manage_users" },
    { name: "Reports", path: "/admin/eod-reports", icon: FiBarChart2, permissionKey: "view_reports" },
    { name: "Calendar", path: "/admin/calendar", icon: LuCalendarDays },
    { name: "PartnerHub", path: "/admin/partnerhub", icon: LuHandshake, permissionKey: "manage_settings" },
    { name: "Profile", path: "/admin/profile", icon: FiUser },
  
    
    { name: "Settings", path: "/admin/settings", icon: FiSettings },
  ],

  operationmanager: [
    { name: "Home", path: "/operationmanager", icon: FiHome },
    { name: "Chat", path: "/operationmanager/chat", icon: LuMessagesSquare },
    { name: "Clients", path: "/operationmanager/clients", icon: LuBuilding2, permissionKey: "manage_clients" },
    { name: "Projects", path: "/operationmanager/projects", icon: LuFolderKanban, permissionKey: "manage_projects" },
    { name: "Tasks", path: "/operationmanager/tasks", icon: LuClipboardCheck, permissionKey: "manage_tasks" },
    { name: "Portfolio", path: "/operationmanager/portfolio", icon: LuFolderOpen, permissionKey: "manage_portfolios" },
    { name: "Template Library", path: "/operationmanager/template-library", icon: LuLayoutTemplate, permissionKey: "manage_settings" },
    { name: "Calendar", path: "/operationmanager/calendar", icon: LuCalendarDays },
    { name: "Users", path: "/operationmanager/users", icon: LuUsers, permissionKey: "manage_users" },
    { name: "Reports", path: "/operationmanager/eod-reports", icon: FiBarChart2, permissionKey: "view_reports" },
    { name: "Profile", path: "/operationmanager/profile", icon: FiUser },


    { name: "Settings", path: "/operationmanager/settings", icon: FiSettings },
  ],

  team: [
    { name: "Home", path: "/team", icon: FiHome },
    { name: "Chat", path: "/team/chat", icon: LuMessagesSquare },
    { name: "Clients", path: "/team/clients", icon: LuBuilding2, permissionKey: "manage_clients" },
    { name: "Projects", path: "/team/projects", icon: LuFolderKanban, permissionKey: "manage_projects" },
    { name: "Tasks", path: "/team/tasks", icon: LuClipboardCheck, permissionKey: "manage_tasks" },
    { name: "Portfolio", path: "/team/portfolio", icon: LuFolderOpen, permissionKey: "manage_portfolios" },
    { name: "My Reports", path: "/team/eod-reports", icon: FiBarChart2, permissionKey: "view_reports" },
    { name: "Users", path: "/team/users", icon: LuUsers, permissionKey: "manage_users" },
    { name: "Profile", path: "/team/profile", icon: FiUser },
      { name: "Calendar", path: "/team/calendar", icon: LuCalendarDays },
 
    { name: "Settings", path: "/team/settings", icon: FiSettings },
  ],
};

