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
  clearUserError,
} from "../../features/users/userSlice";

import { impersonateUser } from "../../features/auth/authSlice";

import UserHeader from "./users/UserHeader";
import UserTable from "./users/UserTable";
import UserModal from "./users/UserModel";
import DeleteUserModal from "./users/DeleteUserModal";
import PermissionsModal from "./users/PermissionsModal";

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
    useState(1);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [filterDept, setFilterDept] =
    useState("");

  const [openDeleteModal, setOpenDeleteModal] =
    useState(false);

  const [userToDelete, setUserToDelete] =
    useState(null);

  const [openPermissionsModal, setOpenPermissionsModal] = useState(false);
  const [permissionsUser, setPermissionsUser] = useState(null);



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
  }, [searchTerm, filterDept]);

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

  // FILTER & SORT LOGIC
  const filteredUsers = [...users]
    .filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = filterDept === "" || user.department === filterDept;
      return matchesSearch && matchesDept;
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
        isReadOnly={isReadOnly}
      />


     <div className="flex flex-wrap items-center justify-between gap-4 p-1 mt-[-10px]">

  <div className="flex flex-wrap items-center gap-3 text-sm">

    <div className="px-3 py-1">
      <span className="font-semibold">Department:</span>{" "}
      <span className="font-medium  italic">
        {filterDept || "All Departments"}
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