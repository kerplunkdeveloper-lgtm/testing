import React, { useEffect } from "react";
import { FiUsers, FiBriefcase } from "react-icons/fi";

import { useDispatch, useSelector } from "react-redux";

import { motion } from "framer-motion";

import { getClients } from "../../../features/clients/clientslice";
import { getUsers } from "../../../features/users/userSlice";
import { getProjects } from "../../../features/projects/projectSlice";

const DashboardCards = () => {
  const dispatch = useDispatch();

  const { user } = useSelector((state) => state.auth);

  const { clients } = useSelector((state) => state.clients);

  const { users } = useSelector((state) => state.users);

  const { projects } = useSelector((state) => state.projects);

  useEffect(() => {
    dispatch(getClients());
    dispatch(getUsers());
    dispatch(getProjects());
  }, [dispatch]);

  // ============================================
  // CALCULATIONS
  // ============================================

  const activeClientsCount = clients ? clients.length : 0;
  const teamStrengthCount = users ? users.length : 0;

  const uniqueDepts = Array.from(
    new Set(
      (users || [])
        .map((u) => u.department)
        .filter((dept) => typeof dept === "string" && dept.trim() !== ""),
    ),
  )
    .filter((d) => {
      const lower = d.toLowerCase();
      return (
        !lower.includes("managing partner") &&
        !lower.includes("operation manager") &&
        !lower.includes("admin")
      );
    })
    .sort();

  const deptCards = uniqueDepts.map((dept, idx) => {
    const count = (users || []).filter((u) => u.department === dept).length;
    const gradients = [
      "from-blue-400 to-indigo-500",
      "from-violet-400 to-purple-500",
      "from-pink-400 to-rose-500",
      "from-cyan-400 to-blue-500",
    ];
    const gradient = gradients[idx % gradients.length];
    return {
      title: `No.of ${dept}`,
      value: count,
      icon: FiUsers,
      gradient: `bg-gradient-to-br ${gradient}`,
      border: "border-white/30",
      valueColor: "text-white",
      glowColor: "rgba(99, 102, 241, 0.4)",
      subtitleColor: "text-white/80",
      subtitle: `Total ${dept} members`,
    };
  });

  const isAdminOrOpManager =
    user?.role === "admin" || user?.role === "operationmanager";

  // ============================================
  // CARD DATA
  // ============================================

  const cards = [
    {
      title: isAdminOrOpManager
        ? "Total Overall No.of Active Clients"
        : "No.of Assigned Clients",
      value: activeClientsCount,
      icon: FiBriefcase,
      gradient: "bg-gradient-to-br from-amber-300 to-orange-400 ",
      border: "border-white/30 ",

      valueColor: "text-white",
      glowColor: "rgba(245, 158, 11, 0.4)",
      subtitleColor: "text-white/80 ",
      subtitle: "Total managed client accounts",
    },
    ...(isAdminOrOpManager ? deptCards : []),
    ...(isAdminOrOpManager
      ? [
          {
            title: "total team Strength",
            value: teamStrengthCount,
            icon: FiUsers,
            gradient: "bg-gradient-to-br from-emerald-300 to-teal-400",
            border: "border-white/30 ",

            valueColor: "text-white",
            glowColor: "rgba(16, 185, 129, 0.4)",
            subtitleColor: "text-white/80 ",
            subtitle: "Active registered team members",
          },
        ]
      : []),
  ];

  return (
    <div className="w-full">
      {/* GRID */}
      <div
        className={`grid gap-4 ${
          cards.length === 1
            ? "grid-cols-1"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        }`}
      >
        {cards.map((card, index) => {
          const Icon = card.icon;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: index * 0.1,
                ease: "easeOut",
              }}
              whileHover={{
                y: -3,
                scale: 1.01,
              }}
              className={`relative overflow-hidden rounded-full border shadow-md hover:shadow-lg transition-all duration-300 theme-bg-card ${card.gradient} ${card.border} h-[48px] flex items-center`}
            >
              <div className="px-6 flex items-center justify-between relative z-10 w-full">
                <p
                  className={`text-xs md:text-xs uppercase tracking-wider font-medium`}
                >
                  {card.title}
                </p>

                <div className="flex flex-col items-end">
                  <h2 className={`text-base md:text-sm font-bold`}>
                    {card.value}
                  </h2>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardCards;
