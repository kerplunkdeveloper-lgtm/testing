import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import {
  FiEdit2,
  FiTrash2,
  FiMail,
  FiMapPin,
  FiShield,
  FiUsers,
  FiSliders,
  FiCopy,
  FiCheck,
  FiUserMinus,
  FiUserCheck,
} from "react-icons/fi";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";

/* ─── Role badge configs ─────────────────────────────────────── */
const ROLE_STYLE = {
  admin: {
    badge:
      "bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-transparent",
    dot: "bg-rose-500 dark:bg-rose-400",
    text: "Admin",
  },
  operationmanager: {
    badge:
      "bg-violet-100 text-violet-700 border border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-transparent",
    dot: "bg-violet-500 dark:bg-violet-400",
    text: "Ops Manager",
  },
  team: {
    badge:
      "bg-cyan-100 text-cyan-700 border border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-transparent",
    dot: "bg-cyan-500 dark:bg-cyan-400",
    text: "Team Member",
  },
};

/* ─── Department badge colors ────────────────────────────────── */
const DEPT_KEYWORDS = [
  {
    key: "marketing",
    cls: "bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-transparent",
  },
  {
    key: "sales",
    cls: "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-transparent",
  },
  {
    key: "engineering",
    cls: "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-transparent",
  },
  {
    key: "design",
    cls: "bg-pink-100 text-pink-700 border border-pink-200 dark:bg-pink-500/15 dark:text-pink-300 dark:border-transparent",
  },
  {
    key: "graphic",
    cls: "bg-pink-100 text-pink-700 border border-pink-200 dark:bg-pink-500/15 dark:text-pink-300 dark:border-transparent",
  },
  {
    key: "video",
    cls: "bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-transparent",
  },
  {
    key: "editor",
    cls: "bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-transparent",
  },
  {
    key: "web",
    cls: "bg-cyan-100 text-cyan-700 border border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-transparent",
  },
  {
    key: "social",
    cls: "bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200 dark:bg-fuchsia-500/15 dark:text-fuchsia-300 dark:border-transparent",
  },
  {
    key: "seo",
    cls: "bg-lime-100 text-lime-700 border border-lime-200 dark:bg-lime-500/15 dark:text-lime-300 dark:border-transparent",
  },
  {
    key: "performance",
    cls: "bg-teal-100 text-teal-700 border border-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:border-transparent",
  },
  {
    key: "hr",
    cls: "bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-transparent",
  },
  {
    key: "finance",
    cls: "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-transparent",
  },
];

const getDeptStyle = (dept) => {
  if (!dept) return "";
  const n = dept.toLowerCase().trim();
  const match = DEPT_KEYWORDS.find(({ key }) => n.includes(key));
  return (
    match?.cls ||
    "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-600/20 dark:text-slate-300 dark:border-transparent"
  );
};

/* ─── Avatar gradient pool ───────────────────────────────────── */
const AVATAR_COLORS = [
  "from-violet-500 to-indigo-600",
  "from-cyan-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-600",
  "from-pink-500 to-rose-600",
];
const avatarGrad = (name) =>
  AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

