import React, { useEffect, useState } from "react";
import { IoAdd, IoClose } from "react-icons/io5";
import { MdDelete, MdEdit } from "react-icons/md";
import { FiLayers, FiSearch } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  createTemplate,
  deleteTemplate,
  getTemplates,
  updateTemplate,
} from "../../../features/template/templateSlice";

const TYPE_CONFIG = {
  Onboarding: {
    color:
      "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
    dot: "bg-emerald-500 dark:bg-emerald-400",
  },
  "Service Process": {
    color:
      "bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/20",
    dot: "bg-violet-500 dark:bg-violet-400",
  },
  Checklist: {
    color:
      "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
    dot: "bg-amber-500 dark:bg-amber-400",
  },
  Campaign: {
    color:
      "bg-blue-100 dark:bg-[#3b82f6]/10 text-blue-700 dark:text-[#3b82f6] border-blue-200 dark:border-[#3b82f6]/20",
    dot: "bg-blue-500 dark:bg-[#3b82f6]",
  },
};

const SERVICE_COLORS = {
  SMM: "bg-blue-50 dark:bg-[#3b82f6]/10 text-blue-600 dark:text-[#3b82f6] border-blue-100 dark:border-[#3b82f6]/20",
  SEO: "bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-500/20",
  Ads: "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-500/20",
  Video:
    "bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-100 dark:border-pink-500/20",
};

const ALL_SERVICES = ["SMM", "SEO", "Ads", "Video"];

const TABS = [
  { id: "all", label: "All" },
  { id: "onboarding", label: "Onboarding" },
  { id: "service process", label: "Service Process" },
  { id: "checklist", label: "Checklist" },
  { id: "campaign", label: "Campaign" },
];

