import React, { useEffect, useState } from "react";
import {
  FiTrendingUp,
  FiTrendingDown,
  FiDollarSign,
  FiActivity,
  FiBriefcase,
  FiPieChart,
} from "react-icons/fi";

const formatINR = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN")}`;

const ICONS = {
  revenue: {
    icon: FiDollarSign,
    color: "text-cyan-400 bg-white/10",
  },

  cost: {
    icon: FiBriefcase,
    color: "text-violet-400 bg-white/10",
  },

  profit: {
    icon: FiActivity,
    color: "text-emerald-400 bg-white/10",
  },

  overhead: {
    icon: FiPieChart,
    color: "text-amber-400 bg-white/10",
  },
};

const StatCard = ({
  label,
  value,
  sub,
  subType = "neutral",
  bg,
  glow,
  iconKey,
}) => {
  const IconComponent =
    ICONS[iconKey]?.icon ||
    FiDollarSign;

  return (
    <div
      className={`
        relative overflow-hidden
        ${bg}
        rounded-2xl
        p-4
        flex-1
        min-w-[240px]
        hover:shadow-xl
        hover:-translate-y-1
        transition-all duration-300
        group
        shadow-sm
        border border-white/10
      `}
    >
      {/* Glow */}
      <div
        className={`absolute -inset-10 bg-gradient-to-r ${glow} opacity-0 group-hover:opacity-20 blur-2xl transition-all duration-500`}
      />

      {/* Light streak */}
      <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />

      <div className="flex items-start justify-between mb-3 relative z-10">
        <p className="text-white text-[10px] font-black uppercase tracking-wider">
          {label}
        </p>

        <div
          className={`w-7 h-7 rounded-xl flex items-center justify-center ${ICONS[iconKey]?.color} backdrop-blur-md`}
        >
          <IconComponent
            size={14}
            className="text-white"
          />
        </div>
      </div>

      <h2 className="text-3xl text-white  font-semibold  leading-none mb-2 relative z-10  drop-shadow-sm">
        {formatINR(value)}
      </h2>

      {sub && (
        <div className="flex items-center gap-1 mt-1 relative z-10 bg-white border border-white/5 rounded-lg py-1 px-2.5 self-start w-fit backdrop-blur-sm">

          {subType === "up" && (
            <FiTrendingUp
              size={12}
              className="text-emerald-300"
            />
          )}

          {subType === "down" && (
            <FiTrendingDown
              size={12}
              className="text-rose-300"
            />
          )}

          <span
            className={`text-[10px] font-bold ${
              subType === "up"
                ? "text-emerald-300"
                : subType === "down"
                ? "text-rose-300"
                : "text-blue-400"
            }`}
          >
            {sub}
          </span>

        </div>
      )}
    </div>
  );
};

const RevenueStatCards = ({
  data,
}) => {

  // =========================
  // LIVE STATE
  // =========================
  const [liveData, setLiveData] =
    useState(data);

  // =========================
  // AUTO UPDATE
  // =========================
  useEffect(() => {

    setLiveData(data);

  }, [data]);

  // =========================
  // CARDS
  // =========================
  const cards = [
    {
      label: "Total Revenue",
      value:
        liveData?.totalRevenue || 0,

      sub: "+12% vs last month",

      subType: "up",

      bg: "bg-gradient-to-br from-green-800 via-green-500 to-green-800",

      glow:
        "from-green-400 to-green-400",

      iconKey: "revenue",
    },

    {
      label: "Total Cost to Company",

      value:
        liveData?.totalCost || 0,

      sub: "Salaries + Overhead",

      subType: "neutral",

      bg: "bg-gradient-to-br from-blue-800 via-violet-500 to-blue-800",

      glow:
        "from-blue-400 to-blue-400",

      iconKey: "cost",
    },

    {
      label: "Net Profit",

      value:
        liveData?.netProfit || 0,

      sub: `Margin ${
        liveData?.marginPercent || 0
      }%`,

      subType:
        liveData?.netProfit >= 0
          ? "up"
          : "down",

      bg: "bg-gradient-to-br from-red-800 via-pink-500 to-red-800",

      glow:
        "from-red-400 to-red-400",

      iconKey: "profit",
    },

    {
      label: "Overhead Expenses",

      value:
        liveData?.overhead || 0,

      sub: "Office, Tools, Misc",

      subType: "neutral",

      bg: "bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-400",

      glow:
        "from-yellow-400 to-yellow-400",

      iconKey: "overhead",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">

      {cards.map((card, i) => (
        <StatCard
          key={i}
          {...card}
        />
      ))}

    </div>
  );
};

export default RevenueStatCards;