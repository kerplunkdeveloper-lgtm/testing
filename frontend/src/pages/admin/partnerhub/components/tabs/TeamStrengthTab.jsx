import React, { useState, useEffect } from "react";
import axiosInstance from "../../../../../services/axiosInstance";
import {
  FiEdit2,
  FiPlus,
  FiTrash2,
  FiUsers,
  FiDollarSign,
  FiPercent,
  FiTrendingUp,
} from "react-icons/fi";
import toast from "react-hot-toast";
import AddEmployeeModal from "../AddEmployeeModal";
import DeleteConfirmationModal from "../DeleteConfirmationModal";

const formatINR = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN")}`;

const TeamStrengthTab = () => {
  const [team, setTeam] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [usersRes, projectsRes] = await Promise.all([
        axiosInstance.get("/users"),
        axiosInstance.get("/business-projects"),
      ]);

      const userList = usersRes.data.data || usersRes.data;
      const projectList = projectsRes.data.data || [];

      setTeam(Array.isArray(userList) ? userList : []);
      setProjects(projectList);
    } catch (err) {
      console.error("Failed to fetch team data", err);
    } finally {
      setLoading(false);
    }
  };

  const getDisplayRole = (user) => {
    if (user.role === "admin") return "Managing Partner";

    if (user.role === "operationmanager") {
      return "Operations Manager";
    }

    if (user.department) {
      let dept = user.department.replace(" Team", "");

      if (dept.includes("Social Media")) {
        return "Social Media Manager";
      }

      if (dept.includes("Designer")) {
        return "Designer";
      }

      if (dept.includes("SEO")) {
        return "SEO Specialist";
      }

      if (
        dept.includes("Editor") ||
        dept.includes("Cameraman") ||
        dept.includes("Scriptwriter")
      ) {
        return "Video Production";
      }

      return dept;
    }

    return user.role;
  };

  const openAddModal = () => {
    setEmployeeToEdit(null);
    setIsModalOpen(true);
  };

  const openEditModal = (employee) => {
    setEmployeeToEdit(employee);
    setIsModalOpen(true);
  };

  const confirmDelete = (employee) => {
    setEmployeeToDelete(employee);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!employeeToDelete) return;

    try {
      await axiosInstance.delete(
        `/users/${employeeToDelete._id}`
      );

      toast.success("Employee deleted successfully");

      fetchData();
    } catch (err) {
      console.error("Failed to delete employee", err);

      toast.error("Failed to delete employee");
    } finally {
      setEmployeeToDelete(null);
    }
  };

  const totalTeamStrength = team.length;

  const totalSalary = team.reduce((sum, member) => {
    return sum + (member.salary || 0);
  }, 0);



  // TOTAL CTC
  const totalCtcSum = team.reduce((sum, member) => {
    const salary = member.salary || 0;

    const overhead = member.overheadPercent || 0;

    const ctc =
      salary > 0
        ? salary + (salary * overhead) / 100
        : 0;

    return sum + ctc;
  }, 0);



 const salariedEmployees = team.filter(
  (member) => member.role !== "admin"
).length;



