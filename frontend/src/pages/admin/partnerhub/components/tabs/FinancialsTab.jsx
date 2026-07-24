import React, { useState, useEffect } from "react";
import axiosInstance from "../../../../../services/axiosInstance";
import toast from 'react-hot-toast';
import { FiDollarSign, FiTrendingUp, FiPieChart } from "react-icons/fi";

const formatINR = (amount) => `₹${Math.round(amount).toLocaleString("en-IN")}`;

const FinancialsTab = () => {
  const [team, setTeam] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Quick Edit State
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [editFormData, setEditFormData] = useState({
    revenue: '',
    type: 'Digital Marketing',
    status: 'Active',
    employees: []
  });
  const [updating, setUpdating] = useState(false);

  // Scenario Calculator State
  const [scenario, setScenario] = useState({
    name: '',
    revenue: '',
    employeesNeeded: '',
    type: 'Digital Marketing'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, projectsRes] = await Promise.all([
        axiosInstance.get('/users'),
        axiosInstance.get('/business-projects')
      ]);
      setTeam(usersRes.data.data || usersRes.data || []);
      setProjects(projectsRes.data.data || []);
    } catch (err) {
      console.error("Failed to fetch data", err);
    } finally {
      setLoading(false);
    }
  };

  // --- Calculations ---
  const FIXED_OVERHEAD = 30000;
  const totalProjectsCount = projects.length;
  const fixedOverheadPerProject = totalProjectsCount > 0 ? FIXED_OVERHEAD / totalProjectsCount : 0;

  let totalTeamCTC = 0;
  const employeeStats = team.map(emp => {
    const salary = emp.salary || 0;
    const overhead = emp.overheadPercent || 0;
    const ctc = salary + (salary * overhead / 100);
    totalTeamCTC += ctc;

    const assignedProjects = projects.filter(p => p.employees && p.employees.some(e => e._id === emp._id || e === emp._id));
    const activeCount = assignedProjects.length;
    const costPerProj = activeCount > 0 ? ctc / activeCount : 0;

    return { ...emp, ctc, activeCount, costPerProj };
  });

  let sumRevenue = 0;
  let sumCost = 0;

  const projectList = projects.map(proj => {
    let projCost = fixedOverheadPerProject;
    if (proj.employees) {
      proj.employees.forEach(empId => {
        const emp = employeeStats.find(e => e._id === (empId._id || empId));
        if (emp) {
          projCost += emp.costPerProj;
        }
      });
    }

    const rev = proj.revenue || 0;
    const profit = rev - projCost;
    const margin = rev > 0 ? (profit / rev) * 100 : 0;

    sumRevenue += rev;
    sumCost += projCost;

    return { ...proj, computedCost: projCost, computedProfit: profit, computedMargin: margin };
  }).sort((a, b) => b.computedProfit - a.computedProfit);

  const netProfit = sumRevenue - sumCost;
  const overallMargin = sumRevenue > 0 ? Math.round((netProfit / sumRevenue) * 100) : 0;

  // Scenario Calculation
  const scenRev = Number(scenario.revenue) || 0;
  const scenEmp = Number(scenario.employeesNeeded) || 0;
  const avgCTC = team.length > 0 ? totalTeamCTC / team.length : 25000; 
  const scenCost = scenEmp * avgCTC;
  const scenProfit = scenRev - scenCost;

  // Handlers
  const handleProjectSelect = (e) => {
    const pid = e.target.value;
    setSelectedProjectId(pid);
    const proj = projects.find(p => p._id === pid);
    if (proj) {
      setEditFormData({
        revenue: proj.revenue || 0,
        type: proj.type || 'Digital Marketing',
        status: proj.status || 'Active',
        employees: proj.employees ? proj.employees.map(emp => emp._id || emp) : []
      });
    } else {
      setEditFormData({ revenue: '', type: 'Digital Marketing', status: 'Active', employees: [] });
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEmployeeSelect = (e) => {
    const options = e.target.options;
    const selected = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selected.push(options[i].value);
      }
    }
    setEditFormData(prev => ({ ...prev, employees: selected }));
  };

  const handleQuickUpdate = async () => {
    if (!selectedProjectId) return;
    try {
      setUpdating(true);
      await axiosInstance.put(`/business-projects/${selectedProjectId}`, {
        revenue: Number(editFormData.revenue),
        type: editFormData.type,
        status: editFormData.status,
        employees: editFormData.employees
      });
      toast.success("Project updated successfully!");
      setSelectedProjectId('');
      setEditFormData({ revenue: '', type: 'Digital Marketing', status: 'Active', employees: [] });
      fetchData();
    } catch (err) {
      toast.error("Failed to update project");
    } finally {
      setUpdating(false);
    }
  };

  // Compute live preview for edit panel
  let previewCost = fixedOverheadPerProject;
  editFormData.employees.forEach(empId => {
    const emp = employeeStats.find(e => e._id === empId);
    if (emp) {
      previewCost += emp.costPerProj;
    }
  });
  const previewRev = Number(editFormData.revenue) || 0;
  const previewProfit = previewRev - previewCost;
  const previewMargin = previewRev > 0 ? Math.round((previewProfit / previewRev) * 100) : 0;

  if (loading) {
    return (
      <div className="text-center py-20 text-slate-400 font-semibold text-xs">
        <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mr-2 inline-block" />
        Loading financials...
      </div>
    );
  }

  return (
    <div className="animate-fadeIn space-y-4">
      
      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Gross Revenue */}
        <div className="bg-white rounded-2xl p-3.5 border-t-[3px] border-[#34d399] shadow-sm flex flex-col justify-center">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">Gross Revenue</h4>
            <FiDollarSign size={12} className="text-emerald-500" />
          </div>
          <h2 className="text-slate-800 text-lg font-black">{formatINR(sumRevenue)}</h2>
          <p className="text-gray-400 text-[9px] mt-0.5">All active projects</p>
        </div>

        {/* Total Expenses */}
        <div className="bg-white rounded-2xl p-3.5 border-t-[3px] border-[#ef4444] shadow-sm flex flex-col justify-center">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">Total Expenses</h4>
            <FiPieChart size={12} className="text-rose-500" />
          </div>
          <h2 className="text-slate-800 text-lg font-black">{formatINR(sumCost)}</h2>
          <p className="text-gray-400 text-[9px] mt-0.5">CTC + Overhead</p>
        </div>

        {/* Net Profit */}
        <div className="bg-white rounded-2xl p-3.5 border-t-[3px] border-[#8b5cf6] shadow-sm flex flex-col justify-center">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">Net Profit</h4>
            <FiTrendingUp size={12} className="text-purple-500" />
          </div>
          <h2 className="text-emerald-600 text-lg font-black">{formatINR(netProfit)}</h2>
          <p className="text-gray-400 text-[9px] mt-0.5 flex items-center gap-1">
            Margin: {overallMargin}% 
            {overallMargin >= 20 ? '🟢' : overallMargin >= 10 ? '🟡' : '🔴'}
          </p>
        </div>
      </div>

      {/* Middle Row */}
      <div className="gap-3">
        
        {/* Project-wise Table */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-slate-800 font-bold text-xs">Project-wise Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[500px]">
              <thead>
                <tr className="bg-slate-50/60 text-slate-400 text-[9px] uppercase tracking-wider border-b border-slate-100">
                  <th className="py-2 px-4 text-left font-bold">Project</th>
                  <th className="py-2 px-3 text-right font-bold">Revenue</th>
                  <th className="py-2 px-3 text-right font-bold">Cost</th>
                  <th className="py-2 px-3 text-right font-bold">Profit</th>
                  <th className="py-2 px-4 text-right font-bold">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {projectList.map(proj => (
                  <tr key={proj._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700 text-xs">{proj.name}</span>
                        <span className="text-gray-400 text-[9px]">{proj.type} - {proj.status}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-600">{formatINR(proj.revenue)}</td>
                    <td className="py-2 px-3 text-right font-bold text-rose-600">{formatINR(proj.computedCost)}</td>
                    <td className={`py-2 px-3 text-right font-bold ${proj.computedProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatINR(proj.computedProfit)}
                    </td>
                    <td className={`py-2 px-4 text-right font-bold text-[11px] ${proj.computedMargin >= 20 ? 'text-emerald-600' : proj.computedMargin > 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                      {Math.round(proj.computedMargin)}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50/60 border-t border-slate-100 font-extrabold text-slate-800">
                <tr>
                  <td className="py-2.5 px-4 uppercase tracking-wider text-[10px]">TOTAL</td>
                  <td className="py-2.5 px-3 text-right text-emerald-600">{formatINR(sumRevenue)}</td>
                  <td className="py-2.5 px-3 text-right text-rose-600">{formatINR(sumCost)}</td>
                  <td className="py-2.5 px-3 text-right text-emerald-600">{formatINR(netProfit)}</td>
                  <td className="py-2.5 px-4 text-right text-emerald-600">{overallMargin}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

       

      </div>

    

    </div>
  );
};

export default FinancialsTab;
