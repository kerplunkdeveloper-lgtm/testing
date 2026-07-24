import React, { useState, useEffect } from "react";
import axiosInstance from "../../../services/axiosInstance";

import FinancialsNav from "./components/FinancialsNav";
import OverviewTab from "./components/tabs/OverviewTab";
import ProjectsTab from "./components/tabs/ProjectsTab";
import TeamStrengthTab from "./components/tabs/TeamStrengthTab";
import ClientSplitsTab from "./components/tabs/ClientSplitsTab";
import FinancialsTab from "./components/tabs/FinancialsTab";

const PartnerHub = () => {
  const [activeTab, setActiveTab] = useState("overview");

  const [projects, setProjects] = useState([]);
  const [team, setTeam] = useState([]);
  const [overheadItems, setOverheadItems] = useState([]);
  const [loading, setLoading] = useState(true);


  const fetchDashboardData = async () => {
    try {
      if (projects.length === 0 && team.length === 0) {
        setLoading(true);
      }
      const [usersRes, projectsRes, overheadsRes] = await Promise.all([
        axiosInstance.get('/users'),
        axiosInstance.get('/business-projects'),
        axiosInstance.get('/overheads')
      ]);
      setTeam(usersRes.data.data || usersRes.data || []);
      setProjects(projectsRes.data.data || []);
      setOverheadItems(overheadsRes.data.data || []);
    } catch(err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "overview") {
      fetchDashboardData();
    }
  }, [activeTab]);



  // Compute overview data
  let totalRevenue = 0;
  let totalCost = 0;
  
  const categories = {
    "Digital Marketing": { count: 0, revenue: 0, color: "#818cf8", tags: "SEO · SMM · Ads · Content" },
    "Website": { count: 0, revenue: 0, color: "#34d399", tags: "Design · Dev · Maintenance" },
    "SEO": { count: 0, revenue: 0, color: "#c084fc", tags: "On-page · Off-page · Technical" }
  };

  const clientProfitData = projects.map(p => {
    const rev = p.revenue || 0;
    const cost = p.cost || 0;
    const profit = rev - cost;
    const margin = rev > 0 ? Math.round((profit / rev) * 100) : 0;
    
    totalRevenue += rev;
    totalCost += cost;
    
    if (categories[p.type]) {
      categories[p.type].count += 1;
      categories[p.type].revenue += rev;
    } else {
      categories[p.type] = { count: 1, revenue: rev, color: "#9ca3af", tags: "Custom" };
    }
    
    return { name: p.name, revenue: rev, profit, margin };
  }).sort((a,b) => b.profit - a.profit);

  const projectCategoriesArray = Object.keys(categories).map(k => ({ name: k, ...categories[k] }));

  // Salary cost
  let totalSalaryCost = 0;
  team.forEach(member => {
    const salary = member.salary || 0;
    const overhead = member.overheadPercent || 0;
    totalSalaryCost += (salary + (salary * overhead / 100));
  });

  const totalOverhead = overheadItems.reduce((sum, item) => sum + item.amount, 0);
  const netProfit = totalRevenue - totalOverhead - totalSalaryCost;
  const marginPercent = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

  const revenueData = {
    totalRevenue,
    totalCost:  totalOverhead + totalSalaryCost,
    netProfit,
    marginPercent,
    overhead: totalOverhead,
  };

  const renderTabContent = () => {
    if (loading) return <div className="text-center py-20 text-slate-500 font-bold">Loading dashboard data...</div>;

    switch (activeTab) {
      case "overview":
        return (
          <OverviewTab
            revenueData={revenueData}
            projectCategories={projectCategoriesArray}
            clientProfitData={clientProfitData}
            overheadItems={overheadItems}
            onUpdateOverheads={fetchDashboardData}
          />
        );
      case "projects":
        return <ProjectsTab />;
      case "team":
        return <TeamStrengthTab />;
      case "clients":
        return <ClientSplitsTab />;
      case "financials":
        return <FinancialsTab />;
      default:
        return null;
    }
  };

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";

    // 1. Overview Section
    csvContent += "Financial Overview\n";
    csvContent += "Total Revenue,Total Cost,Net Profit,Margin (%),Total Overhead\n";
    csvContent += `${revenueData.totalRevenue},${revenueData.totalCost},${revenueData.netProfit},${revenueData.marginPercent}%,${revenueData.overhead}\n\n`;

    // 2. Client Profit Data
    csvContent += "Client Profitability\n";
    csvContent += "Project Name,Revenue,Profit,Margin (%)\n";
    clientProfitData.forEach(client => {
      csvContent += `"${client.name || ''}",${client.revenue},${client.profit},${client.margin}%\n`;
    });
    csvContent += "\n";

    // 3. Project Categories
    csvContent += "Project Categories\n";
    csvContent += "Category,Project Count,Revenue\n";
    projectCategoriesArray.forEach(cat => {
      csvContent += `"${cat.name || ''}",${cat.count},${cat.revenue}\n`;
    });
    csvContent += "\n";

    // 4. Overheads
    csvContent += "Operational Overheads\n";
    csvContent += "Item,Amount\n";
    overheadItems.forEach(item => {
      csvContent += `"${item.name || ''}",${item.amount}\n`;
    });
    csvContent += "\n";

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Financial_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <FinancialsNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onExport={handleExportCSV}
      />

      {/* Tab Content area */}
      <div className="mt-4">{renderTabContent()}</div>
    </div>
  );
};

export default PartnerHub;