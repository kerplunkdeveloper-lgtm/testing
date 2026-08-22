import React, { useEffect, useState } from "react";
import { FiX, FiUsers, FiEye, FiEyeOff } from "react-icons/fi";


const UserModal = ({ openModal, setOpenModal, handleCreateUser, handleUpdateUser, editUser, setEditUser, users }) => {
  const [formData, setFormData] = useState({ name: "", email: "", location: "", password: "", role: "team", department: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isCustomDept, setIsCustomDept] = useState(false);
  const [isCustomLoc, setIsCustomLoc] = useState(false);

  const defaultDepts = [];
  const defaultLocs = [];

  const uniqueDepts = Array.from(
    new Set([
      ...defaultDepts,
      ...(users || [])
        .map((u) => u.department)
        .filter((dept) => typeof dept === "string" && dept.trim() !== ""),
    ]),
  ).sort();

  const uniqueLocs = Array.from(
    new Set([
      ...defaultLocs,
      ...(users || [])
        .map((u) => u.location)
        .filter((loc) => typeof loc === "string" && loc.trim() !== ""),
    ]),
  ).sort();

  useEffect(() => {
    if (openModal) {
      if (editUser) {
        setFormData({
          name: editUser.name || "",
          email: editUser.email || "",
          location: editUser.location || "",
          password: "",
          role: editUser.role || "team",
          department: editUser.department || "",
        });
        setIsCustomDept(false);
        setIsCustomLoc(false);
      } else {
        setFormData({
          name: "",
          email: "",
          location: "",
          password: "",
          role: "team",
          department: "",
        });
        setIsCustomDept(false);
        setIsCustomLoc(false);
      }
      setShowPassword(false);
    }
  }, [openModal, editUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editUser) {
      const { password, ...rest } = formData;
      const dataToSubmit = password ? formData : rest;
      handleUpdateUser(dataToSubmit);
    } else {
      handleCreateUser(formData);
    }
  };

  const handleClose = () => {
    setOpenModal(false); setEditUser(null);
    setFormData({ name: "", email: "", location: "", password: "", role: "team", department: "" });
    setShowPassword(false);
  };

  if (!openModal) return null;

  const INPUT = "w-full h-10 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition-all text-sm text-slate-700 leading-normal";
  const SELECT_INPUT = "w-full h-10 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition-all text-sm text-slate-700 leading-normal appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23475569%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.75rem_center] bg-[length:0.85em_0.85em] pr-8 cursor-pointer";
  const LABEL = "block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1";

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="bg-white w-full max-w-3xl rounded-2xl border border-gray-200 shadow-2xl overflow-hidden">

        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg dashboard-btn-primary flex items-center justify-center">
              <FiUsers size={13} className="text-white" />
            </div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-yellow-50">
              {editUser ? "Update User" : "Add New User"}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all"
          >
            <FiX size={14} />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          <div>
            <label className={LABEL}>Full Name <span className="normal-case text-red-600">*</span></label>
            <input type="text" name="name" required value={formData.name} onChange={handleChange} placeholder="Enter user name" className={INPUT} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Email <span className="normal-case text-red-600">*</span></label>
              <input type="email" name="email" required value={formData.email} onChange={handleChange} placeholder="Enter user email id" className={INPUT} />
            </div>

            <div>
              <label className={LABEL}>Location</label>
              {isCustomLoc ? (
                <div className="space-y-1">
                  <input 
                    type="text" 
                    name="location" 
                    value={formData.location} 
                    onChange={handleChange} 
                    placeholder="Enter custom location" 
                    className={INPUT} 
                  />
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsCustomLoc(false);
                      setFormData(p => ({ ...p, location: uniqueLocs[0] || "" }));
                    }} 
                    className="text-[9px] text-blue-500 hover:text-blue-600 font-extrabold tracking-wide uppercase transition-colors"
                  >
                    ← Choose from existing locations
                  </button>
                </div>
              ) : (
                <select
                  name="location"
                  value={formData.location}
                  onChange={(e) => {
                    if (e.target.value === "__custom__") {
                      setIsCustomLoc(true);
                      setFormData(p => ({ ...p, location: "" }));
                    } else {
                      handleChange(e);
                    }
                  }}
                  className={SELECT_INPUT}
                >
                  <option value="">Select Location</option>
                  {uniqueLocs.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                  <option value="__custom__" className="text-blue-600 font-extrabold bg-blue-50/50">+ Add Custom Location</option>
                </select>
              )}
            </div>
          </div>

          <div>
            <label className={LABEL}>Password {!editUser && <span className="normal-case text-red-600">*</span>} {editUser && <span className="normal-case text-gray-400">(leave blank to keep)</span>}</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                name="password" 
                required={!editUser}
                value={formData.password} 
                onChange={handleChange} 
                placeholder="Enter user password" 
                className={INPUT + " pr-10"} 
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Role <span className="normal-case text-red-600">*</span></label>
              <select name="role" value={formData.role} onChange={handleChange} className={SELECT_INPUT}>
                <option value="team">Team</option>
                <option value="admin">Admin</option>
                <option value="operationmanager">Op. Manager</option>
              </select>
            </div>

            <div>
              <label className={LABEL}>Department <span className="normal-case text-red-650">*</span></label>
              {isCustomDept ? (
                <div className="space-y-1">
                  <input 
                    type="text" 
                    name="department" 
                    value={formData.department} 
                    onChange={handleChange} 
                    required 
                    placeholder="Enter custom department" 
                    className={INPUT} 
                  />
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsCustomDept(false);
                      setFormData(p => ({ ...p, department: uniqueDepts[0] || "" }));
                    }} 
                    className="text-[9px] text-blue-500 hover:text-blue-600 font-extrabold tracking-wide uppercase transition-colors"
                  >
                    ← Choose from existing departments
                  </button>
                </div>
              ) : (
                <select
                  name="department"
                  value={formData.department}
                  onChange={(e) => {
                    if (e.target.value === "__custom__") {
                      setIsCustomDept(true);
                      setFormData(p => ({ ...p, department: "" }));
                    } else {
                      handleChange(e);
                    }
                  }}
                  required
                  className={SELECT_INPUT}
                >
                  <option value="" disabled>Select Department</option>
                  {uniqueDepts.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                  <option value="__custom__" className="text-blue-600 font-extrabold bg-blue-50/50">+ Add Custom Department</option>
                </select>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button type="button" onClick={handleClose} className="px-4 py-2 rounded-xl border border-gray-200 text-slate-600 font-semibold text-xs hover:bg-gray-50 transition-all">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl dashboard-btn-primary text-white font-bold text-xs shadow-sm  transition-all active:scale-95">
              {editUser ? "Update User" : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;