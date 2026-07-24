import React from "react";

const tabs = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "projects", label: "Projects", icon: "📁" },
  { id: "team", label: "Team Strength", icon: "👥" },
  { id: "clients", label: "Client Splits", icon: "🏢" },
  // { id: "financials", label: "Financials", icon: "💰" },
];

const FinancialsNav = ({ activeTab, setActiveTab, onExport }) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-2 animate-fadeIn print:hidden">
      {/* Spacer for centering on large screens */}
      <div className="hidden lg:block w-36"></div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-xl overflow-x-auto scrollbar-hide w-full sm:w-auto max-w-full">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap flex-shrink-0
                ${isActive
                  ? "bg-[#7c5ff0] text-white shadow-sm"
                  : "text-[#64748b] hover:text-[#334155] hover:bg-white/50"
                }
              `}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Right Controls - Export */}
      <div className="w-full sm:w-auto lg:w-36 flex justify-center sm:justify-end">
        {activeTab === "overview" && (
          <button 
            onClick={onExport}
            className="flex items-center gap-1.5 bg-[#f8fafc] hover:bg-white text-[#475569] border border-slate-200 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all shadow-sm whitespace-nowrap active:scale-95"
          >
            <span>📥</span>
            <span>Export Report</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default FinancialsNav;
