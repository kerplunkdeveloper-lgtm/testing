import React, { useState, useEffect } from 'react';
import axiosInstance from '../../../../services/axiosInstance';
import { FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';

const OverheadConfigModal = ({ isOpen, onClose, currentOverheads, onUpdate }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');

  useEffect(() => {
    if (isOpen) {
      setItems(currentOverheads.map(o => ({ ...o })));
      setNewItemName('');
      setNewItemAmount('');
    }
  }, [isOpen, currentOverheads]);

  const handleAmountChange = (index, val) => {
    const updated = [...items];
    updated[index].amount = val;
    setItems(updated);
  };

  const handleRemove = (index) => {
    const updated = [...items];
    updated.splice(index, 1);
    setItems(updated);
  };

  const handleAdd = () => {
    if (!newItemName || !newItemAmount) return;
    setItems([...items, { name: newItemName, amount: Number(newItemAmount) }]);
    setNewItemName('');
    setNewItemAmount('');
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await axiosInstance.post('/overheads/bulk', { overheads: items });
      toast.success("Overheads updated successfully!");
      onUpdate();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update overheads");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px] p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden flex flex-col border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
          <h2 className="text-[#775be2] text-sm font-bold flex items-center gap-1.5">
            <span>🏢</span> Operational Overheads
          </h2>
          <button 
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <FiX size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3 bg-white flex-1 overflow-y-auto">
          <p className="text-slate-500 text-[10px] font-semibold mb-3">
            Operational fixed expenses deducted from revenue to analyze overall margin.
          </p>
          
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={index} className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-100">
                <span className="text-slate-700 font-bold text-xs flex-1">{item.name}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={item.amount}
                    onChange={(e) => handleAmountChange(index, e.target.value)}
                    className="w-20 bg-white border border-slate-200 text-slate-800 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 font-bold text-right shadow-sm"
                  />
                  <button 
                    onClick={() => handleRemove(index)}
                    className="text-rose-500 hover:text-rose-600 transition-colors p-1"
                  >
                    <FiX size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

        
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-2.5 bg-slate-50 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-500 font-bold hover:bg-slate-100 transition-all text-xs"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-1.5 rounded-xl bg-[#7c5ff0] text-white font-bold hover:bg-[#6c4be0] disabled:opacity-50 transition-all text-xs shadow-sm"
          >
            {loading ? 'Saving...' : 'Save Overhead'}
          </button>
        </div>
        
      </div>
    </div>
  );
};

export default OverheadConfigModal;