const Templatelib = () => {
  const dispatch = useDispatch();
  const { templates } = useSelector((state) => state.templates);

  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    type: "Campaign",
    description: "",
    services: [],
  });

  useEffect(() => {
    dispatch(getTemplates());
  }, [dispatch]);

  const handleServiceToggle = (service) => {
    setFormData((prev) => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter((s) => s !== service)
        : [...prev.services, service],
    }));
  };

  const openCreate = () => {
    setEditMode(false);
    setEditId(null);
    setFormData({ title: "", type: "Campaign", description: "", services: [] });
    setOpenModal(true);
  };

  const openEdit = (template) => {
    setEditMode(true);
    setEditId(template._id);
    setFormData({
      title: template.title,
      type: template.type,
      description: template.description,
      services: template.services,
    });
    setOpenModal(true);
  };

  const closeModal = () => {
    setOpenModal(false);
    setEditMode(false);
    setEditId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await dispatch(
          updateTemplate({ id: editId, templateData: formData }),
        ).unwrap();
      } else {
        await dispatch(createTemplate(formData)).unwrap();
      }
      closeModal();
    } catch (err) {
      // Error toast is already displayed inside the slice
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this template?")) return;
    try {
      await dispatch(deleteTemplate(id)).unwrap();
    } catch (err) {
      // Error toast is already displayed inside the slice
    }
  };

  const filtered = templates.filter((t) => {
    const matchTab = activeTab === "all" || t.type.toLowerCase() === activeTab;
    const matchSearch =
      search === "" ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  return (
    <div className="min-h-screen">
      <div className="py-4 sm:py-6">
        {/* ── HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-[#3b82f6]/10 border border-blue-100 dark:border-[#3b82f6]/20 flex items-center justify-center">
                <FiLayers
                  size={14}
                  className="text-blue-600 dark:text-[#3b82f6]"
                />
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white">
                Template Library
              </h1>
            </div>
            <p className="text-xs text-gray-400 dark:text-slate-400 ml-9">
              Manage and reuse workflow templates
            </p>
          </div>

          <button
            onClick={openCreate}
            className="self-start sm:self-auto flex items-center gap-1.5 px-4 py-2 text-[11px] rounded-xl bg-blue-600 dark:bg-[#3b82f6] text-white dark:text-black shadow-lg shadow-blue-500/20 dark:shadow-[#3b82f6]/20 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 font-black uppercase tracking-wider shrink-0"
          >
            <IoAdd size={16} />
            New Template
          </button>
        </div>

        {/* ── FILTERS ROW ── */}
        <div className=" mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-5">
          {/* TABS */}
          <div className=" flex items-center gap-1 bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/5 rounded-xl p-1 overflow-x-auto scrollbar-hide w-full sm:w-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg whitespace-nowrap text-xs font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-blue-600 dark:bg-[#3b82f6] text-white dark:text-black shadow-md dark:shadow-[#3b82f6]/20"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-[#3b82f6] hover:bg-gray-50 dark:hover:bg-white/10"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* SEARCH */}
          <div className="flex items-center gap-2 bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/5 rounded-xl px-3 py-2 w-full sm:w-56 focus-within:border-blue-400 dark:focus-within:border-[#3b82f6] transition-colors">
            <FiSearch size={13} className="text-gray-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="bg-transparent outline-none text-xs text-gray-700 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 w-full"
            />
          </div>

          {/* COUNT BADGE */}
          <span className="text-xs text-gray-400 shrink-0">
            {filtered.length} template{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* ── GRID ── */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((template) => {
              const typeConf = TYPE_CONFIG[template.type] || {
                color: "bg-gray-100 text-gray-600 border-gray-200",
                dot: "bg-gray-400",
              };
              return (
                <div
                  key={template._id}
                  className="group bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-2xl p-4 shadow-lg hover:shadow-md hover:border-blue-400 dark:hover:border-[#3b82f6] hover:-translate-y-0.5 transition-all duration-300 flex flex-col"
                >
                  {/* CARD TOP */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-[#3b82f6] transition-colors truncate">
                        {template.title}
                      </h2>
                      <span
                        className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${typeConf.color}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${typeConf.dot}`}
                        />
                        {template.type}
                      </span>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEdit(template)}
                        className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all"
                        title="Edit"
                      >
                        <MdEdit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(template._id)}
                        className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 flex items-center justify-center hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all"
                        title="Delete"
                      >
                        <MdDelete size={14} />
                      </button>
                    </div>
                  </div>

                  {/* DESCRIPTION */}
                  <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed line-clamp-2 flex-1 mb-3">
                    {template.description || (
                      <span className="italic text-gray-300 dark:text-slate-600">
                        No description
                      </span>
                    )}
                  </p>

                  {/* SERVICES */}
                  {template.services?.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-3 border-t border-gray-100 dark:border-white/5">
                      {template.services.map((s) => (
                        <span
                          key={s}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                            SERVICE_COLORS[s] ||
                            "bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-slate-400 border-gray-100 dark:border-white/10"
                          }`}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* EMPTY STATE */
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-3xl shadow-sm">
            <div className="w-14 h-14 bg-gray-100 dark:bg-white/5 rounded-2xl flex items-center justify-center mb-3">
              <FiLayers
                size={24}
                className="text-gray-300 dark:text-slate-600"
              />
            </div>
            <h2 className="text-base font-bold text-slate-600 dark:text-white">
              No Templates Found
            </h2>
            <p className="text-xs text-gray-400 dark:text-slate-400 mt-1">
              {search
                ? "Try a different search term"
                : "Create your first workflow template"}
            </p>
            {!search && (
              <button
                onClick={openCreate}
                className="mt-4 flex items-center gap-1.5 px-4 py-2.5 text-[10px] rounded-xl bg-blue-600 dark:bg-[#3b82f6] text-white dark:text-black shadow-lg shadow-blue-500/20 dark:shadow-[#3b82f6]/20 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 font-black uppercase tracking-wider"
              >
                <IoAdd size={15} /> New Template
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── MODAL ── */}
      {openModal && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-[#111111]/70 backdrop-blur-[2px] flex items-center justify-center p-3 z-50">
          <div className="bg-white dark:bg-[#111111] w-full max-w-lg rounded-2xl border border-gray-200 dark:border-white/5 shadow-2xl overflow-hidden">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-white/5 bg-slate-50/60 dark:bg-[#1a1a1a]">
              <h2 className="text-sm font-bold text-slate-800 dark:text-white">
                {editMode ? "✏️ Update Template" : "✨ New Template"}
              </h2>
              <button
                onClick={closeModal}
                className="w-7 h-7 rounded-lg bg-white dark:bg-transparent border border-gray-200 dark:border-white/10 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-rose-500 hover:border-rose-100 dark:hover:bg-rose-500/10 dark:hover:border-rose-500/20 transition-all"
              >
                <IoClose size={16} />
              </button>
            </div>

            {/* FORM */}
            <form
              onSubmit={handleSubmit}
              className="px-5 py-4 space-y-4 max-h-[75vh] overflow-y-auto"
            >
              {/* TITLE */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Template Name{" "}
                  <span className="text-rose-400 dark:text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="e.g. Client Onboarding Flow"
                  className="w-full h-9 bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/10 rounded-xl px-3 outline-none focus:border-blue-400 dark:focus:border-[#3b82f6] focus:ring-2 focus:ring-blue-100 dark:focus:ring-[#3b82f6]/20 transition-all text-sm text-slate-700 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-600"
                />
              </div>

              {/* TYPE + SERVICES — 2 col */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    Category
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    className="w-full h-9 bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/10 rounded-xl px-3 outline-none focus:border-blue-400 dark:focus:border-[#3b82f6] focus:ring-2 focus:ring-blue-100 dark:focus:ring-[#3b82f6]/20 transition-all text-sm text-slate-700 dark:text-white cursor-pointer"
                  >
                    <option className="dark:bg-[#111111]">Onboarding</option>
                    <option className="dark:bg-[#111111]">
                      Service Process
                    </option>
                    <option className="dark:bg-[#111111]">Checklist</option>
                    <option className="dark:bg-[#111111]">Campaign</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    Services
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_SERVICES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleServiceToggle(s)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                          formData.services.includes(s)
                            ? "bg-blue-600 dark:bg-[#3b82f6] text-white dark:text-black border-blue-600 dark:border-[#3b82f6]"
                            : "bg-white dark:bg-transparent text-slate-500 dark:text-slate-400 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* DESCRIPTION */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Description
                </label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Describe the purpose or steps of this template..."
                  className="w-full bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 outline-none focus:border-blue-400 dark:focus:border-[#3b82f6] focus:ring-2 focus:ring-blue-100 dark:focus:ring-[#3b82f6]/20 transition-all text-sm text-slate-700 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-600 resize-none"
                />
              </div>

              {/* FOOTER BUTTONS */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-[10px] rounded-xl bg-blue-600 dark:bg-[#3b82f6] hover:bg-blue-700 dark:hover:bg-[#ccff00] text-white dark:text-black font-black uppercase tracking-wider shadow-lg shadow-blue-500/20 dark:shadow-[#3b82f6]/20 transition-all hover:-translate-y-0.5 active:scale-95"
                >
                  {editMode ? "Update Template" : "Create Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Templatelib;
