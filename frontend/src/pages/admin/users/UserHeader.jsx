import React from "react";
import { FiPlus, FiFilter } from "react-icons/fi";

const UserHeader = ({
  users,
  setOpenModal,
  searchTerm,
  setSearchTerm,
  filterDept,
  setFilterDept,
  isReadOnly,
}) => {
  const uniqueDepts = Array.from(
    new Set(
      (users || [])
        .map((u) => u.department)
        .filter((dept) => typeof dept === "string" && dept.trim() !== ""),
    ),
  ).sort();

  return (
    <div className="flex flex-col gap-3 mb-5">
      {/* TOP ROW */}

      {/* FILTER ROW */}
      <div className="flex flex-row items-center">
        {/* SEARCH */}
        <div className="flex items-center flex-1 transition-all ">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent outline-none text-xs text-gray-700 dark:text-slate-200 placeholder:text-gray-400 dark:placeholder:text-slate-500 w-full"
          />
        </div>

        {/* DEPT FILTER */}
        <div className="flex items-center gap-2 px-3 w-[150px] sm:w-60 shrink-0 transition-all ">
          <FiFilter
            size={12}
            className="text-gray-400 dark:text-slate-500 shrink-0"
          />
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="bg-transparent outline-none text-xs text-gray-700 dark:text-slate-200 w-full cursor-pointer appearance-none"
          >
            <option value="" className="bg-white dark:bg-slate-900">
              All Departments
            </option>
            {uniqueDepts.map((d) => (
              <option key={d} value={d} className="bg-white dark:bg-slate-900">
                {d}
              </option>
            ))}
          </select>
        </div>

        <div>
          {!isReadOnly && (
            <button
              onClick={() => setOpenModal(true)}
              className="bg-blue-600 dark:bg-[#3b82f6] text-white dark:text-black px-5 py-3 rounded-xl flex items-center justify-center gap-2.5 shadow-md shadow-blue-500/20 dark:shadow-[#3b82f6]/20  dark:hover:bg-[#ccff00] hover:-translate-y-0.5 hover:shadow-lg text-xs font-bold active:scale-95 transition-all cursor-pointer"
            >
              <FiPlus size={14} /> Add User
            </button>
          )}
        </div>
      </div>

      
    </div>
  );
};

export default UserHeader;
