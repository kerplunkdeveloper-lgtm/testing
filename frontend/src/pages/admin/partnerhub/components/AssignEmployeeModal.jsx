import React, { useState, useEffect } from "react";
import axiosInstance from "../../../../services/axiosInstance";
import { FiX } from "react-icons/fi";
import toast from "react-hot-toast";

const AssignEmployeeModal = ({
  isOpen,
  onClose,
  onAssigned,
  initialEmployee,
}) => {
  const [formData, setFormData] = useState({
    employeeId: "",
    clientId: "",
    roleOnAccount: "Account Manager",
    timeAllocation: "",
  });
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchData();
      fetchClients();
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialEmployee && users.length > 0) {
      setFormData((prev) => ({ ...prev, employeeId: initialEmployee._id }));
    }
  }, [initialEmployee, users]);

  const fetchData = async () => {
    try {
      const [usersRes, projectsRes] = await Promise.all([
        axiosInstance.get("/users"),
        axiosInstance.get("/business-projects"),
      ]);
      setUsers(usersRes.data.data || usersRes.data || []);
      setProjects(projectsRes.data.data || []);
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await axiosInstance.get("/clients");
      const clientList = res.data.data || res.data;
      setClients(Array.isArray(clientList) ? clientList : []);
    } catch (err) {
      console.error("Failed to fetch clients", err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const matchedProject = projects.find(
        (p) => (p.client?._id || p.client) === formData.clientId
      );

      if (!matchedProject) {
        toast.error("No active business project found for the selected client.");
        setLoading(false);
        return;
      }

      const payload = {
        employeeId: formData.employeeId,
        roleOnAccount: formData.roleOnAccount,
        timeAllocation: Number(formData.timeAllocation) || 0,
      };

      await axiosInstance.post(
        `/business-projects/${matchedProject._id}/assign`,
        payload,
      );
      toast.success("Employee assigned successfully!");

      onAssigned();
      onClose();
      setFormData({
        employeeId: initialEmployee ? initialEmployee._id : "",
        clientId: "",
        roleOnAccount: "Account Manager",
        timeAllocation: "",
      });
    } catch (err) {
      console.error("Error assigning employee:", err.response?.data || err);
      toast.error(
        "Failed to assign employee: " +
          (err.response?.data?.message || err.message),
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getDisplayRole = (user) => {
    if (user.role === "admin") return "Managing Partner";
    if (user.role === "operationmanager") return "Operations Manager";
    if (user.department)
      return user.department.replace(" Team", "") + " Manager";
    return user.role;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px] p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden flex flex-col border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
          <h2 className="text-slate-800 text-sm font-bold flex items-center gap-1.5">
            <span>🔗</span> Assign to Client
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <FiX size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3 bg-white flex-1 space-y-3">
          <div>
            <label className="block text-slate-500 text-[10px] font-bold mb-1">
              Employee <span className="text-rose-500">*</span>
            </label>
            <select
              name="employeeId"
              value={formData.employeeId}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23475569%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.75rem_center] bg-[length:0.85em_0.85em] pr-8"
            >
              <option value="">Select Employee...</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} — {getDisplayRole(u)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 text-[10px] font-bold mb-1">
              Client <span className="text-rose-500">*</span>
            </label>
            <select
              name="clientId"
              value={formData.clientId}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23475569%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.75rem_center] bg-[length:0.85em_0.85em] pr-8"
            >
              <option value="">Select Client...</option>
              {clients.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.companyName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 text-[10px] font-bold mb-1">
              Role on Account
            </label>
            <select
              name="roleOnAccount"
              value={formData.roleOnAccount}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23475569%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.75rem_center] bg-[length:0.85em_0.85em] pr-8"
            >
              <option value="Account Manager">Account Manager</option>
              <option value="Designer">Designer</option>
              <option value="Developer">Developer</option>
              <option value="SEO Expert">SEO Expert</option>
              <option value="Video Editor">Video Editor</option>
              <option value="Content Writer">Content Writer</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-500 text-[10px] font-bold mb-1">
              Time Allocation %
            </label>
            <input
              type="number"
              name="timeAllocation"
              value={formData.timeAllocation}
              onChange={handleChange}
              placeholder="e.g. 25"
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-2.5 bg-slate-50 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-500 font-bold hover:bg-slate-100 transition-all text-xs"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!formData.employeeId || !formData.clientId || loading}
            className="px-4 py-1.5 rounded-xl bg-[#7c5ff0] text-white font-bold hover:bg-[#6c4be0] disabled:opacity-50 transition-all text-xs shadow-sm"
          >
            {loading ? "Assigning..." : "Assign"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignEmployeeModal;
