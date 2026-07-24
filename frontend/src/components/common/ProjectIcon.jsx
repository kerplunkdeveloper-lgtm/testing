import React from "react";
import { getClientIconComponent } from "../../utils/clientHelpers";

// ProjectIcon — shows client's chosen icon + color (same as Client page)
// Pass `client` object for client-branded icon, or fallback to letter avatar
export const ProjectIcon = ({ name, client, size = "sm", className = "" }) => {

  // Size classes
  const sizeMap = {
    xs: { box: "w-4 h-4", icon: 8,  text: "text-[8px]",  rounded: "rounded" },
    sm: { box: "w-6 h-6", icon: 11, text: "text-[10px]", rounded: "rounded" },
    md: { box: "w-7 h-7", icon: 13, text: "text-[11px]", rounded: "rounded-md" },
    lg: { box: "w-8 h-8", icon: 15, text: "text-[13px]", rounded: "rounded-lg" },
    xl: { box: "w-10 h-10", icon: 18, text: "text-[16px]", rounded: "rounded-xl" },
  };
  const sz = sizeMap[size] || sizeMap.sm;

  // If a client object with icon/color is provided, use it (client page style)
  if (client && client.companyName) {
    const iconName = client.icon || "FaRegBuilding";
    const color = client.color || "#6366f1";
    const IconComponent = getClientIconComponent(iconName);

    return (
      <div
        className={`flex items-center justify-center shrink-0 ${sz.box} ${sz.rounded} ${className}`}
        style={{
          backgroundColor: `${color}22`,
          border: `1.5px solid ${color}40`,
          color: color,
        }}
        title={client.companyName}
      >
        <IconComponent size={sz.icon} />
      </div>
    );
  }

  // Fallback: solid colored letter avatar (when no client data)
  const char = name ? name.trim().charAt(0).toUpperCase() : "?";

  const getSolidColor = (str) => {
    const schemes = [
      "bg-violet-500", "bg-blue-500",   "bg-emerald-500",
      "bg-rose-500",   "bg-amber-500",  "bg-cyan-500",
      "bg-indigo-500", "bg-pink-500",   "bg-teal-500",
      "bg-orange-500",
    ];
    if (!str) return schemes[0];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return schemes[Math.abs(hash) % schemes.length];
  };

  return (
    <div
      className={`flex items-center justify-center shrink-0 font-black text-white ${getSolidColor(name)} ${sz.box} ${sz.rounded} ${className}`}
    >
      {char}
    </div>
  );
};

export default ProjectIcon;
