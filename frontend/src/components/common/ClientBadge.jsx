import React from "react";
import { getClientIconComponent } from "../../utils/clientHelpers";

export const getClientBranding = (client) => {
  if (!client || !client.companyName) {
    return {
      color: "#64748b", // slate-500 fallback
      bgClass: "bg-slate-100 dark:bg-slate-800",
      textClass: "text-slate-600 dark:text-slate-400",
      borderClass: "border-slate-200 dark:border-slate-700",
      iconName: "FaRegBuilding",
    };
  }

  const nameHexes = [
    "#3b82f6", // blue
    "#8b5cf6", // violet
    "#10b981", // emerald
    "#f43f5e", // rose
    "#f59e0b", // amber
  "#06b6d4", // cyan
    "#6366f1", // indigo
    "#ec4899", // pink
    "#eab308", // yellow
  ];

  const nameColors = [
    { text: "text-blue-900 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-200 dark:border-blue-800/30" },
    { text: "text-purple-700 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-200 dark:border-purple-800/30" },
    { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-200 dark:border-emerald-800/30" },
    { text: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-900/20", border: "border-rose-200 dark:border-rose-800/30" },
    { text: "text-amber-650 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-200 dark:border-amber-800/30" },
    { text: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-50 dark:bg-cyan-900/20", border: "border-cyan-200 dark:border-cyan-800/30" },
    { text: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-900/20", border: "border-indigo-200 dark:border-indigo-800/30" },
    { text: "text-pink-600 dark:text-pink-400", bg: "bg-pink-50 dark:bg-pink-900/20", border: "border-pink-200 dark:border-pink-800/30" },
    { text: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-900/20", border: "border-yellow-200 dark:border-yellow-800/30" },
  ];

  let hash = 0;
  for (let i = 0; i < client.companyName.length; i++) {
    hash = client.companyName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % nameHexes.length;

  const clientColor = client.color || "#3b82f6";
  const hasCustomColor = true; // Always use the chosen or default color, never hash
  const hexColor = clientColor;

  return {
    color: hexColor,
    hasCustomColor,
    bgClass: hasCustomColor ? "" : nameColors[colorIndex].bg,
    textClass: hasCustomColor ? "" : nameColors[colorIndex].text,
    borderClass: hasCustomColor ? "" : nameColors[colorIndex].border,
    iconName: client.icon || "FaRegBuilding",
  };
};

const ClientBadge = ({ client, size = "md", showName = true, className = "" }) => {
  if (!client || !client.companyName) return null;

  const branding = getClientBranding(client);
  const IconComponent = getClientIconComponent(branding.iconName);

  // Size mapping
  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-[9px] gap-1 rounded",
    md: "px-2 py-1 text-[10px] gap-1.5 rounded-md",
    lg: "px-2.5 py-1 text-[10px] gap-2 rounded-lg"
  };

  const iconSizes = {
    sm: 9,
    md: 9,
    lg: 10
  };

  return (
    <span
      className={`inline-flex items-center font-extrabold border shrink-0 ${sizeClasses[size]} ${branding.bgClass} ${branding.textClass} ${branding.borderClass} ${className}`}
      style={branding.hasCustomColor ? {
        backgroundColor: `${branding.color}15`,
        borderColor: `${branding.color}30`,
        color: branding.color
      } : {}}
      title={client.companyName}
    >
      <div 
        className="flex items-center justify-center shrink-0" 
        style={!branding.hasCustomColor ? { color: branding.color } : {}}
      >
        <IconComponent size={iconSizes[size]} />
      </div>
      {showName && <span className="truncate max-w-[120px]">{client.companyName}</span>}
    </span>
  );
};

export default ClientBadge;
