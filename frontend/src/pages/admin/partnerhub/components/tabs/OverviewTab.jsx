import React from "react";
import RevenueStatCards from "../RevenueStatCards";
import ProjectCategoryCards from "../ProjectCategoryCards";
import ProfitPerClientTable from "../ProfitPerClientTable";
import OverheadConfig from "../OverheadConfig";

const OverviewTab = ({ revenueData, projectCategories, clientProfitData, overheadItems, onUpdateOverheads }) => {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Revenue Stat Cards */}
      <RevenueStatCards data={revenueData} />

      {/* Project Categories */}
      <ProjectCategoryCards categories={projectCategories} />

      {/* Bottom Row: Profit Table + Overhead Config */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Profit per Client — 3 cols */}
        <div className="lg:col-span-3">
          <ProfitPerClientTable clients={clientProfitData} />
        </div>

        {/* Overhead — 2 cols */}
        <div className="lg:col-span-2">
          <OverheadConfig overheads={overheadItems} onUpdate={onUpdateOverheads} />
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
