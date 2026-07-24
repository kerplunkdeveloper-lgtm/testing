import React, { useState, useEffect } from "react";
import axiosInstance from "../../../../../services/axiosInstance";
import { FiPlus, FiX } from "react-icons/fi";
import AssignEmployeeModal from "../AssignEmployeeModal";
import toast from "react-hot-toast";

const formatINR = (amount) => `₹${amount.toLocaleString("en-IN")}`;

const ClientSplitsTab = () => {
  const [team, setTeam] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Drag & Drop States
  const [draggingProjectId, setDraggingProjectId] = useState(null);
  const [draggingSourceEmployeeId, setDraggingSourceEmployeeId] = useState(null);
  const [dragOverEmployeeId, setDragOverEmployeeId] = useState(null);

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

  const getDisplayRole = (user) => {
    if (user.role === 'admin') return "Managing Partner";
    if (user.role === 'operationmanager') return "Operations Manager";
    if (user.department) return user.department.replace(' Team', '') + ' Manager';
    return user.role;
  };

  const openAssignModal = (employee = null) => {
    setSelectedEmployee(employee);
    setIsModalOpen(true);
  };

  // Drag & Drop Event Handlers
  const handleDragStart = (e, project, employeeId) => {
    setDraggingProjectId(project._id);
    setDraggingSourceEmployeeId(employeeId);
    e.dataTransfer.setData("projectId", project._id);
    e.dataTransfer.setData("sourceEmployeeId", employeeId || "unassigned");
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggingProjectId(null);
    setDraggingSourceEmployeeId(null);
    setDragOverEmployeeId(null);
  };

  const handleDragOver = (e, employeeId) => {
    e.preventDefault();
    if (dragOverEmployeeId !== employeeId) {
      setDragOverEmployeeId(employeeId);
    }
  };

  const handleDrop = async (e, targetEmployeeId) => {
    e.preventDefault();
    const projectId = e.dataTransfer.getData("projectId") || draggingProjectId;
    const sourceEmployeeId = e.dataTransfer.getData("sourceEmployeeId") || draggingSourceEmployeeId;
    
    setDragOverEmployeeId(null);
    
    if (!projectId) return;
    if (sourceEmployeeId === targetEmployeeId) return;

    try {
      const project = projects.find(p => p._id === projectId);
      if (!project) return;

      let updatedEmployees = [...(project.employees || [])].map(emp => typeof emp === 'object' ? emp._id : emp);

      if (targetEmployeeId === "unassigned") {
        if (sourceEmployeeId && sourceEmployeeId !== "unassigned") {
          updatedEmployees = updatedEmployees.filter(id => id !== sourceEmployeeId);
        }
      } else {
        if (sourceEmployeeId && sourceEmployeeId !== "unassigned") {
          updatedEmployees = updatedEmployees.filter(id => id !== sourceEmployeeId);
        }
        if (!updatedEmployees.includes(targetEmployeeId)) {
          updatedEmployees.push(targetEmployeeId);
        }
      }

      const res = await axiosInstance.put(`/business-projects/${projectId}`, {
        employees: updatedEmployees
      });

      if (res.data.success) {
        toast.success("Assignment updated successfully!");
        fetchData();
      }
    } catch (err) {
      console.error("Failed to update assignment via drag & drop", err);
      toast.error("Failed to update assignment");
    }
  };

  const handleUnassign = async (projectId, employeeId) => {
    try {
      const project = projects.find(p => p._id === projectId);
      if (!project) return;

      const updatedEmployees = [...(project.employees || [])]
        .map(emp => typeof emp === 'object' ? emp._id : emp)
        .filter(id => id !== employeeId);

      const res = await axiosInstance.put(`/business-projects/${projectId}`, {
        employees: updatedEmployees
      });

      if (res.data.success) {
        toast.success("Employee unassigned successfully!");
        fetchData();
      }
    } catch (err) {
      console.error("Failed to unassign employee", err);
      toast.error("Failed to unassign employee");
    }
  };

  // Compute Cost Attribution Summary
  const totalActiveClients = projects.length;
  const totalRevenue = projects.reduce((sum, p) => sum + (p.revenue || 0), 0);
  
  const totalCTC = team.reduce((sum, member) => {
    const salary = member.salary || 0;
    const overhead = member.overheadPercent || 0;
    return sum + (salary + (salary * overhead / 100));
  }, 0);
  
  const totalCost = totalCTC + 30000;
  const netProfit = totalRevenue - totalCost;

  const unassignedProjects = projects.filter(p => !p.employees || p.employees.length === 0);

  return (
    <div className="animate-fadeIn space-y-4">
      
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between bg-slate-50 border border-slate-200 p-2.5 rounded-xl gap-2">
        <p className="text-slate-500 text-[10px] font-semibold text-center sm:text-left">
          Assign employees to clients using Drag and Drop. CTC and cost-per-client are auto-calculated.
        </p>
        <button 
          onClick={() => openAssignModal()}
          className="w-full sm:w-auto px-3.5 py-1.5 bg-[#7c5ff0] text-white font-bold text-xs rounded-xl shadow-sm hover:bg-[#6c4be0] transition-colors flex items-center justify-center gap-1 active:scale-95 shrink-0"
        >
          <FiPlus size={14} /> Assign Employee
        </button>
      </div>

      {/* Main Grid area */}
      <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex overflow-x-auto min-h-[380px] snap-x scrollbar-hide pb-1">
          {loading ? (
            <div className="w-full flex items-center justify-center py-20 text-slate-400 font-semibold text-xs">
              <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mr-2" />
              Loading client splits...
            </div>
          ) : (
            <>
              {/* Unassigned Clients Column */}
              <div 
                onDragOver={(e) => handleDragOver(e, "unassigned")}
                onDragLeave={() => setDragOverEmployeeId(null)}
                onDrop={(e) => handleDrop(e, "unassigned")}
                className={`min-w-[220px] max-w-[280px] flex-1 border-r border-slate-200 snap-start flex flex-col bg-slate-100/50 transition-all duration-200 ${
                  dragOverEmployeeId === "unassigned" ? "bg-slate-200/80 ring-2 ring-dashed ring-slate-400 ring-inset" : ""
                }`}
              >
                {/* Column Header */}
                <div className=" text-center py-2 px-2 flex justify-center items-center gap-1.5">
                  <span className="text-[10px]">📋</span>
                  <h3 className="font-extrabold text-xs truncate">Unassigned Clients</h3>
                  <span className="bg-slate-600 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                    {unassignedProjects.length}
                  </span>
                </div>
                
                <div className="bg-slate-200/50 text-center py-1.5 px-2 border-b border-white">
                  <p className="text-slate-500 text-[9px] font-semibold">Drag from here to assign</p>
                </div>
                
                <div className="bg-slate-100 text-center py-1.5 px-2 border-b border-white">
                  <p className="text-slate-500 text-[9px] font-bold">Drop here to unassign</p>
                </div>

                {/* Clients List */}
                <div className="flex-1 p-2 space-y-2 min-h-[250px] overflow-y-auto">
                  {unassignedProjects.map(proj => (
                    <div 
                      key={proj._id} 
                      draggable
                      onDragStart={(e) => handleDragStart(e, proj, null)}
                      onDragEnd={handleDragEnd}
                      className={`bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex flex-col cursor-grab active:cursor-grabbing hover:border-slate-400 hover:shadow transition-all duration-200 select-none ${
                        draggingProjectId === proj._id ? "opacity-40 border-dashed" : ""
                      }`}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <span className="text-slate-800 font-bold text-[11px] truncate">{proj.name}</span>
                        <span className="text-[8px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded font-bold uppercase shrink-0">
                          {proj.type || 'Project'}
                        </span>
                      </div>
                      <span className="text-slate-400 text-[9px] font-bold mt-1">
                        {formatINR(proj.revenue || 0)}/mo
                      </span>
                    </div>
                  ))}
                  
                  {unassignedProjects.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-3 text-slate-400 border border-dashed border-slate-200 rounded-xl py-12 bg-slate-50/50">
                      <span className="text-lg mb-0.5">🎉</span>
                      <p className="text-[9px] font-semibold">All clients assigned!</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Employee Columns */}
              {team.map(employee => {
                const assignedProjects = projects.filter(p => p.employees && p.employees.some(e => e._id === employee._id || e === employee._id));
                const activeProjectsCount = assignedProjects.length;
                const timeAlloc = activeProjectsCount > 0 ? Math.round(100 / activeProjectsCount) : 0;
                
                const salary = employee.salary || 0;
                const overhead = employee.overheadPercent || 0;
                const ctc = salary + (salary * overhead / 100);
                const costPerProject = activeProjectsCount > 0 ? Math.round(ctc / activeProjectsCount) : 0;

                return (
                  <div 
                    key={employee._id} 
                    onDragOver={(e) => handleDragOver(e, employee._id)}
                    onDragLeave={() => setDragOverEmployeeId(null)}
                    onDrop={(e) => handleDrop(e, employee._id)}
                    className={`min-w-[220px] max-w-[280px] flex-1 border-r border-slate-200 snap-start flex flex-col bg-white transition-all duration-200 ${
                      dragOverEmployeeId === employee._id ? "bg-indigo-50/50 ring-2 ring-dashed ring-[#7c5ff0] ring-inset" : ""
                    }`}
                  >
                    
                    {/* Column Header */}
                    <div className="bg-[#7c5ff0] text-white text-center py-2 px-2 shadow-sm">
                      <h3 className="font-extrabold text-xs truncate">{employee.name}</h3>
                    </div>
                    
                    <div className="bg-slate-100 text-center py-1.5 px-2 border-b border-white">
                      <p className="text-slate-500 text-[9px] font-semibold truncate">{getDisplayRole(employee)}</p>
                    </div>
                    
                    <div className="bg-rose-50 text-center py-1.5 px-2 border-b border-white">
                      <p className="text-rose-600 text-[9px] font-extrabold">CTC: {formatINR(ctc)}</p>
                    </div>

                    {/* Clients List */}
                    <div className="flex-1 p-2 space-y-2 min-h-[250px] overflow-y-auto">
                      {assignedProjects.map(proj => (
                        <div 
                          key={proj._id} 
                          draggable
                          onDragStart={(e) => handleDragStart(e, proj, employee._id)}
                          onDragEnd={handleDragEnd}
                          className={`bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex flex-col cursor-grab active:cursor-grabbing hover:border-[#7c5ff0] hover:shadow transition-all duration-200 relative group select-none ${
                            draggingProjectId === proj._id ? "opacity-40 border-dashed" : ""
                          }`}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnassign(proj._id, employee._id);
                            }}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-opacity duration-150 p-0.5 rounded bg-slate-50 hover:bg-rose-50 shadow-sm"
                            title="Unassign employee"
                          >
                            <FiX size={12} />
                          </button>

                          <span className="text-slate-800 font-bold text-[11px] truncate pr-5">{proj.name}</span>
                          <span className="text-slate-400 text-[9px] font-semibold mt-1">
                            {timeAlloc}% time · {formatINR(costPerProject)}/mo
                          </span>
                        </div>
                      ))}
                      
                      <button 
                        onClick={() => openAssignModal(employee)}
                        className="w-full mt-1.5 py-2 flex items-center justify-center gap-1 text-slate-400 hover:text-slate-600 text-[10px] font-bold bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-dashed border-slate-200"
                      >
                        <FiPlus size={10} /> Assign
                      </button>
                    </div>

                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Summary Box */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="text-slate-800 font-bold text-sm mb-3 flex items-center gap-2">
          <span>💰</span> Cost Attribution Summary
        </h3>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center flex flex-col justify-center">
            <p className="text-slate-400 text-[9px] font-bold mb-0.5 uppercase tracking-wider">Active Clients</p>
            <p className="text-blue-500 text-lg font-black">{totalActiveClients}</p>
          </div>
          
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center flex flex-col justify-center">
            <p className="text-slate-400 text-[9px] font-bold mb-0.5 uppercase tracking-wider">Revenue</p>
            <p className="text-emerald-500 text-lg font-black">{formatINR(totalRevenue)}</p>
          </div>
          
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center flex flex-col justify-center">
            <p className="text-slate-400 text-[9px] font-bold mb-0.5 uppercase tracking-wider">Total Cost</p>
            <p className="text-rose-500 text-lg font-black">{formatINR(totalCost)}</p>
          </div>
          
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center flex flex-col justify-center">
            <p className="text-slate-400 text-[9px] font-bold mb-0.5 uppercase tracking-wider">Net Profit</p>
            <p className="text-emerald-500 text-lg font-black">{formatINR(netProfit)}</p>
          </div>
        </div>
      </div>

      <AssignEmployeeModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAssigned={fetchData}
        initialEmployee={selectedEmployee}
      />

    </div>
  );
};

export default ClientSplitsTab;
