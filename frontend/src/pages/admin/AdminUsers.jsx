import React, {
  useEffect,
  useState,
} from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

import {
  useDispatch,
  useSelector,
} from "react-redux";

import toast from "react-hot-toast";

import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  relieveUser,
  reactivateUser,
  clearUserError,
} from "../../features/users/userSlice";

import { impersonateUser } from "../../features/auth/authSlice";

import UserHeader from "./users/UserHeader";
import UserTable from "./users/UserTable";
import UserModal from "./users/UserModel";
import DeleteUserModal from "./users/DeleteUserModal";
import PermissionsModal from "./users/PermissionsModal";
import RelieveUserModal from "./users/RelieveUserModal";

const USERS_PER_PAGE = 7;

const AdminUsers = () => {

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const {
    users,
    loading,
    error,
  } = useSelector(
    (state) => state.users
  );

  const { user } = useSelector(
    (state) => state.auth
  );

  const userPerms = user?.permissions?.['manage_users'];
  const canWrite = user?.role === "admin" || userPerms === true || userPerms?.write;
  const isReadOnly = !canWrite;

  const [openModal, setOpenModal] =
    useState(false);

  const [editUser, setEditUser] =
    useState(null);

  const [currentPage, setCurrentPage] =
    useState(() => parseInt(localStorage.getItem("adminUsers_currentPage")) || 1);

  const [searchTerm, setSearchTerm] =
    useState(() => localStorage.getItem("adminUsers_searchTerm") || "");

  const [filterDept, setFilterDept] =
    useState(() => localStorage.getItem("adminUsers_filterDept") || "");

  const [filterLocation, setFilterLocation] = useState(() => localStorage.getItem("adminUsers_filterLocation") || "");
  const [filterRelieved, setFilterRelieved] = useState(() => localStorage.getItem("adminUsers_filterRelieved") || "active");

  useEffect(() => {
    localStorage.setItem("adminUsers_currentPage", currentPage);
    localStorage.setItem("adminUsers_searchTerm", searchTerm);
    localStorage.setItem("adminUsers_filterDept", filterDept);
    localStorage.setItem("adminUsers_filterLocation", filterLocation);
    localStorage.setItem("adminUsers_filterRelieved", filterRelieved);
  }, [currentPage, searchTerm, filterDept, filterLocation, filterRelieved]);

  const [openDeleteModal, setOpenDeleteModal] =
    useState(false);

  const [userToDelete, setUserToDelete] =
    useState(null);

  const [openPermissionsModal, setOpenPermissionsModal] = useState(false);
  const [permissionsUser, setPermissionsUser] = useState(null);

  const [openRelieveModal, setOpenRelieveModal] = useState(false);
  const [relieveTargetUser, setRelieveTargetUser] = useState(null);
  const [relieveMode, setRelieveMode] = useState("relieve");
  const [relieveLoading, setRelieveLoading] = useState(false);



  // GET USERS
  useEffect(() => {

    dispatch(getUsers());

  }, [dispatch]);

  // ERROR
  useEffect(() => {

    if (error) {

      toast.error(error);

      dispatch(clearUserError());

    }

  }, [error, dispatch]);

  // RESET PAGE ON FILTER
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterDept, filterLocation, filterRelieved]);

  // CREATE USER
  const handleCreateUser = async (
    userData
  ) => {
    try {
      await dispatch(
        createUser(userData)
      ).unwrap();

      toast.success(
        "User Created Successfully"
      );

      setOpenModal(false);
    } catch (err) {
      // Handled by global state error listener
    }
  };

  const handleUpdateUser = async (
    userData
  ) => {
    try {
      const targetId = editUser?._id || permissionsUser?._id;
      if (!targetId) return;

      await dispatch(
        updateUser({
          id: targetId,
          userData,
        })
      ).unwrap();

      toast.success(
        "User Updated Successfully"
      );

      setOpenModal(false);
      setEditUser(null);
      setOpenPermissionsModal(false);
      setPermissionsUser(null);
    } catch (err) {
      // Handled by global state error listener
    }
  };

  // REQUEST DELETE (OPEN MODAL)
  const requestDeleteUser = (user) => {
    setUserToDelete(user);
    setOpenDeleteModal(true);
  };

  // DELETE USER (FINAL CONFIRMATION)
  const handleDeleteUser = async () => {
    try {
      await dispatch(
        deleteUser(userToDelete._id)
      ).unwrap();

      toast.success(
        "User Deleted Successfully"
      );

      setOpenDeleteModal(false);
      setUserToDelete(null);
    } catch (err) {
      // Handled by global state error listener
    }
  };

  // IMPERSONATE USER
  const handleImpersonate = async (userId) => {
    try {
      const result = await dispatch(impersonateUser(userId)).unwrap();
      toast.success("Successfully logged in as user");
      const targetRole = result.data.user.role;
      if (targetRole === "admin") {
        navigate("/admin");
      } else if (targetRole === "operationmanager") {
        navigate("/operationmanager");
      } else if (targetRole === "team") {
        navigate("/team");
      }
    } catch (err) {
      toast.error(err || "Failed to impersonate");
    }
  };

  // RELIEVE USER MODAL TRIGGER
  const handleRequestRelieve = (user) => {
    setRelieveTargetUser(user);
    setRelieveMode("relieve");
    setOpenRelieveModal(true);
  };

  // REACTIVATE USER MODAL TRIGGER
  const handleRequestReactivate = (user) => {
    setRelieveTargetUser(user);
    setRelieveMode("reactivate");
    setOpenRelieveModal(true);
  };

  // CONFIRM RELIEVE / REACTIVATE
  const handleConfirmRelieve = async (user, reason) => {
    setRelieveLoading(true);
    try {
      if (relieveMode === "relieve") {
        await dispatch(relieveUser({ id: user._id, reason })).unwrap();
        toast.success("User has been successfully relieved.");
      } else {
        await dispatch(reactivateUser(user._id)).unwrap();
        toast.success("User has been successfully reactivated.");
      }
      setOpenRelieveModal(false);
      setRelieveTargetUser(null);
    } catch (err) {
      toast.error(err || "Action failed");
    } finally {
      setRelieveLoading(false);
    }
  };

  // FILTER & SORT LOGIC
  const filteredUsers = [...users]
    .filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.location && user.location.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesDept = filterDept === "" || user.department === filterDept;
      const matchesLoc = filterLocation === "" || user.location === filterLocation;
      
      let matchesRelieved = true;
      const isRelieved = user.employmentStatus === "relieved" || user.accountStatus === "inactive";
      if (filterRelieved === "active") matchesRelieved = !isRelieved;
      else if (filterRelieved === "relieved") matchesRelieved = isRelieved;

      return matchesSearch && matchesDept && matchesLoc && matchesRelieved;
    })
    .sort((a, b) => {
      if (a.role === 'admin' && b.role !== 'admin') return -1;
      if (b.role === 'admin' && a.role !== 'admin') return 1;

      if (a.role === 'operationmanager' && b.role !== 'operationmanager') return -1;
      if (b.role === 'operationmanager' && a.role !== 'operationmanager') return 1;

      const isASocial = a.department?.toLowerCase()?.includes('social media');
      const isBSocial = b.department?.toLowerCase()?.includes('social media');
      
      if (isASocial && !isBSocial) return -1;
      if (isBSocial && !isASocial) return 1;

      const deptA = a.department || "ZZZ";
      const deptB = b.department || "ZZZ";
      
      if (deptA !== deptB) {
         return deptA.localeCompare(deptB);
      }
      
      return a.name.localeCompare(b.name);
    });

  // PAGINATION
  const totalPages = Math.ceil(
    filteredUsers.length / USERS_PER_PAGE
  );

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    } else if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const startIndex =
    (currentPage - 1) *
    USERS_PER_PAGE;

  const currentUsers =
    filteredUsers.slice(
      startIndex,
      startIndex + USERS_PER_PAGE
    );

  // COUNT DETAILS
  const totalEntries = filteredUsers.length;
  const startEntry = totalEntries === 0 ? 0 : startIndex + 1;
  const endEntry = Math.min(startIndex + USERS_PER_PAGE, totalEntries);

  return (
    <div className="w-full">

      {/* HEADER */}
      <UserHeader
        users={users}
        setOpenModal={setOpenModal}
        setEditUser={setEditUser}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterDept={filterDept}
        setFilterDept={setFilterDept}
        filterLocation={filterLocation}
        setFilterLocation={setFilterLocation}
        filterRelieved={filterRelieved}
        setFilterRelieved={setFilterRelieved}
        isReadOnly={isReadOnly}
      />


     <div className="flex flex-wrap items-center justify-between gap-4 p-1 mt-[-10px]">

  <div className="flex flex-wrap items-center gap-3 text-sm">

    <div className="px-3 py-1">
      <span className="font-semibold">Department:</span>{" "}
      <span className="font-light">
        {filterDept || "All Departments"}
      </span>
    </div>

    <div className="px-3 py-1">
      <span className="font-semibold">Location:</span>{" "}
      <span className="font-light ">
        {filterLocation || "All Locations"}
      </span>
    </div>

    <div className="px-3 py-1">
      <span className="font-semibold">Status:</span>{" "}
      <span className="font-light ">
        {filterRelieved === "all" ? "All Users" : filterRelieved === "active" ? "Active Users" : "Relieved Users"}
      </span>
    </div>

    {searchTerm && (
      <div className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
        🔍 <span className="italic">{searchTerm}</span>
      </div>
    )}

  </div>

  

</div>

      <UserTable
        users={currentUsers}
        loading={loading}
        handleDeleteUser={
          requestDeleteUser
        }
        handleRequestRelieve={handleRequestRelieve}
        handleRequestReactivate={handleRequestReactivate}
        setOpenModal={setOpenModal}
        setEditUser={setEditUser}
        handleImpersonate={handleImpersonate}
        isReadOnly={isReadOnly}
        setOpenPermissionsModal={setOpenPermissionsModal}
        setPermissionsUser={setPermissionsUser}
      />

      {/* PAGINATION & COUNT */}
      {totalEntries > 0 && (
        <div className="mt-2 flex flex-col md:flex-row items-center justify-between gap-6 px-2">
          {/* Count Details */}
          <p className="theme-text-secondary text-[13px] font-medium order-2 md:order-1">
            Showing <span className="theme-text-primary font-semibold">{startEntry}</span> to{" "}
            <span className="theme-text-primary font-semibold">{endEntry}</span> of{" "}
            <span className="theme-text-primary font-semibold">{totalEntries}</span> entries
          </p>

          {/* Pagination Buttons */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5 order-1 md:order-2 overflow-x-auto pb-1 md:pb-0 w-full md:w-auto justify-center">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <FiChevronLeft size={14} />
              </button>
              
              {[...Array(totalPages)].map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPage(index + 1)}
                  className={`
                    w-7 h-7
                    rounded-lg
                    font-semibold
                    text-xs
                    transition-all
                    flex-shrink-0
                    ${
                      currentPage === index + 1
                        ? "dashboard-btn-primary shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }
                  `}
                >
                  {index + 1}
                </button>
              ))}

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <FiChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODAL */}
      <UserModal
        openModal={openModal}
        setOpenModal={setOpenModal}
        handleCreateUser={
          handleCreateUser
        }
        handleUpdateUser={
          handleUpdateUser
        }
        editUser={editUser}
        setEditUser={setEditUser}
        users={users}
      />

      {/* DELETE MODAL */}
      <DeleteUserModal
        open={openDeleteModal}
        setOpen={setOpenDeleteModal}
        onConfirm={handleDeleteUser}
        user={userToDelete}
      />

      {/* RELIEVE / REACTIVATE MODAL */}
      <RelieveUserModal
        open={openRelieveModal}
        setOpen={setOpenRelieveModal}
        onConfirm={handleConfirmRelieve}
        user={relieveTargetUser}
        mode={relieveMode}
        loading={relieveLoading}
      />

      {/* PERMISSIONS MODAL */}
      <PermissionsModal 
        open={openPermissionsModal}
        setOpen={setOpenPermissionsModal}
        user={permissionsUser}
        handleUpdateUser={(permissions) => handleUpdateUser({ permissions })}
      />

    </div>
  );
};

export default AdminUsers;