const avgSalary =
  salariedEmployees > 0
    ? Math.round(totalCtcSum / salariedEmployees)
    : 0;

  const totalRevenue = projects.reduce((sum, proj) => {
    return sum + (proj.revenue || 0);
  }, 0);

  const revenuePerEmployee =
    totalTeamStrength > 0
      ? Math.round(totalRevenue / totalTeamStrength)
      : 0;





  let totalProjectsSum = 0;
  let totalRevShareSum = 0;

  return (
    <div className="animate-fadeIn space-y-4">
      {/* TOP METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* TEAM STRENGTH */}
        <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/70 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-100/80 dark:border-blue-900/30 rounded-2xl p-3.5 relative overflow-hidden shadow-sm hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-blue-500/80 dark:bg-blue-400/80" />

          <div className="flex items-center justify-between mb-1">
            <h4 className="text-slate-400 dark:text-slate-400 text-[9px] font-bold uppercase tracking-wider">
              Team Strength
            </h4>

            <FiUsers
              size={12}
              className="text-blue-500 dark:text-blue-400"
            />
          </div>

          <h2 className="text-slate-900 dark:text-white text-xl font-extrabold metric-card-value">
            {totalTeamStrength}
          </h2>

          <p className="text-slate-500 dark:text-slate-400 text-[10px] mt-0.5">
            Active employees
          </p>
        </div>

        {/* SALARY BILL */}
        <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/70 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-100/80 dark:border-emerald-900/30 rounded-2xl p-3.5 relative overflow-hidden shadow-sm hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-emerald-500/80 dark:bg-emerald-400/80" />

          <div className="flex items-center justify-between mb-1">
            <h4 className="text-slate-400 dark:text-slate-400 text-[9px] font-bold uppercase tracking-wider">
              Salary Bill
            </h4>

            <FiDollarSign
              size={12}
              className="text-emerald-500 dark:text-emerald-400"
            />
          </div>

          <h2 className="text-slate-900 dark:text-white text-xl font-extrabold metric-card-value">
            {formatINR(totalCtcSum)}
          </h2>

          <p className="text-slate-500 dark:text-slate-400 text-[10px] mt-0.5">
            CTC per month
          </p>
        </div>

        {/* AVG SALARY */}
        <div className="bg-gradient-to-br from-amber-50/70 to-orange-50/70 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-100/80 dark:border-amber-900/30 rounded-2xl p-3.5 relative overflow-hidden shadow-sm hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-amber-500/80 dark:bg-amber-400/80" />

          <div className="flex items-center justify-between mb-1">
            <h4 className="text-slate-400 dark:text-slate-400 text-[9px] font-bold uppercase tracking-wider">
              Avg Salary
            </h4>

            <FiPercent
              size={12}
              className="text-amber-500 dark:text-amber-400"
            />
          </div>

          <h2 className="text-slate-900 dark:text-white text-xl font-extrabold metric-card-value">
            {formatINR(avgSalary)}
          </h2>

          <p className="text-slate-500 dark:text-slate-400 text-[10px] mt-0.5">
            Per employee
          </p>
        </div>

        {/* REVENUE SHARE */}
        <div className="bg-gradient-to-br from-purple-50/70 to-violet-50/70 dark:from-purple-950/40 dark:to-violet-950/40 border border-purple-100/80 dark:border-purple-900/30 rounded-2xl p-3.5 relative overflow-hidden shadow-sm hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-purple-500/80 dark:bg-purple-400/80" />

          <div className="flex items-center justify-between mb-1">
            <h4 className="text-slate-400 dark:text-slate-400 text-[9px] font-bold uppercase tracking-wider">
              Revenue Share
            </h4>

            <FiTrendingUp
              size={12}
              className="text-purple-500 dark:text-purple-400"
            />
          </div>

          <h2 className="text-slate-900 dark:text-white text-xl font-extrabold metric-card-value">
            {formatINR(revenuePerEmployee)}
          </h2>

          <p className="text-slate-500 dark:text-slate-400 text-[10px] mt-0.5">
            Per employee
          </p>
        </div>
      </div>

      {/* TABLE */}
      <div className="theme-bg-card rounded-2xl shadow-sm border theme-border overflow-hidden">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-center px-4 py-3 gap-2 border-b theme-border">
          <div>
            <h3 className="theme-text-primary font-bold text-sm">
              Employee Allocations
            </h3>

            <p className="text-[10px] theme-text-secondary">
              Monthly salaries, overheads &
              rev-shares
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="w-full sm:w-auto bg-[#7c5ff0] hover:bg-[#6c4be0] text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1 active:scale-95 shrink-0"
          >
            <FiPlus size={14} />
            Add Employee
          </button>
        </div>

        {/* TABLE CONTENT */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs whitespace-nowrap min-w-[800px]">
            <thead>
              <tr className="theme-bg-main border-b theme-border">
                <th className="text-left font-bold text-[9px] theme-text-secondary tracking-wider py-2 px-4 uppercase">
                  Employee
                </th>

                <th className="text-left font-bold text-[9px] theme-text-secondary tracking-wider py-2 px-3 uppercase">
                  Salary
                </th>

                <th className="text-left font-bold text-[9px] theme-text-secondary tracking-wider py-2 px-3 uppercase">
                  Overhead%
                </th>

                <th className="text-left font-bold text-[9px] theme-text-secondary tracking-wider py-2 px-3 uppercase">
                  CTC/Month
                </th>

                <th className="text-left font-bold text-[9px] theme-text-secondary tracking-wider py-2 px-3 uppercase">
                  Capacity
                </th>

                <th className="text-left font-bold text-[9px] theme-text-secondary tracking-wider py-2 px-3 uppercase">
                  Projects
                </th>

                <th className="text-left font-bold text-[9px] theme-text-secondary tracking-wider py-2 px-3 uppercase">
                  Rev Share
                </th>

                <th className="py-2 px-3 w-16"></th>
              </tr>
            </thead>

            <tbody className="divide-y theme-border">
              {loading ? (
                <tr>
                  <td
                    colSpan="8"
                    className="text-center py-8 theme-text-secondary font-medium"
                  >
                    Loading data...
                  </td>
                </tr>
              ) : (
                [...team]
                  .sort((a, b) => {
                    const getPriority = (user) => {
                      if (user.role === "admin")
                        return 1;

                      if (
                        user.role ===
                        "operationmanager"
                      )
                        return 2;

                      return 3;
                    };

                    return (
                      getPriority(a) -
                      getPriority(b)
                    );
                  })
                  .map((member) => {
                    const salary =
                      member.salary || 0;

                    const overhead =
                      member.overheadPercent ||
                      0;

                    const ctc =
                      salary > 0
                        ? salary +
                          (salary *
                            overhead) /
                            100
                        : 0;

                    const displayRole =
                      getDisplayRole(member);

                    const isPartner =
                      member.role ===
                      "admin";

                    const userProjects =
                      projects.filter(
                        (p) =>
                          p.employees &&
                          p.employees.some(
                            (e) =>
                              e._id ===
                                member._id ||
                              e === member._id
                          )
                      );

                    const activeProjectsCount =
                      userProjects.length;

                    totalProjectsSum +=
                      activeProjectsCount;

                    let revShare = 0;

                    userProjects.forEach(
                      (p) => {
                        const empCount =
                          p.employees
                            ? p.employees
                                .length
                            : 1;

                        revShare +=
                          (p.revenue || 0) /
                          empCount;
                      }
                    );

                    totalRevShareSum +=
                      revShare;

                    const avatarColor =
                      isPartner
                        ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
                        : displayRole.includes("Operation")
                        ? "bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400"
                        : displayRole.includes("Social")
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                        : displayRole.includes("Design")
                        ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
                        : "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400";

                    return (
                      <tr
                        key={member._id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group"
                      >
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${avatarColor}`}
                            >
                              {member.name
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div className="flex flex-col min-w-0">
                              <span className="text-slate-800 dark:text-white font-bold text-xs truncate max-w-[140px]">
                                {member.name}
                              </span>

                              <span className="text-gray-400 dark:text-gray-400 text-[10px] truncate max-w-[140px]">
                                {displayRole}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-200">
                          {isPartner
                            ? "Partner"
                            : formatINR(
                                salary
                              )}
                        </td>

                        <td className="py-2.5 px-3 font-bold text-amber-600 dark:text-amber-500">
                          {overhead}%
                        </td>

                        <td className="py-2.5 px-3 font-bold text-rose-600 dark:text-rose-500">
                          {isPartner ||
                          ctc === 0
                            ? "—"
                            : formatINR(
                                ctc
                              )}
                        </td>

                        <td className="py-2.5 px-3 font-semibold text-slate-500 dark:text-slate-400">
                          {member.capacity ||
                            0}{" "}
                          clients
                        </td>

                        <td className="py-2.5 px-3 font-semibold text-blue-500 dark:text-blue-400">
                          {
                            activeProjectsCount
                          }{" "}
                          active
                        </td>

                        <td className="py-2.5 px-3 font-bold text-emerald-600 dark:text-emerald-500">
                          {isPartner ||
                          revShare === 0
                            ? "—"
                            : formatINR(
                                Math.round(
                                  revShare
                                )
                              )}
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() =>
                                openEditModal(
                                  member
                                )
                              }
                              className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-amber-500 bg-amber-50/20 dark:bg-amber-500/10 hover:bg-amber-50 dark:hover:bg-amber-500/20 hover:border-amber-200 dark:hover:border-amber-500/30 transition-all"
                            >
                              <FiEdit2
                                size={11}
                              />
                            </button>

                            <button
                              onClick={() =>
                                confirmDelete(
                                  member
                                )
                              }
                              className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-rose-500 bg-rose-50/20 dark:bg-rose-500/10 hover:bg-rose-50 dark:hover:bg-rose-500/20 hover:border-rose-200 dark:hover:border-rose-500/30 transition-all"
                            >
                              <FiTrash2
                                size={11}
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>

            {/* FOOTER */}
            {!loading && (
              <tfoot className="bg-slate-50/50 dark:bg-slate-800/10">
                <tr className="font-extrabold text-slate-800 dark:text-slate-100 text-xs border-t border-slate-100 dark:border-slate-800">
                  <td className="py-3 px-4 uppercase tracking-wider">
                    Total
                  </td>

                  <td className="py-3 px-3 text-amber-600 dark:text-amber-500">
                    {formatINR(totalSalary)}
                  </td>

                  <td className="py-3 px-3"></td>

                  <td className="py-3 px-3 text-rose-600 dark:text-rose-500">
                    {formatINR(totalCtcSum)}
                  </td>

                  <td className="py-3 px-3"></td>

                  <td className="py-3 px-3 text-blue-600 dark:text-blue-500">
                    {totalProjectsSum}
                  </td>

                  <td className="py-3 px-3 text-emerald-600 dark:text-emerald-500">
                    {formatINR(
                      Math.round(
                        totalRevShareSum
                      )
                    )}
                  </td>

                  <td className="py-3 px-3"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <AddEmployeeModal
        isOpen={isModalOpen}
        onClose={() =>
          setIsModalOpen(false)
        }
        onEmployeeAdded={fetchData}
        employeeToEdit={employeeToEdit}
      />

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() =>
          setDeleteModalOpen(false)
        }
        onConfirm={handleDelete}
        itemName={employeeToDelete?.name}
      />
    </div>
  );
};

export default TeamStrengthTab;