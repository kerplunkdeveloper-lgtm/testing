import React, { useState } from "react";
import { FiUserX, FiUserCheck, FiX, FiCheckCircle, FiShield } from "react-icons/fi";

const RelieveUserModal = ({ open, setOpen, onConfirm, user, mode = "relieve", loading = false }) => {
  const [reason, setReason] = useState("");

  if (!open || !user) return null;

  const isRelieve = mode === "relieve";

  const handleConfirm = () => {
    onConfirm(user, reason);
  };

  return (
    <div
      className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-white dark:bg-[#111827] w-full max-w-md rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden transition-all relative z-[100000]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isRelieve
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  : "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {isRelieve ? <FiUserX size={16} /> : <FiUserCheck size={16} />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {isRelieve ? "Relieve User" : "Reactivate User"}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {user.name} ({user.email})
              </p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            disabled={loading}
            className="w-7 h-7 rounded-lg border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all cursor-pointer"
          >
            <FiX size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-3.5 text-left">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            {isRelieve ? (
              <>
                Are you sure you want to relieve{" "}
                <span className="font-bold text-slate-900 dark:text-white">{user.name}</span>?
              </>
            ) : (
              <>
                Are you sure you want to reactivate{" "}
                <span className="font-bold text-slate-900 dark:text-white">{user.name}</span>?
              </>
            )}
          </p>

          {isRelieve ? (
            <>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-white/5 space-y-2">
                <p className="text-[11.5px] font-bold text-slate-700 dark:text-slate-300">
                  This will:
                </p>
                <ul className="text-[11.5px] text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside">
                  <li>Disable login access</li>
                  <li>End active sessions immediately</li>
                  <li>Stop future work access</li>
                  <li>Stop work notifications</li>
                </ul>
              </div>

              {/* Reason optional field */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Relieve Reason (Optional)
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Resigned, End of Contract, Career Transition"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-600"
                />
              </div>

              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 text-[11px] text-indigo-700 dark:text-indigo-300">
                <FiCheckCircle size={14} className="shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400" />
                <span>
                  Existing tasks, reports, messages and history will be preserved.
                </span>
              </div>
            </>
          ) : (
            <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30 text-[11.5px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
              The user will be restored to <strong>Active</strong> status and will be able to log in and access the application according to their assigned role and permissions.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-end gap-2.5 bg-slate-50/50 dark:bg-slate-900/30">
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={loading}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-xl font-bold text-xs text-white transition-all shadow-sm active:scale-95 cursor-pointer flex items-center gap-1.5 ${
              isRelieve
                ? "bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 shadow-slate-900/20"
                : "bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 shadow-emerald-500/20"
            }`}
          >
            {loading && (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {isRelieve ? "Relieve User" : "Reactivate User"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RelieveUserModal;
