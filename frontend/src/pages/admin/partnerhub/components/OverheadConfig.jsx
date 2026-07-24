import React, { useState } from "react";
import OverheadConfigModal from "./OverheadConfigModal";
import { FiEdit2, FiPlus, FiBriefcase } from "react-icons/fi";

const formatINR = (amount) => `₹${Math.round(amount).toLocaleString("en-IN")}`;

const OverheadConfig = ({ overheads, onUpdate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const totalOverhead = overheads.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 h-full flex flex-col shadow-sm animate-fadeIn">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500">
            <FiBriefcase size={14} />
          </div>
          <div>
            <h3 className="text-[#775be2] font-bold text-sm leading-tight">
              Overhead Config
            </h3>
            <p className="text-[10px] text-gray-400">Manage operational overheads</p>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-[#775be2] hover:bg-[#775be2]/80 border border-[#775be2] text-white hover:text-slate-800 font-semibold text-xs rounded-xl transition-colors shadow-sm"
        >
          <FiEdit2 size={12} /> Edit
        </button>
      </div>

      {/* List */}
      <div className="flex-1 space-y-2 max-h-[220px] overflow-y-auto pr-1">
        {overheads.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-slate-400 text-xs font-semibold">No overheads configured.</p>
          </div>
        ) : (
          overheads.map((item, idx) => (
            <div key={item._id || idx} className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-xl p-2.5 hover:bg-slate-100/50 transition-colors">
              <span className="text-slate-600 text-xs font-bold">{item.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-amber-600 font-extrabold text-xs">{formatINR(item.amount)}</span>
                <span className="text-slate-300 text-xs cursor-default">×</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Total */}
      <div className="mt-4 pt-3 border-t border-slate-100">
        <div className="flex justify-between items-center mb-3 bg-rose-50/60 border border-rose-100 rounded-xl px-3 py-2">
          <span className="text-slate-700 font-bold text-xs">Total Overhead</span>
          <span className="text-rose-600 font-black text-sm">{formatINR(totalOverhead)}</span>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full py-2 bg-[#775be2] hover:bg-[#775be2]/80 border border-[#775be2] text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1 active:scale-98"
        >
          <FiPlus size={14} /> Update Overhead
        </button>
      </div>

      <OverheadConfigModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentOverheads={overheads}
        onUpdate={onUpdate}
      />

    </div>
  );
};

export default OverheadConfig;
