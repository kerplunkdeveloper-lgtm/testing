import React, { useState, useEffect, useRef } from "react";
import {
  FiPhoneCall,
  FiPlus,
  FiClock,
  FiCalendar,
  FiSave,
  FiEdit2,
  FiTrash2,
  FiPlay,
  FiSquare,
  FiUser,
} from "react-icons/fi";
import axiosInstance from "../../services/axiosInstance";
import { toast } from "react-hot-toast";

const ClientCalls = ({ isEmbedded = false }) => {
  const [calls, setCalls] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editId, setEditId] = useState(null);

  // Timer State
  const [timeMode, setTimeMode] = useState("manual"); // 'manual' or 'timer'
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef(null);

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    client: "",
    discussionPoints: "",
    startTime: "",
    endTime: "",
    duration: "",
  });

  useEffect(() => {
    fetchData();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [callsRes, clientsRes] = await Promise.all([
        axiosInstance.get("/client-calls"),
        axiosInstance.get("/clients"),
      ]);
      setCalls(callsRes.data.data || []);
      setClients(clientsRes.data.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const formatTime12hr = (timeStr) => {
    if (!timeStr) return "";
    const [hourStr, minStr] = timeStr.split(":");
    let hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    hour = hour ? hour : 12; // 0 becomes 12
    return `${hour}:${minStr} ${ampm}`;
  };

  const formatElapsedTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0)
      return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const calculateDuration = (start, end) => {
    if (!start || !end) return "";
    const startTime = new Date(`1970-01-01T${start}:00`);
    const endTime = new Date(`1970-01-01T${end}:00`);

    let diffMs = endTime - startTime;
    if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;

    const diffHrs = Math.floor(diffMs / 3600000);
    const diffMins = Math.round((diffMs % 3600000) / 60000);

    if (diffHrs === 0) return `${diffMins} mins`;
    if (diffMins === 0) return `${diffHrs} hr${diffHrs > 1 ? "s" : ""}`;
    return `${diffHrs} hr${diffHrs > 1 ? "s" : ""} ${diffMins} mins`;
  };

  const handleTimeChange = (e) => {
    const { name, value } = e.target;
    const newFormData = { ...formData, [name]: value };

    if (newFormData.startTime && newFormData.endTime) {
      newFormData.duration = calculateDuration(
        newFormData.startTime,
        newFormData.endTime,
      );
    }

    setFormData(newFormData);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEdit = (call) => {
    setEditId(call._id);
    setFormData({
      date: new Date(call.date).toISOString().split("T")[0],
      client: call.client?._id || "",
      discussionPoints: call.discussionPoints,
      startTime: call.startTime,
      endTime: call.endTime,
      duration: call.duration,
    });
    setTimeMode("manual");
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this call record?"))
      return;

    try {
      await axiosInstance.delete(`/client-calls/${id}`);
      toast.success("Call record deleted successfully!");
      fetchData();
    } catch (error) {
      console.error("Error deleting call:", error);
      toast.error("Failed to delete record");
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditId(null);
    if (timerRef.current) clearInterval(timerRef.current);
    setIsTimerRunning(false);
    setElapsedSeconds(0);
    setFormData({
      date: new Date().toISOString().split("T")[0],
      client: "",
      discussionPoints: "",
      startTime: "",
      endTime: "",
      duration: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.duration) {
      toast.error("Please provide valid Start and End times.");
      return;
    }

    setSubmitting(true);
    try {
      if (editId) {
        await axiosInstance.put(`/client-calls/${editId}`, formData);
        toast.success("Call record updated!");
      } else {
        await axiosInstance.post("/client-calls", formData);
        toast.success("Call record saved!");
      }

      handleCancel();
      fetchData();
    } catch (error) {
      console.error("Error saving call:", error);
      toast.error(
        error.response?.data?.message || "Failed to save call record",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Stopwatch functions
  const startTimer = () => {
    if (!formData.client) {
      toast.error("Please select a client before starting the call");
      return;
    }

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");

    setFormData((prev) => ({
      ...prev,
      startTime: `${hh}:${mm}`,
      endTime: "",
      duration: "",
    }));

    setElapsedSeconds(0);
    setIsTimerRunning(true);
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    clearInterval(timerRef.current);
    setIsTimerRunning(false);

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");

    // Calculate precise duration including seconds
    const hrs = Math.floor(elapsedSeconds / 3600);
    const mins = Math.floor((elapsedSeconds % 3600) / 60);
    const secs = elapsedSeconds % 60;

    let durationStr = "";
    if (hrs > 0) durationStr += `${hrs} hr${hrs > 1 ? "s" : ""} `;
    if (mins > 0 || hrs > 0)
      durationStr += `${mins} min${mins !== 1 ? "s" : ""} `;
    if (secs > 0 || (hrs === 0 && mins === 0))
      durationStr += `${secs} sec${secs !== 1 ? "s" : ""}`;

    setFormData((prev) => {
      const newData = { ...prev, endTime: `${hh}:${mm}` };
      if (newData.startTime) {
        newData.duration = durationStr.trim();
      }
      return newData;
    });
  };

  return (
    <div className={isEmbedded ? "px-6 pb-6" : "p-6"}>
      {!isEmbedded && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
              <FiPhoneCall size={24} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
              Client Calls
            </h1>
          </div>
          {!showAddForm && (
            <button
              onClick={() => {
                setEditId(null);
                setTimeMode("timer");
                setShowAddForm(true);
              }}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <FiPlus className="mr-2" /> Log New Call
            </button>
          )}
        </div>
      )}

      {isEmbedded && !showAddForm && (
        <div className="flex justify-end mb-4">
          <button
            onClick={() => {
              setEditId(null);
              setTimeMode("timer");
              setShowAddForm(true);
            }}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm"
          >
            <FiPlus className="mr-2" /> Log New Call
          </button>
        </div>
      )}

      {showAddForm && (
        <div className="bg-white dark:bg-[#0B1120] rounded-xl border border-indigo-100 dark:border-indigo-900/30 p-6 mb-8 shadow-sm transition-all duration-300">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center">
              {editId ? (
                <FiEdit2 className="mr-2 text-indigo-500" />
              ) : (
                <FiPlus className="mr-2 text-indigo-500" />
              )}
              {editId ? "Edit Call Record" : "Create New Call Record"}
            </h2>

            {/* Time Mode Toggle */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setTimeMode("timer")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${timeMode === "timer" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}
              >
                Live Timer
              </button>
              <button
                type="button"
                onClick={() => setTimeMode("manual")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${timeMode === "manual" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}
              >
                Manual Entry
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  name="date"
                  required
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Client
                </label>
                <select
                  name="client"
                  required
                  value={formData.client}
                  onChange={handleChange}
                  disabled={loading || clients.length === 0}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <option value="">Loading clients...</option>
                  ) : clients.length === 0 ? (
                    <option value="">No clients available</option>
                  ) : (
                    <>
                      <option value="">Select client...</option>
                      {clients.map((client) => (
                        <option key={client._id} value={client._id}>
                          {client.companyName}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              {/* Conditional Time Inputs */}
              {timeMode === "manual" ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      name="startTime"
                      required
                      value={formData.startTime}
                      onChange={handleTimeChange}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      name="endTime"
                      required
                      value={formData.endTime}
                      onChange={handleTimeChange}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm"
                    />
                  </div>
                </>
              ) : (
                <div className="lg:col-span-2 flex items-end">
                  <div className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="font-mono text-xl font-medium text-indigo-600 dark:text-indigo-400 tracking-wider w-20 text-center">
                        {formatElapsedTime(elapsedSeconds)}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {formData.startTime &&
                        !isTimerRunning &&
                        formData.endTime ? (
                          <span>
                            Call finished ({formatTime12hr(formData.startTime)}{" "}
                            - {formatTime12hr(formData.endTime)})
                          </span>
                        ) : isTimerRunning ? (
                          <span className="flex items-center text-emerald-500">
                            <span className="animate-pulse mr-1 h-2 w-2 bg-emerald-500 rounded-full"></span>{" "}
                            Call in progress...
                          </span>
                        ) : (
                          <span>Ready to start</span>
                        )}
                      </div>
                    </div>

                    <div>
                      {!isTimerRunning && elapsedSeconds === 0 ? (
                        <button
                          type="button"
                          onClick={startTimer}
                          className="flex items-center px-4 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 rounded-md transition-colors text-sm font-medium"
                        >
                          <FiPlay className="mr-1.5" /> Start Call
                        </button>
                      ) : isTimerRunning ? (
                        <button
                          type="button"
                          onClick={stopTimer}
                          className="flex items-center px-4 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-md transition-colors text-sm font-medium"
                        >
                          <FiSquare className="mr-1.5" /> End Call
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setElapsedSeconds(0);
                            setFormData((prev) => ({
                              ...prev,
                              startTime: "",
                              endTime: "",
                              duration: "",
                            }));
                          }}
                          className="flex items-center px-4 py-1.5 bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 rounded-md transition-colors text-sm font-medium"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Discussion Points
              </label>
              <textarea
                name="discussionPoints"
                value={formData.discussionPoints || ""}
                onChange={handleChange}
                rows="2"
                placeholder="Key takeaways (optional)..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm resize-y"
              ></textarea>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Duration:{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {formData.duration || "--"}
                </span>
              </div>
              <div className="flex space-x-3">
                {!isTimerRunning && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submitting || isTimerRunning}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-70 flex items-center"
                >
                  <FiSave className="mr-2" />{" "}
                  {submitting
                    ? "Saving..."
                    : editId
                      ? "Update Record"
                      : "Save Record"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-[#0B1120] rounded-xl border border-slate-200 dark:border-slate-800/60 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : calls.length === 0 && !showAddForm ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3">
              <FiPhoneCall size={32} />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              No Calls Logged
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1 mb-4">
              You haven't recorded any client calls yet.
            </p>
            <button
              onClick={() => {
                setEditId(null);
                setTimeMode("timer");
                setShowAddForm(true);
              }}
              className="inline-flex items-center px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors font-medium text-sm"
            >
              <FiPlus className="mr-2" /> Log Your First Call
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Client</th>
                  <th className="px-6 py-4 font-medium">Posted By</th>
                  <th className="px-6 py-4 font-medium">Time</th>
                  <th className="px-6 py-4 font-medium">Duration</th>
                  <th className="px-6 py-4 font-medium">Discussion Points</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                {calls.map((call) => (
                  <tr
                    key={call._id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                      <div className="flex items-center">
                        <FiCalendar className="mr-2 text-slate-400" />
                        {new Date(call.date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {call.client?.companyName || "Unknown"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                      <div className="flex items-center">
                        <FiUser className="mr-2 text-slate-400" />
                        {call.createdBy?.name || "Unknown"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                      <div className="flex items-center">
                        <FiClock className="mr-2 text-slate-400" />
                        {formatTime12hr(call.startTime)} -{" "}
                        {formatTime12hr(call.endTime)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {call.duration}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 max-w-md">
                      <div
                        className="line-clamp-2"
                        title={call.discussionPoints}
                      >
                        {call.discussionPoints}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(call)}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 mr-3 p-1 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                        title="Edit"
                      >
                        <FiEdit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(call._id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                        title="Delete"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientCalls;
