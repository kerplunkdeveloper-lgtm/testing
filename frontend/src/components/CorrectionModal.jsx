import React, { useState } from "react";
import { createPortal } from "react-dom";
import { FiEdit3, FiX, FiCheck, FiClock, FiUser, FiGitCommit } from "react-icons/fi";
import toast from "react-hot-toast";

const CorrectionModal = ({
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

  const currentRevision = (target?.revisions || 0) + 1;
  const history = target?.correctionHistory || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      return toast.error("Please enter a reason for requested corrections");
    }
    onSubmit(reason.trim());
    setReason("");
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#11131f] rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-amber-50/40 dark:bg-amber-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <FiEdit3 size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white">
                Request Corrections
              </h3>
              <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mt-0.5">
                Rework Request
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
          {/* Target Task info */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Specify changes required before approval:
              </p>
              <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] font-extrabold flex items-center gap-1">
                <FiGitCommit size={12} />
                Revision #{currentRevision}
              </span>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-800/40">
              <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">
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
                Correction Reason <span className="text-amber-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Fix button alignment, Change hero image, Update validation, Client requested footer changes..."
                className="w-full bg-slate-50 dark:bg-[#181822] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500 dark:focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/10 dark:focus:ring-amber-500/10 transition-all resize-none h-28"
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
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <FiCheck size={14} />
                Send Correction
              </button>
            </div>
          </form>

          {/* Previous History */}
          {history.length > 0 && (
            <div className="border-t border-slate-100 dark:border-white/5 pt-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                <FiClock className="text-slate-400" />
                Previous Revisions ({history.length})
              </h4>
              <div className="flex flex-col gap-2.5">
                {history
                  .slice()
                  .reverse()
                  .map((item, idx) => {
                    const userObj = users?.find(
                      (u) => u._id === (item.requestedBy?._id || item.requestedBy)
                    );
                    const userName =
                      item.requestedBy?.name || userObj?.name || "Manager";
                    return (
                      <div
                        key={idx}
                        className="bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-xl p-3"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                            Rev #{item.revision}
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <FiUser size={10} />
                            {userName}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                          "{item.reason}"
                        </p>
                        {item.requestedAt && (
                          <p className="text-[9px] text-slate-400 mt-1">
                            {new Date(item.requestedAt).toLocaleString()}
                          </p>
                        )}
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

export default CorrectionModal;
