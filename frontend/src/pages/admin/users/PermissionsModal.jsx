import React, { useEffect, useState } from "react";
import { FiX, FiShield, FiCheck } from "react-icons/fi";

const PERMISSION_ACTIONS = [
  { id: "read", label: "Read" },
  { id: "write", label: "Write" },
  { id: "update", label: "Update" },
  { id: "delete", label: "Delete" },
];

const PERMISSION_MODULES = [
  {
    id: "manage_users",
    label: "Manage Users",
    desc: "Create, edit, and delete user accounts",
  },
  {
    id: "manage_roles",
    label: "Roles & Permissions",
    desc: "Assign module access and modify permissions",
  },
  {
    id: "manage_projects",
    label: "Manage Projects",
    desc: "Create and edit business projects",
  },
  {
    id: "manage_tasks",
    label: "Manage Tasks",
    desc: "Create, assign, and update tasks",
  },
  {
    id: "view_reports",
    label: "View Reports",
    desc: "Access EOD reports and analytics",
  },
  {
    id: "manage_clients",
    label: "Manage Clients",
    desc: "Add and edit client details",
  },
  {
    id: "manage_portfolios",
    label: "Manage Portfolios",
    desc: "Create and edit portfolios",
  },
  {
    id: "manage_settings",
    label: "System Settings",
    desc: "Configure global application settings",
  },
];

const PermissionsModal = ({ open, setOpen, user, handleUpdateUser }) => {
  const [permissions, setPermissions] = useState({});

  useEffect(() => {
    if (user?.permissions) {
      setPermissions(user.permissions);
    } else {
      setPermissions({});
    }
  }, [user]);

  if (!open || !user) return null;

  const handleToggle = (moduleId, action) => {
    if (user.role === "admin") return; // Admin has all access
    setPermissions((prev) => {
      const currentModulePerms = prev[moduleId] || {
        read: false,
        write: false,
        update: false,
        delete: false,
      };
      // If toggling off 'read', maybe we should toggle off all? Let's keep it simple for now
      return {
        ...prev,
        [moduleId]: {
          ...currentModulePerms,
          [action]: !currentModulePerms[action],
        },
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (user.role === "admin") {
      setOpen(false);
      return;
    }
    handleUpdateUser(permissions);
    setOpen(false);
  };

  const isAdmin = user.role === "admin";

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 ">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-[#3b82f6]/10 flex items-center justify-center">
              <FiShield
                size={16}
                className="text-indigo-600 dark:text-[#3b82f6]"
              />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white">
                Roles & Permissions
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium mt-0.5">
                Manage access for{" "}
                <span className="text-slate-700 dark:text-slate-300 font-bold">
                  {user.name}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all shadow-sm"
          >
            <FiX size={15} />
          </button>
        </div>

        {/* BODY */}
        <div className="px-6 py-5 overflow-y-auto custom-scrollbar flex-1">
          {/* User Role Badge */}
          <div className="mb-6 p-4 rounded-xl border border-indigo-100 dark:border-[#3b82f6]/20 bg-indigo-50/50 dark:bg-[#3b82f6]/10 flex items-start justify-between">
            <div>
              <h3 className="text-xs font-bold text-indigo-900 dark:text-[#3b82f6] mb-1">
                Current Role: {user.role.toUpperCase()}
              </h3>
              <p className="text-[11px] text-indigo-600/80 dark:text-[#3b82f6]/80 leading-relaxed max-w-md">
                {isAdmin
                  ? "Admin users have unrestricted access to all modules and settings. Individual permissions cannot be toggled."
                  : "Customize specific module access for this user. Toggled on means they have full access to that module."}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-[#3b82f6]/20 text-indigo-700 dark:text-[#3b82f6] text-[10px] font-bold uppercase tracking-wider">
              {user.role}
            </span>
          </div>

          {/* Permissions Matrix */}
          <div className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-800">
                    <th className="px-4 py-3 text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wider">
                      Module
                    </th>
                    {PERMISSION_ACTIONS.map((action) => (
                      <th
                        key={action.id}
                        className="px-4 py-3 text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wider text-center"
                      >
                        {action.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {PERMISSION_MODULES.map((module) => {
                    const modulePerms = permissions[module.id] || {};
                    return (
                      <tr
                        key={module.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <p className="text-xs font-extrabold text-slate-800 dark:text-white">
                            {module.label}
                          </p>
                          <p className="text-[10.5px] font-medium text-gray-500 dark:text-slate-300 mt-0.5">
                            {module.desc}
                          </p>
                        </td>
                        {PERMISSION_ACTIONS.map((action) => {
                          // Handle legacy boolean true mapping to all permissions
                          const isLegacyTrue = permissions[module.id] === true;
                          const isGranted =
                            isAdmin || isLegacyTrue || modulePerms[action.id];

                          return (
                            <td
                              key={action.id}
                              className="px-4 py-3 text-center align-middle"
                            >
                              <label
                                className={`relative flex items-center justify-center cursor-pointer ${isAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
                              >
                                <input
                                  type="checkbox"
                                  className="peer sr-only"
                                  checked={!!isGranted}
                                  onChange={() =>
                                    handleToggle(module.id, action.id)
                                  }
                                  disabled={isAdmin}
                                />
                                <div
                                  className={`
                                  w-5 h-5 rounded flex items-center justify-center border-2 transition-all
                                  ${isGranted ? "bg-indigo-500 dark:bg-[#3b82f6] border-indigo-500 dark:border-[#3b82f6]" : "bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 peer-hover:border-indigo-400 dark:peer-hover:border-[#3b82f6]"}
                                `}
                                >
                                  {isGranted && (
                                    <FiCheck
                                      size={14}
                                      className="text-white dark:text-slate-900"
                                      strokeWidth={4}
                                    />
                                  )}
                                </div>
                              </label>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-5 py-2.5 rounded-xl border bg-red-600  text-white border-gray-200  font-semibold text-xs  hover:shadow-sm transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isAdmin}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 dark:bg-[#3b82f6] hover:bg-indigo-700 dark:hover:bg-[#d4e600] text-white dark:text-black font-bold text-xs shadow-sm shadow-indigo-200 dark:shadow-none transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Permissions
          </button>
        </div>
      </div>
    </div>
  );
};

export default PermissionsModal;
