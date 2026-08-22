import React from "react";
import { FiPlus, FiFilter } from "react-icons/fi";

const UserHeader = ({
  users,
  setOpenModal,
  searchTerm,
  setSearchTerm,
  filterDept,
  setFilterDept,
  filterLocation,
  setFilterLocation,
  filterRelieved,
  setFilterRelieved,
  isReadOnly,
}) => {
  const uniqueDepts = Array.from(
    new Set(
      (users || [])
        .map((u) => u.department)
        .filter((dept) => typeof dept === "string" && dept.trim() !== ""),
    ),
  ).sort();

  const uniqueLocs = Array.from(
    new Set(
      (users || [])
        .map((u) => u.location)
        .filter((loc) => typeof loc === "string" && loc.trim() !== ""),
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
            className="outline-none py-2  text-xs rounded-md  text-gray-700 dark:text-slate-200  w-full"
          />
        </div>

        {/* DEPT FILTER */}
        <div className="flex items-center gap-2 px-3 w-[150px] sm:w-[230px] shrink-0 transition-all border-l border-gray-200 dark:border-slate-700">
          <FiFilter
            size={12}
            className="text-gray-400 dark:text-slate-500 shrink-0"
          />
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="bg-transparent outline-none text-xs text-gray-700 dark:text-slate-200 w-full cursor-pointer appearance-none"
          >
            <option value="" className="">
              All Departments
            </option>
            {uniqueDepts.map((d) => (
              <option key={d} value={d} className="bg-white dark:bg-slate-900">
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* LOC FILTER */}
        <div className="flex items-center gap-2 px-3 w-[150px] sm:w-[200px] shrink-0 transition-all border-l border-gray-200 dark:border-slate-700">
          <FiFilter
            size={12}
            className="text-gray-400 dark:text-slate-500 shrink-0"
          />
          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="rounded-md outline-none text-xs text-gray-700 dark:text-slate-200 w-full cursor-pointer appearance-none"
          >
            <option value="" className="">
              All Locations
            </option>
            {uniqueLocs.map((l) => (
              <option key={l} value={l} className="bg-white dark:bg-slate-900">
                {l}
              </option>
            ))}
          </select>
        </div>

        {/* RELIEVED FILTER */}
        <div className="flex items-center gap-2 px-3 w-[140px] sm:w-[130px] shrink-0 transition-all border-l border-gray-200 dark:border-slate-700">
          <FiFilter
            size={12}
            className="text-gray-400 dark:text-slate-500 shrink-0"
          />
          <select
            value={filterRelieved}
            onChange={(e) => setFilterRelieved(e.target.value)}
            className="rounded-md outline-none text-xs text-gray-700 dark:text-slate-200 w-full cursor-pointer appearance-none"
          >
            <option value="active" className="bg-white dark:bg-slate-900">Active</option>
            <option value="relieved" className="bg-white dark:bg-slate-900">Relieved</option>
            <option value="all" className="bg-white dark:bg-slate-900">All</option>
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