/* ─── Tooltip wrapper ────────────────────────────────────────── */
const ActionBtn = ({ onClick, label, colorClass, children }) => (
  <div className="relative group/tip">
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick(e);
      }}
      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${colorClass}`}
    >
      {children}
    </button>
    <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-[10px] font-bold text-white bg-slate-900 dark:bg-slate-700 rounded-lg shadow-xl opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50">
      {label}
    </span>
  </div>
);

/* ═══════════════════════════════════════════════════════════════ */
const UserTable = ({
  users,
  loading,
  handleDeleteUser,
  handleRequestRelieve,
  handleRequestReactivate,
  setOpenModal,
  setEditUser,
  isReadOnly,
  setOpenPermissionsModal,
  setPermissionsUser,
}) => {
  const { user: currentUser } = useSelector((state) => state.auth);
  const [copiedId, setCopiedId] = useState(null);
  const [onlineUserIds, setOnlineUserIds] = useState([]);

  useEffect(() => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    const socketUrl = baseUrl
      ? baseUrl
      : typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:5001";

    const socket = io(socketUrl, {
      transports: ["polling", "websocket"],
      withCredentials: true,
    });

    const userId = currentUser?._id || currentUser?.id;
    if (userId) {
      socket.emit("join", userId);
    }

    socket.on("online_users_list", (usersList) => {
      setOnlineUserIds(usersList);
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUser]);

  const handleEdit = (u) => {
    setEditUser(u);
    setOpenModal(true);
  };
  const handlePermissions = (u) => {
    setPermissionsUser(u);
    setOpenPermissionsModal(true);
  };
  const handleCopy = (email, id) => {
    navigator.clipboard.writeText(email);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const userPerms = currentUser?.permissions?.["manage_users"];
  const canUpdate =
    currentUser?.role === "admin" ||
    userPerms === true ||
    userPerms?.update ||
    userPerms?.write;
  const canDelete =
    currentUser?.role === "admin" || userPerms === true || userPerms?.delete;
  const canRelieve =
    currentUser?.role === "admin" ||
    userPerms === true ||
    userPerms?.update ||
    userPerms?.write;
  const rolesPerms = currentUser?.permissions?.["manage_roles"];
  const canManageRoles =
    currentUser?.role === "admin" || rolesPerms === true || rolesPerms?.update;

  const colSpan = isReadOnly ? 6 : 7;

  return (
    /* ── Container ─────────────────────────────────────────────── */
    <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-0 bg-white dark:bg-[#111827] shadow-md dark:shadow-[0_8px_40px_rgba(0,0,0,0.6)] transition-colors duration-300">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px]">
          {/* ── HEADER ─────────────────────────────────────────── */}
          <thead>
            <tr className="bg-slate-50 dark:bg-[#0d1117] border-b border-slate-100 dark:border-white/5">
              {[
                "User",
                "Email Address",
                "Location",
                "Role",
                "Department",
                "Status",
                !isReadOnly && "Actions",
              ]
                .filter(Boolean)
                .map((h) => (
                  <th
                    key={h}
                    className="px-5 py-4 text-left text-[12px] font-bold text-slate-400 dark:text-slate-500"
                  >
                    {h}
                  </th>
                ))}
            </tr>
          </thead>

          {/* ── BODY ───────────────────────────────────────────── */}
          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
            {/* Loading */}
            {loading ? (
              <tr>
                <td colSpan={colSpan} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative w-10 h-10">
                      <div className="absolute inset-0 rounded-full border-2 border-slate-200 dark:border-slate-700" />
                      <div className="absolute inset-0 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                    </div>
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 animate-pulse">
                      Loading users…
                    </span>
                  </div>
                </td>
              </tr>
            ) : users?.length > 0 ? (
              users.map((user, idx) => {
                const roleCfg = ROLE_STYLE[user.role] || ROLE_STYLE.team;
                const isRelieved =
                  user.employmentStatus === "relieved" ||
                  user.accountStatus === "inactive";

                return (
                  <motion.tr
                    key={user._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 120,
                      damping: 16,
                      delay: idx * 0.04,
                    }}
                    className={`group transition-colors duration-200 ${
                      isRelieved
                        ? "bg-slate-50/40 dark:bg-slate-900/20 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 opacity-75"
                        : "hover:bg-slate-50/80 dark:hover:bg-white/[0.03]"
                    }`}
                  >
                    {/* ── USER ─────────────────────────────────── */}
                    <td className="px-2 py-0 align-middle">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <div
                            className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarGrad(user.name)} flex items-center justify-center text-white font-bold text-sm overflow-hidden shadow-md group-hover:scale-105 transition-transform duration-200 ${
                              isRelieved ? "grayscale" : ""
                            }`}
                          >
                            {user?.profile?.profileImage?.url ? (
                              <img
                                src={user.profile.profileImage.url}
                                alt={user.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              user?.name?.charAt(0)?.toUpperCase()
                            )}
                          </div>
                          {/* Online dot */}
                          {!isRelieved && (
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 transition-colors duration-300 ${onlineUserIds.includes(user._id) ? "bg-emerald-500" : "bg-slate-400"}`}
                            />
                          )}
                        </div>

                        {/* Name + ID */}
                        <div>
                          <p
                            className={`text-[13px] font-bold leading-tight ${isRelieved ? "text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-white"}`}
                          >
                            {user.name}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* ── EMAIL ────────────────────────────────── */}
                    <td className="px-5 py-3.5 align-middle">
                      <div className="flex items-center gap-2">
                        <FiMail
                          size={12}
                          className="text-slate-400 dark:text-slate-500 shrink-0"
                        />
                        <span className="text-[12.5px] font-medium text-slate-600 dark:text-slate-300 truncate max-w-[200px]">
                          {user.email}
                        </span>
                        {/* Copy button */}
                        <button
                          onClick={() => handleCopy(user.email, user._id)}
                          title="Copy email"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-150 cursor-pointer"
                        >
                          {copiedId === user._id ? (
                            <FiCheck size={11} className="text-emerald-500" />
                          ) : (
                            <FiCopy size={11} />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* ── LOCATION ─────────────────────────────── */}
                    <td className="px-5 py-3.5 align-middle">
                      {user.location ? (
                        <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-slate-600 dark:text-slate-300">
                          <FiMapPin
                            size={12}
                            className="text-indigo-500 dark:text-indigo-400 shrink-0"
                          />
                          <span className="truncate max-w-[150px]">
                            {user.location}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600 text-sm font-semibold">
                          —
                        </span>
                      )}
                    </td>

                    {/* ── ROLE ─────────────────────────────────── */}
                    <td className="px-5 py-3.5 align-middle">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10.5px] font-bold border ${roleCfg.badge}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${roleCfg.dot}`}
                        />
                        <FiShield size={10} />
                        {roleCfg.text}
                      </span>
                    </td>

                    {/* ── DEPARTMENT ───────────────────────────── */}
                    <td className="px-5 py-3.5 align-middle">
                      {user.department ? (
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10.5px] font-bold border ${getDeptStyle(user.department)}`}
                        >
                          <FiUsers size={10} />
                          {user.department}
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600 text-sm font-semibold">
                          —
                        </span>
                      )}
                    </td>

                    {/* ── STATUS ───────────────────────────────── */}
                    <td className="px-5 py-3.5 align-middle">
                      {isRelieved ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10.5px] font-black border bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800/90 dark:text-slate-300 dark:border-slate-700 shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-slate-400" />
                          Relieved
                        </span>
                      ) : onlineUserIds.includes(user._id) ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10.5px] font-black border bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-transparent">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10.5px] font-black border bg-red-500 text-white border-red-500 dark:bg-red-500 dark:text-white dark:border-slate-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 dark:bg-red-500 " />
                          Offline
                        </span>
                      )}
                    </td>

                    {/* ── ACTIONS ──────────────────────────────── */}
                    {!isReadOnly && (
                      <td className="px-5 py-3.5 align-middle">
                        <div className="flex items-center gap-2">
                          {!isRelieved ? (
                            <>
                              {canUpdate && (
                                <ActionBtn
                                  onClick={() => handleEdit(user)}
                                  label="Edit User"
                                  colorClass="bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:hover:bg-amber-500/35"
                                >
                                  <FiEdit2 size={13} />
                                </ActionBtn>
                              )}

                              {canManageRoles && (
                                <ActionBtn
                                  onClick={() => handlePermissions(user)}
                                  label="Permissions"
                                  colorClass="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/35"
                                >
                                  <FiSliders size={13} />
                                </ActionBtn>
                              )}

                              {canRelieve &&
                                user.role !== "admin" &&
                                (
                                  currentUser?._id || currentUser?.id
                                )?.toString() !==
                                  (user._id || user.id)?.toString() && (
                                  <ActionBtn
                                    onClick={() =>
                                      handleRequestRelieve &&
                                      handleRequestRelieve(user)
                                    }
                                    label="Relieve User"
                                    colorClass="bg-slate-200 text-slate-800  dark:bg-black dark:text-white "
                                  >
                                    <FiUserMinus size={13} />
                                  </ActionBtn>
                                )}
                            </>
                          ) : (
                            <>
                              {canRelieve && (
                                <ActionBtn
                                  onClick={() =>
                                    handleRequestReactivate &&
                                    handleRequestReactivate(user)
                                  }
                                  label="Reactivate User"
                                  colorClass="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/35"
                                >
                                  <FiUserCheck size={13} />
                                </ActionBtn>
                              )}
                            </>
                          )}

                          {canDelete && (
                            <ActionBtn
                              onClick={() => handleDeleteUser(user)}
                              label="Delete User"
                              colorClass="bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:hover:bg-rose-500/35"
                            >
                              <FiTrash2 size={13} />
                            </ActionBtn>
                          )}
                        </div>
                      </td>
                    )}
                  </motion.tr>
                );
              })
            ) : (
              /* Empty state */
              <tr>
                <td colSpan={colSpan} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3.5 max-w-xs mx-auto">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                      <FiUsers
                        size={22}
                        className="text-slate-400 dark:text-slate-500"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        No users found
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        Adjust your filters or add a new user.
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserTable;
