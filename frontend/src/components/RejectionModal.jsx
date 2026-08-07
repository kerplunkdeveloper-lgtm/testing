import React, { useState } from "react";
import { createPortal } from "react-dom";
import { FiAlertTriangle, FiX, FiCheck, FiClock, FiUser } from "react-icons/fi";
import toast from "react-hot-toast";

const RejectionModal = ({
  isOpen,
  onClose,
  onSubmit,
  task,
  subtaskId = null,
  users = [],
}) => {
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  const target = subtaskId
    ? task?.subtasks?.find((s) => s._id === subtaskId)
    : task;
  const history = target?.rejectionHistory || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      return toast.error("Please enter a reason for rejection");
    }
    onSubmit(reason.trim());
    setReason("");
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#11131f] rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-rose-50/40 dark:bg-rose-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <FiAlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white">
                Reject Task
              </h3>
              <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest mt-0.5">
                Permanent Closure
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-5">
          {/* Warning Banner & Task info */}
          <div>
            <div className="p-3 mb-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center gap-2.5 text-xs font-semibold">
              <FiAlertTriangle className="shrink-0 text-base" />
              <span>This action permanently closes the task.</span>
            </div>

            <div className="px-3.5 py-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-800/40">
              <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-1">
                Task Name
              </p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug break-words">
                {target?.title || "Untitled Task"}
              </p>
            </div>
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Rejection Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Client cancelled campaign, Duplicate task, Wrong requirement, Task no longer required..."
                className="w-full bg-slate-50 dark:bg-[#181822] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-500 dark:focus:border-rose-500/50 focus:ring-4 focus:ring-rose-500/10 dark:focus:ring-rose-500/10 transition-all resize-none h-28"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <button
                type="button"
                onClick={onClose}
                className="px-4.5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 text-white shadow-md shadow-rose-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <FiCheck size={14} />
                Reject Task
              </button>
            </div>
          </form>

          {/* History */}
          {history.length > 0 && (
            <div className="border-t border-slate-100 dark:border-white/5 pt-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                <FiClock className="text-slate-400" />
                Previous Rejections ({history.length})
              </h4>
              <div className="flex flex-col gap-2.5">
                {history
                  .slice()
                  .reverse()
                  .map((item, idx) => {
                    const userObj = users?.find(
                      (u) => u._id === (item.rejectedBy?._id || item.rejectedBy)
                    );
                    const userName =
                      item.rejectedBy?.name || userObj?.name || "Unknown User";
                    return (
                      <div
                        key={idx}
                        className="bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-xl p-3"
                      >
                        <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                          "{item.reason}"
                        </p>
                        <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400 font-medium">
                          <span className="flex items-center gap-1">
                            <FiUser size={10} />
                            {userName}
                          </span>
                          {item.rejectedAt && (
                            <span>{new Date(item.rejectedAt).toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default RejectionModal;
