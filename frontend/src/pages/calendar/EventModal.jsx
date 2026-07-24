import React, { useState, useEffect } from "react";
import { FiX, FiCalendar, FiTrash2 } from "react-icons/fi";
import { useSelector, useDispatch } from "react-redux";
import { getClients } from "../../features/clients/clientslice";

const EVENT_TYPES = ["Post", "Reel", "Story", "Ad", "Report", "Birthday Celebration"];

const TYPE_COLORS = {
  Post:   { bg: "bg-blue-600",   text: "text-blue-600",   light: "bg-blue-50 border-blue-200"   },
  Reel:   { bg: "bg-red-500",    text: "text-red-600",    light: "bg-red-50 border-red-200"     },
  Story:  { bg: "bg-violet-600", text: "text-violet-600", light: "bg-violet-50 border-violet-200" },
  Ad:     { bg: "bg-amber-500",  text: "text-amber-600",  light: "bg-amber-50 border-amber-200" },
  Report: { bg: "bg-emerald-500",text: "text-emerald-600",light: "bg-emerald-50 border-emerald-200" },
  "Birthday Celebration": { bg: "bg-pink-500", text: "text-pink-600", light: "bg-pink-50 border-pink-200" },
};

const TYPE_HEX_COLORS = {
  Post: "#3b82f6",
  Reel: "#ef4444",
  Story: "#8b5cf6",
  Ad: "#f59e0b",
  Report: "#10b981",
  "Birthday Celebration": "#ec4899",
};

const EventModal = ({ open, setOpen, onSubmit, initialData, isEditing, onDelete }) => {
  const dispatch = useDispatch();
  const { clients } = useSelector((s) => s.clients);

  const [formData, setFormData] = useState({
    title: "", description: "", date: "", type: "Post", client: "", color: "#3b82f6",
  });

  const fmt = (d) => {
    if (!d) return "";
    const dateObj = new Date(d);
    const pad = (n) => String(n).padStart(2, "0");
    const year = dateObj.getFullYear();
    const month = pad(dateObj.getMonth() + 1);
    const day = pad(dateObj.getDate());
    const hours = pad(dateObj.getHours());
    const minutes = pad(dateObj.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  useEffect(() => {
    if (!open) return;
    dispatch(getClients());

    if (isEditing && initialData) {
      setFormData({
        title: initialData.title || "",
        description: initialData.description || "",
        date: fmt(initialData.date),
        type: initialData.type || "Post",
        client: initialData.client?._id || initialData.client || "",
        color: initialData.color || "#3b82f6",
      });
    } else if (initialData?.start) {
      setFormData({
        title: "", description: "",
        date: fmt(initialData.start),
        type: "Post", client: "", color: "#3b82f6",
      });
    } else {
      setFormData({ title: "", description: "", date: "", type: "Post", client: "", color: "#3b82f6" });
    }
  }, [open, isEditing, initialData, dispatch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "client" && value) {
      const c = clients.find((x) => x._id === value);
      if (c) {
        setFormData((p) => ({
          ...p, client: value,
          title: `${c.companyName} — ${p.title.split(" — ").pop() || ""}`,
        }));
        return;
      }
    }
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      client: formData.client || null,
    });
  };

  if (!open) return null;

  const typeConf = TYPE_COLORS[formData.type] || TYPE_COLORS.Post;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="event-modal-container bg-white w-full max-w-md rounded-2xl border border-gray-200 shadow-2xl overflow-hidden">

        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-slate-50/60">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <FiCalendar size={14} className="text-white" />
            </div>
            <h2 className="text-sm font-bold text-slate-800">
              {isEditing ? "Edit Event" : "New Event"}
            </h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-100 transition-all"
          >
            <FiX size={14} />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3 max-h-[78vh] overflow-y-auto">

          {/* TYPE PILLS */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Content Type
            </label>
            <div className="flex flex-wrap gap-1.5">
              {EVENT_TYPES.map((t) => {
                const conf = TYPE_COLORS[t];
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormData((p) => ({
                      ...p,
                      type: t,
                      color: TYPE_HEX_COLORS[t] || p.color
                    }))}
                    className={`px-3 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                      formData.type === t
                        ? `${conf.bg} text-white border-transparent`
                        : `bg-white ${conf.text} ${conf.light}`
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* CLIENT + DATE */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Client</label>
              <select
                name="client"
                value={formData.client}
                onChange={handleChange}
                className="w-full h-9 bg-gray-50 border border-gray-200 rounded-xl px-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all text-xs text-slate-700 cursor-pointer"
              >
                <option value="">Select client...</option>
                {clients?.map((c) => (
                  <option key={c._id} value={c._id}>{c.companyName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Date & Time *</label>
              <input
                type="datetime-local"
                name="date"
                required
                value={formData.date}
                onChange={handleChange}
                className="w-full h-9 bg-gray-50 border border-gray-200 rounded-xl px-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all text-xs text-slate-700"
              />
            </div>
          </div>

          {/* TITLE */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Event Title *</label>
            <input
              type="text"
              name="title"
              required
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. ABC Restaurant — Product Launch"
              className="w-full h-9 bg-gray-50 border border-gray-200 rounded-xl px-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all text-sm text-slate-700"
            />
          </div>

          {/* DESCRIPTION */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Notes</label>
            <textarea
              name="description"
              rows="2"
              value={formData.description}
              onChange={handleChange}
              placeholder="Objectives or execution steps..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all text-sm text-slate-700 resize-none"
            />
          </div>

          {/* BUTTONS */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
            {isEditing ? (
              <button
                type="button"
                onClick={onDelete}
                className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 font-semibold text-xs hover:bg-rose-100 transition-all flex items-center gap-1.5 shrink-0"
              >
                <FiTrash2 size={13} /> Delete Event
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-slate-600 font-semibold text-xs hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-5 py-2 rounded-xl text-white font-bold text-xs shadow-sm transition-all active:scale-95 ${typeConf.bg} hover:opacity-90`}
              >
                {isEditing ? "Update Event" : "Create Event"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventModal;
