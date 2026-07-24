import React from "react";
import { FiAlertTriangle, FiX } from "react-icons/fi";

const DeleteUserModal = ({ open, setOpen, onConfirm, user }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="bg-white w-full max-w-sm rounded-2xl border border-gray-200 shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500">
              <FiAlertTriangle size={14} />
            </div>
            <h2 className="text-sm font-bold text-slate-800">Confirm Deletion</h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all"
          >
            <FiX size={14} />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-xs text-gray-500 leading-relaxed">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-slate-700">{user?.name}</span>?
            This action cannot be undone.
          </p>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            onClick={() => setOpen(false)}
            className="px-4 py-2 rounded-xl border border-gray-200 text-slate-600 font-semibold text-xs hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-sm shadow-rose-200 transition-all active:scale-95"
          >
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteUserModal;
