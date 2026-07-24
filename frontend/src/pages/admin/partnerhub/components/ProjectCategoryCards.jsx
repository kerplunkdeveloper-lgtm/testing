import React from "react";

const formatINR = (amount) => `₹${amount.toLocaleString("en-IN")}`;

const getGradientConfig = (name) => {
  const n = name?.toLowerCase() || "";
  if (n.includes("marketing") || n.includes("smm") || n.includes("digital")) {
    return {
      bg: "bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600",
      text: "text-white",
      subtext: "text-indigo-100/80",
      badge: "bg-white/20 text-white backdrop-blur-sm border border-white/10",
      countText: "text-white",
      glow: "from-indigo-400 to-violet-400",
      borderColor: "border-indigo-400/20 hover:border-indigo-300/40"
    };
  }
  if (n.includes("web") || n.includes("site") || n.includes("dev")) {
    return {
      bg: "bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600",
      text: "text-white",
      subtext: "text-emerald-100/80",
      badge: "bg-white/20 text-white backdrop-blur-sm border border-white/10",
      countText: "text-white",
      glow: "from-emerald-300 to-cyan-300",
      borderColor: "border-emerald-400/20 hover:border-emerald-300/40"
    };
  }
  if (n.includes("seo")) {
    return {
      bg: "bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500",
      text: "text-white",
      subtext: "text-amber-100/80",
      badge: "bg-white/20 text-white backdrop-blur-sm border border-white/10",
      countText: "text-white",
      glow: "from-amber-300 to-rose-300",
      borderColor: "border-amber-400/20 hover:border-amber-300/40"
    };
  }
  if (n.includes("retainer")) {
    return {
      bg: "bg-gradient-to-br from-violet-600 via-purple-500 to-pink-500",
      text: "text-white",
      subtext: "text-purple-100/80",
      badge: "bg-white/20 text-white backdrop-blur-sm border border-white/10",
      countText: "text-white",
      glow: "from-violet-300 to-pink-300",
      borderColor: "border-violet-400/20 hover:border-violet-300/40"
    };
  }
  if (n.includes("internal")) {
    return {
      bg: "bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800",
      text: "text-white",
      subtext: "text-slate-300",
      badge: "bg-white/10 text-white border border-white/10",
      countText: "text-white",
      glow: "from-slate-400 to-slate-500",
      borderColor: "border-slate-500/20 hover:border-slate-400/40"
    };
  }
  // Default fallback
  return {
    bg: "bg-gradient-to-br from-blue-600 via-indigo-500 to-blue-600",
    text: "text-white",
    subtext: "text-blue-100/80",
    badge: "bg-white/20 text-white backdrop-blur-sm border border-white/10",
    countText: "text-white",
    glow: "from-blue-300 to-indigo-300",
    borderColor: "border-blue-400/20 hover:border-blue-300/40"
  };
};

const ProjectCategoryCards = ({ categories }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
      {categories.map((cat, i) => {
        const config = getGradientConfig(cat.name);
        return (
          <div
            key={i}
            className={`
              relative overflow-hidden
              ${config.bg}
              border ${config.borderColor}
              rounded-2xl
              p-4
              text-center
              hover:shadow-xl
              hover:-translate-y-1
              transition-all duration-300
              group
              shadow-sm
            `}
          >
            {/* Background glow effect */}
            <div
              className={`absolute -inset-10 bg-gradient-to-r ${config.glow} opacity-0 group-hover:opacity-20 blur-2xl transition-all duration-500`}
            />

            {/* Light streak effect on hover */}
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />

            {/* Count */}
            <div className={`text-4xl font-black mb-1.5 leading-none ${config.countText} tracking-tight drop-shadow-sm`}>
              {cat.count}
            </div>

            {/* Name */}
            <h3 className={`font-bold text-sm mb-1 ${config.text} tracking-tight`}>
              {cat.name}
            </h3>

            {/* Tags */}
            <p className={`text-[10px] font-medium mb-3 ${config.subtext} line-clamp-1`}>
              {cat.tags}
            </p>

            {/* Revenue badge */}
            <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-[10px] font-extrabold ${config.badge} transition-transform duration-300 group-hover:scale-105`}>
              {formatINR(cat.revenue)} revenue
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProjectCategoryCards;
