import React, { useState, useEffect } from "react";
import axiosInstance from "../../../../services/axiosInstance";
import { FiX } from "react-icons/fi";
import toast from "react-hot-toast";

const AddEmployeeModal = ({
  isOpen,
  onClose,
  onEmployeeAdded,
  employeeToEdit,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    roleText: "", // for "Role / Designation" UI
    salary: "",
    overheadPercent: "",
    department: "Social Media Team",
    capacity: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (employeeToEdit) {
        let roleText = "Team Member";
        if (employeeToEdit.role === "admin") roleText = "Managing Partner";
        else if (employeeToEdit.role === "operationmanager")
          roleText = "Operations Manager";
        else if (employeeToEdit.department)
          roleText =
            employeeToEdit.department.replace(" Team", "") + " Manager";

        setFormData({
          name: employeeToEdit.name || "",
          roleText: roleText,
          salary: employeeToEdit.salary || "",
          overheadPercent: employeeToEdit.overheadPercent || "",
          department: employeeToEdit.department || "Social Media Team",
          capacity: employeeToEdit.capacity || "",
        });
      } else {
        setFormData({
          name: "",
          roleText: "",
          salary: "",
          overheadPercent: "",
          department: "Social Media Team",
          capacity: "",
        });
      }
    }
  }, [isOpen, employeeToEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const salary = Number(formData.salary) || 0;
      const overheadPercent = Number(formData.overheadPercent) || 0;
      const capacity = Number(formData.capacity) || 0;

      let backendRole = "team";
      let backendDepartment = formData.department;

      const rt = formData.roleText.toLowerCase();
      if (rt.includes("partner") || rt.includes("admin")) {
        backendRole = "admin";
        backendDepartment = undefined;
      } else if (rt.includes("operation") || rt.includes("manager")) {
        if (rt.includes("operation")) {
          backendRole = "operationmanager";
          backendDepartment = undefined;
        }
      }

      const payload = {
        name: formData.name,
        role: backendRole,
        department: backendDepartment,
        salary,
        overheadPercent,
        capacity,
      };

      if (employeeToEdit) {
        await axiosInstance.put(`/users/${employeeToEdit._id}`, payload);
        toast.success("Employee updated successfully!");
      } else {
        const email =
          formData.name.replace(/\s+/g, "").toLowerCase() +
          Math.floor(Math.random() * 1000) +
          "@v-square.com";
        payload.email = email;
        payload.password = "Password123!";

        await axiosInstance.post("/users", payload);
        toast.success("Employee added successfully!");
      }

      onEmployeeAdded();
      onClose();
    } catch (err) {
      console.error("Error saving employee:", err.response?.data || err);
      toast.error(
        "Failed to save employee: " +
          (err.response?.data?.message || err.message),
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const departments = [
    "Social Media Team",
    "Website Team",
    "Designer Team",
    "Editor Team",
    "Scriptwriter Team",
    "Cameraman Team",
    "SEO Team",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px] p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
          <h2 className="text-slate-800 text-sm font-bold flex items-center gap-1.5">
            <span>👤</span> {employeeToEdit ? "Edit Employee" : "Add Employee"}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <FiX size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3 bg-white flex-1 overflow-y-auto space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 text-[10px] font-bold mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-slate-500 text-[10px] font-bold mb-1">
                Role / Designation
              </label>
              <input
                type="text"
                name="roleText"
                value={formData.roleText}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 text-[10px] font-bold mb-1">
                Monthly Salary (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                name="salary"
                value={formData.salary}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 placeholder:text-slate-400 font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-500 text-[10px] font-bold mb-1">
                Overhead %{" "}
                <span className="text-gray-400 text-[8px] font-normal">
                  (PF, ESI)
                </span>
              </label>
              <input
                type="number"
                name="overheadPercent"
                value={formData.overheadPercent}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 text-[10px] font-bold mb-1">
                Department
              </label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23475569%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.75rem_center] bg-[length:0.85em_0.85em] pr-8"
              >
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d.replace(" Team", "")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-500 text-[10px] font-bold mb-1">
                Max Clients (Capacity)
              </label>
              <input
                type="number"
                name="capacity"
                value={formData.capacity}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 placeholder:text-slate-400"
              />
            </div>
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
            disabled={!formData.name || loading}
            className="px-4 py-1.5 rounded-xl bg-[#7c5ff0] text-white font-bold hover:bg-[#6c4be0] disabled:opacity-50 transition-all text-xs shadow-sm"
          >
            {loading ? "Saving..." : "Save Employee"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddEmployeeModal;
