import React, { useState } from "react";
import { FiChevronDown, FiChevronUp, FiDollarSign } from "react-icons/fi";

const formatINR = (amount) => `₹${amount.toLocaleString("en-IN")}`;

const AVATAR_COLORS = [
  "from-blue-400 to-indigo-500 text-indigo-600 bg-indigo-50",
  "from-emerald-400 to-teal-500 text-teal-600 bg-teal-50",
  "from-pink-400 to-rose-500 text-rose-600 bg-rose-50",
  "from-amber-400 to-orange-500 text-amber-600 bg-amber-50",
];
const avatarGrad = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const ProfitPerClientTable = ({ clients }) => {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? clients : clients.slice(0, 8);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col h-full shadow-sm animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
            <FiDollarSign size={14} />
          </div>
          <div>
            <h3 className="text-[#775be2] font-bold text-sm leading-tight">
              Profit per Client
            </h3>
            <p className="text-[10px] text-gray-400">Current active monthly breakdown</p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-slate-500 hover:text-indigo-600 text-xs font-semibold flex items-center gap-1 transition-colors"
        >
          {expanded ? (
            <>
              Collapse <FiChevronUp size={14} />
            </>
          ) : (
            <>
              Breakdown <FiChevronDown size={14} />
            </>
          )}
        </button>
      </div>

      {/* Table container */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="text-slate-400 font-bold text-[9px] uppercase tracking-wider text-left py-2.5 px-3 rounded-l-xl">
                Client
              </th>
              <th className="text-slate-400 font-bold text-[9px] uppercase tracking-wider text-right py-2.5 px-3">
                Revenue
              </th>
              <th className="text-slate-400 font-bold text-[9px] uppercase tracking-wider text-right py-2.5 px-3">
                Profit
              </th>
              <th className="text-slate-400 font-bold text-[9px] uppercase tracking-wider text-right py-2.5 px-3 rounded-r-xl">
                Margin
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {visible.map((client, i) => {
              const marginColor =
                client.margin >= 50
                  ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                  : client.margin >= 35
                  ? "bg-amber-50 text-amber-600 border-amber-100"
                  : "bg-rose-50 text-rose-600 border-rose-100";

              return (
                <tr
                  key={i}
                  className="hover:bg-slate-50/50 transition-colors group"
                >
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${avatarGrad(client.name)} flex items-center justify-center font-bold text-xs shrink-0`}>
                        {client.name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-slate-700 font-bold text-xs truncate max-w-[150px]">
                        {client.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-500 font-semibold text-xs">
                    {formatINR(client.revenue)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-600 text-xs">
                    {formatINR(client.profit)}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${marginColor}`}>
                      {client.margin}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!expanded && clients.length > 8 && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-3 pt-3 border-t border-slate-100 text-indigo-500 hover:text-indigo-600 text-xs font-bold text-center transition-colors w-full flex items-center justify-center gap-1"
        >
          Show {clients.length - 8} more clients
          <FiChevronDown size={14} />
        </button>
      )}
    </div>
  );
};

export default ProfitPerClientTable;
