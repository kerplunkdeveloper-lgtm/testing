import React, { useState } from "react";

export const BlockTaskModal = ({ isOpen, onClose, onSubmit }) => {
  const [reason, setReason] = useState("Waiting for Client Content");
  const [blockedBy, setBlockedBy] = useState("");
  const [comment, setComment] = useState("");
  
  const reasons = [
    "Waiting for Client Content",
    "Waiting for Approval",
    "Waiting for Asset",
    "Blocked by Another Task",
    "Technical Issue",
    "Other"
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      status: "Blocked",
      reason,
      blockedBy,
      comment
    });
    setReason("Waiting for Client Content");
    setBlockedBy("");
    setComment("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            Block Task
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
              Reason
            </label>
            <div className="space-y-2">
              {reasons.map((r) => (
                <label key={r} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="blockReason"
                    value={r}
                    checked={reason === r}
                    onChange={(e) => setReason(e.target.value)}
                    className="text-red-500 focus:ring-red-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{r}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
              Blocked By
            </label>
            <input
              type="text"
              value={blockedBy}
              onChange={(e) => setBlockedBy(e.target.value)}
              placeholder="Client / Task / Person"
              className="w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
              Comment
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g. Logo has not been provided"
              className="w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none min-h-[80px]"
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg shadow-sm transition-colors"
            >
              Block
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
