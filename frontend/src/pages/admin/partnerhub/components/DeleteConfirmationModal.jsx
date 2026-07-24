import React from 'react';
import { FiAlertTriangle } from 'react-icons/fi';

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, itemName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px] p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden flex flex-col border border-slate-200">
        
        <div className="p-4 flex flex-col items-center text-center">
          <div className="w-9 h-9 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center mb-2.5">
            <FiAlertTriangle size={18} />
          </div>
          
          <h2 className="text-sm font-bold text-slate-800 mb-1">Delete Item?</h2>
          <p className="text-slate-400 text-xs mb-4">
            Are you sure you want to delete <span className="font-bold text-slate-700">{itemName}</span>? This action cannot be undone.
          </p>

          <div className="flex gap-2 w-full">
            <button
              onClick={onClose}
              className="flex-1 py-1.5 px-3 rounded-xl bg-white border border-slate-200 text-slate-500 font-bold hover:bg-slate-50 transition-all text-xs"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="flex-1 py-1.5 px-3 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-600 transition-all text-xs shadow-sm"
            >
              Yes, Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
