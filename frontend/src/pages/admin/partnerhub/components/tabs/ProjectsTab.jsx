import React, { useState, useEffect } from "react";
import axiosInstance from "../../../../../services/axiosInstance";
import { FiX, FiEdit2, FiPlus, FiBriefcase } from "react-icons/fi";
import AddBusinessProjectModal from "../AddBusinessProjectModal";
import DeleteConfirmationModal from "../DeleteConfirmationModal";
import toast from 'react-hot-toast';

const formatINR = (amount) => `₹${amount.toLocaleString("en-IN")}`;

const ProjectsTab = () => {
  const [projects, setProjects] = useState([]);
  const [filterCategory, setFilterCategory] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/business-projects');
      setProjects(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch projects", err);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (project) => {
    setProjectToDelete(project);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!projectToDelete) return;
    try {
      await axiosInstance.delete(`/business-projects/${projectToDelete._id}`);
      toast.success("Project deleted successfully");
      fetchProjects();
    } catch (err) {
      console.error("Failed to delete project", err);
      toast.error("Failed to delete project");
    } finally {
      setProjectToDelete(null);
    }
  };

  const openEditModal = (project) => {
    setProjectToEdit(project);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setProjectToEdit(null);
    setIsModalOpen(true);
  };

  const filteredProjects = projects.filter((project) => {
    return filterCategory === "All" || project.type === filterCategory;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 min-h-[60vh] shadow-sm animate-fadeIn">
      
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between mb-4">
        {/* Category Tabs */}
        <div className="flex bg-slate-50 border border-slate-200 p-1 rounded-xl w-full sm:w-auto overflow-x-auto scrollbar-hide whitespace-nowrap">
          {["All", "Digital Marketing", "Website", "SEO"].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`
                px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap
                ${
                  filterCategory === cat
                    ? "bg-[#7c5ff0] text-white shadow-sm"
                    : "text-[#64748b] hover:text-[#334155] hover:bg-white/50"
                }
              `}
            >
              {cat}
            </button>
          ))}
        </div>

        <button 
          onClick={openAddModal}
          className="w-full sm:w-auto bg-[#7c5ff0] hover:bg-[#6c4be0] text-white px-4 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95 shrink-0"
        >
          <FiPlus size={14} /> Add Project
        </button>
      </div>

      {/* Projects List */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-6 h-6 border-2 border-indigo-100 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-gray-400">Loading projects...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-100 rounded-xl bg-slate-50/30">
            <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-2 text-slate-400">
              <FiBriefcase size={16} />
            </div>
            <p className="text-xs text-gray-400 font-semibold">No projects found.</p>
          </div>
        ) : (
          filteredProjects.map((project) => {
            const revenue = project.revenue || 0;
            const cost = project.cost || 0;
            const profit = revenue - cost;
            const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
            
            const marginColor = margin >= 40 ? "text-[#059669]" : margin > 0 ? "text-[#d97706]" : "text-[#dc2626]";
            const profitColor = profit >= 0 ? "text-[#059669]" : "text-[#dc2626]";

            return (
              <div
                key={project._id}
                className="bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md rounded-xl p-3 flex flex-col lg:flex-row lg:items-center justify-between transition-all duration-200 relative overflow-hidden gap-3 lg:gap-6"
              >
                {/* Left Accent Bar */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#7c5ff0]"></div>

                {/* Left Content */}
                <div className="flex-1 pl-3 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <h3 className="text-slate-800 text-xs font-bold truncate max-w-[200px]">{project.name}</h3>
                    <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider scale-90">
                      {project.status}
                    </span>
                    <span className="text-[#7c5ff0] text-[10px] font-bold bg-[#7c5ff0]/10 px-2 py-0.5 rounded-full scale-90">
                      {project.type}
                    </span>
                  </div>
                  
                  {/* Employees */}
                  <div className="flex flex-wrap gap-1">
                    {project.employees && project.employees.length > 0 ? (
                      project.employees.map((emp) => (
                        <span key={emp._id} className="bg-slate-50 text-slate-500 text-[9px] px-1.5 py-0.5 rounded border border-slate-100 flex items-center gap-0.5">
                          {emp.name.split(' ')[0]} 
                          {emp.department && <span className="text-[#94a3b8]">| {emp.department.replace(' Team', '')}</span>}
                          {!emp.department && emp.role === 'admin' && <span className="text-[#94a3b8]">| Admin</span>}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400 text-[9px] italic">No employees assigned</span>
                    )}
                  </div>
                </div>

                {/* Right Metrics */}
                <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4 lg:gap-6 px-3 py-2 bg-slate-50 lg:bg-transparent rounded-xl border border-slate-100 lg:border-0">
                  <div className="text-center min-w-[65px]">
                    <p className="text-[#94a3b8] text-[9px] font-semibold mb-0.5">Revenue</p>
                    <p className="text-[#059669] font-extrabold text-xs">{formatINR(revenue)}</p>
                  </div>
                  <div className="text-center min-w-[65px]">
                    <p className="text-[#94a3b8] text-[9px] font-semibold mb-0.5">Cost</p>
                    <p className="text-[#dc2626] font-extrabold text-xs">{formatINR(cost)}</p>
                  </div>
                  <div className="text-center min-w-[65px]">
                    <p className="text-[#94a3b8] text-[9px] font-semibold mb-0.5">Profit</p>
                    <p className={`${profitColor} font-extrabold text-xs`}>{formatINR(profit)}</p>
                  </div>
                  <div className="text-center min-w-[45px]">
                    <p className="text-[#94a3b8] text-[9px] font-semibold mb-0.5">Margin</p>
                    <p className={`${marginColor} font-extrabold text-xs`}>{margin}%</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1.5 pl-2 lg:pl-4 lg:border-l border-slate-200 shrink-0">
                  <button 
                    onClick={() => openEditModal(project)}
                    className="px-2.5 py-1 bg-white border border-[#e2e8f0] text-slate-600 hover:bg-slate-50 rounded-lg text-[10px] font-bold shadow-sm transition-all"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => confirmDelete(project)}
                    className="w-6.5 h-6.5 flex items-center justify-center bg-rose-50 text-rose-500 border border-rose-100 rounded-lg shadow-sm hover:bg-rose-100 transition-colors"
                  >
                    <FiX size={12} strokeWidth={3} />
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>

      <AddBusinessProjectModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setProjectToEdit(null);
        }} 
        onProjectAdded={fetchProjects}
        projectToEdit={projectToEdit}
      />

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        itemName={projectToDelete?.name}
      />
    </div>
  );
};

export default ProjectsTab;
