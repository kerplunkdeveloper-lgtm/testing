import React, { useState, useRef, useEffect, useMemo } from "react";
import { FiSearch, FiChevronDown, FiX } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

const SearchableDropdown = ({
  options = [], // { value, label, group? }
  value,
  onChange,
  placeholder = "Select...",
  className = "",
  disabled = false,
  groupBy = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    const lowerSearch = searchTerm.toLowerCase();
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(lowerSearch)
    );
  }, [options, searchTerm]);

  const groupedOptions = useMemo(() => {
    if (!groupBy) return { ungrouped: filteredOptions };
    const groups = {};
    filteredOptions.forEach((opt) => {
      const g = opt.group || "Other";
      if (!groups[g]) groups[g] = [];
      groups[g].push(opt);
    });
    return groups;
  }, [filteredOptions, groupBy]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        className={`w-full flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-1 rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-200 outline-none transition-all ${
          disabled
            ? "opacity-50 cursor-not-allowed"
            : "hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer"
        }`}
      >
        <span className="truncate">
          {selectedOption ? (
            selectedOption.label
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </span>
        <FiChevronDown
          size={14}
          className={`shrink-0 text-slate-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute z-[9999] top-full left-0 mt-1 w-full min-w-[200px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden flex flex-col"
          >
            <div className="p-2 border-b border-slate-100 dark:border-slate-700 flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/50">
              <FiSearch size={14} className="text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full bg-transparent outline-none text-[11px] font-semibold text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <FiX size={12} />
                </button>
              )}
            </div>

            <div className="max-h-48 overflow-y-auto scrollbar-thin flex flex-col p-1">
              {filteredOptions.length === 0 ? (
                <div className="p-2 text-center text-[10px] text-slate-400 italic">
                  No results found
                </div>
              ) : groupBy ? (
                Object.entries(groupedOptions).map(([group, opts]) => (
                  <div key={group} className="mb-1 last:mb-0">
                    <div className="px-2 py-1 text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 rounded">
                      {group}
                    </div>
                    {opts.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          onChange(opt.value);
                          setIsOpen(false);
                          setSearchTerm("");
                        }}
                        className={`w-full text-left px-2 py-1.5 text-[11px] font-bold rounded flex items-center justify-between ${
                          value === opt.value
                            ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                        }`}
                      >
                        <span className="truncate">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                ))
              ) : (
                filteredOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                    className={`w-full text-left px-2 py-1.5 text-[11px] font-bold rounded flex items-center justify-between ${
                      value === opt.value
                        ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchableDropdown;
