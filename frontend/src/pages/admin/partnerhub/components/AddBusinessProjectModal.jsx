import React, { useState, useEffect } from "react";
import axiosInstance from "../../../../services/axiosInstance";
import { FiX } from "react-icons/fi";
import toast from "react-hot-toast";

const AddBusinessProjectModal = ({
  isOpen,
  onClose,
  onProjectAdded,
  projectToEdit,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    client: "",
    type: "Digital Marketing",
    status: "Active",
    revenue: "",
    duration: "Ongoing / Retainer",
    employees: [],
  });
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      fetchClients();
      if (projectToEdit) {
        setFormData({
          name: projectToEdit.name || "",
          client: projectToEdit.client?._id || projectToEdit.client || "",
          type: projectToEdit.type || "Digital Marketing",
          status: projectToEdit.status || "Active",
          revenue: projectToEdit.revenue || "",
          duration: projectToEdit.duration || "Ongoing / Retainer",
          employees: projectToEdit.employees
            ? projectToEdit.employees.map((e) => e._id || e)
            : [],
        });
      } else {
        setFormData({
          name: "",
          client: "",
          type: "Digital Marketing",
          status: "Active",
          revenue: "",
          duration: "Ongoing / Retainer",
          employees: [],
        });
      }
    }
  }, [isOpen, projectToEdit]);

  const fetchUsers = async () => {
    try {
      const res = await axiosInstance.get("/users");
      const userList = res.data.data || res.data;
      setUsers(Array.isArray(userList) ? userList : []);
    } catch (err) {
      console.error("Failed to fetch users", err);
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

  const handleEmployeeSelection = (e) => {
    const options = e.target.options;
    const selectedEmployees = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selectedEmployees.push(options[i].value);
      }
    }
    setFormData((prev) => ({ ...prev, employees: selectedEmployees }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      const selectedClientObj = clients.find(c => c._id === formData.client);
      const generatedName = selectedClientObj 
        ? `${selectedClientObj.companyName} - ${formData.type}` 
        : formData.type;

      // Calculate cost from selected employees
      const selectedEmployeesData = users.filter((user) =>
        formData.employees.includes(user._id)
      );
      
      const calculatedCost = selectedEmployeesData.reduce(
        (sum, emp) => {
          const salary = emp.salary || 0;
          const overhead = emp.overheadPercent || 0;
          const ctc = salary + (salary * overhead) / 100;
          return sum + ctc;
        },
        0
      );

      const dataToSubmit = {
        ...formData,
        name: generatedName,
        revenue: Number(formData.revenue) || 0,
        cost: calculatedCost,
      };

      if (projectToEdit) {
        await axiosInstance.put(
          `/business-projects/${projectToEdit._id}`,
          dataToSubmit,
        );
        toast.success("Project updated successfully!");
      } else {
        await axiosInstance.post("/business-projects", dataToSubmit);
        toast.success("Project added successfully!");
      }

      onProjectAdded();
      onClose();
    } catch (err) {
      console.error("Error saving project:", err.response?.data || err);
      toast.error(
        "Failed to save project: " +
          (err.response?.data?.message || err.message),
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;











const selectedEmployeesData = users.filter((user) =>
  formData.employees.includes(user._id)
);

const estimatedCost = selectedEmployeesData.reduce(
  (sum, emp) => {
    const salary = emp.salary || 0;

    const overhead =
      emp.overheadPercent || 0;

    const ctc =
      salary + (salary * overhead) / 100;

    return sum + ctc;
  },
  0
);

const estimatedProfit =
  Number(formData.revenue || 0) -
  estimatedCost;

const estimatedMargin =
  Number(formData.revenue || 0) > 0
    ? Math.round(
        (estimatedProfit /
          Number(formData.revenue)) *
          100
      )
    : 0;















  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px] p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
          <h2 className="text-slate-800 text-sm font-bold flex items-center gap-1.5">
            <span>📁</span>{" "}
            {projectToEdit ? "Edit" : "Add"} Business Project
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
          <div>
            <label className="block text-slate-500 text-[10px] font-bold mb-1">
              Client <span className="text-rose-500">*</span>
            </label>
            <select
              name="client"
              value={formData.client}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23475569%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.75rem_center] bg-[length:0.85em_0.85em] pr-8"
            >
              <option value="">Select a Client</option>
              {clients.map(client => (
                <option key={client._id} value={client._id}>
                  {client.companyName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 text-[10px] font-bold mb-1">
                Project Type <span className="text-rose-500">*</span>
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23475569%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.75rem_center] bg-[length:0.85em_0.85em] pr-8"
              >
                <option value="Digital Marketing">Digital Marketing</option>
                <option value="Website">Website</option>
                <option value="SEO">SEO</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-500 text-[10px] font-bold mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23475569%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.75rem_center] bg-[length:0.85em_0.85em] pr-8"
              >
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
                <option value="On Hold">On Hold</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 text-[10px] font-bold mb-1">
                Monthly Value (₹)
              </label>
              <input
                type="number"
                name="revenue"
                value={formData.revenue}
                onChange={handleChange}
                placeholder="e.g. 25000"
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 placeholder:text-slate-400 font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-500 text-[10px] font-bold mb-1">
                Project Duration
              </label>
              <select
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23475569%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.75rem_center] bg-[length:0.85em_0.85em] pr-8"
              >
                <option value="Ongoing / Retainer">Ongoing / Retainer</option>
                <option value="1 Month">1 Month</option>
                <option value="3 Months">3 Months</option>
                <option value="6 Months">6 Months</option>
                <option value="1 Year">1 Year</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-500 text-[10px] font-bold mb-1">
              Assign Employees
            </label>
            <select
              multiple
              name="employees"
              value={formData.employees}
              onChange={handleEmployeeSelection}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 h-20 text-slate-700 font-medium custom-scrollbar"
            >
              {users.map((user) => {
                let displayRole = "";
                if (user.role === "admin") {
                  displayRole = "Managing Partner";
                } else if (user.role === "operationmanager") {
                  displayRole = "Operations Manager";
                } else if (user.department) {
                  displayRole = user.department.replace(" Team", "");
                  if (displayRole.includes("Social Media"))
                    displayRole = "Social Media Manager";
                  else if (displayRole.includes("Designer"))
                    displayRole = "Designer";
                  else if (displayRole.includes("SEO"))
                    displayRole = "SEO Analyst";
                } else {
                  displayRole = user.role;
                }

                return (
                  <option key={user._id} value={user._id} className="py-0.5">
                    {user.name} {displayRole ? `— ${displayRole}` : ""}
                  </option>
                );
              })}
            </select>
            <p className="text-gray-400 text-[10px] mt-1 font-semibold">
              Hold Ctrl/Cmd to select multiple
            </p>
          </div>

        {/* Profit Preview */}
{Number(formData.revenue) > 0 && (
  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
    <div className="flex items-center justify-between">
      <span className="text-slate-800 font-bold text-xs">
        Profit Preview
      </span>

      <span
        className={`text-xs font-black ${
          estimatedProfit >= 0
            ? "text-emerald-600"
            : "text-rose-600"
        }`}
      >
        {estimatedMargin}% Margin
      </span>
    </div>

    <div className="grid grid-cols-3 gap-3 mt-3">
      <div className="bg-white rounded-xl border border-slate-100 p-2">
        <p className="text-[9px] text-slate-400 font-bold uppercase">
          Revenue
        </p>

        <p className="text-emerald-600 font-black text-xs mt-1">
          ₹
          {Number(
            formData.revenue
          ).toLocaleString("en-IN")}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 p-2">
        <p className="text-[9px] text-slate-400 font-bold uppercase">
          Cost
        </p>

        <p className="text-rose-600 font-black text-xs mt-1">
          ₹
          {estimatedCost.toLocaleString("en-IN")}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 p-2">
        <p className="text-[9px] text-slate-400 font-bold uppercase">
          Profit
        </p>

        <p
          className={`font-black text-xs mt-1 ${
            estimatedProfit >= 0
              ? "text-emerald-600"
              : "text-rose-600"
          }`}
        >
          ₹
          {estimatedProfit.toLocaleString(
            "en-IN"
          )}
        </p>
      </div>
    </div>
  </div>
)}
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
            disabled={!formData.client || !formData.type || loading}
            className="px-4 py-1.5 rounded-xl bg-[#7c5ff0] text-white font-bold hover:bg-[#6c4be0] disabled:opacity-50 transition-all text-xs shadow-sm"
          >
            {loading
              ? "Saving..."
              : projectToEdit
                ? "Save Changes"
                : "Add Project"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddBusinessProjectModal;
