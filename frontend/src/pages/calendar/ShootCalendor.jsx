import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, isSameDay } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";
import axiosInstance from "../../services/axiosInstance";
import { toast } from "react-hot-toast";
import {
  FiPlus,
  FiX,
  FiTrash2,
  FiMapPin,
  FiUser,
  FiVideo,
  FiCamera,
  FiChevronLeft,
  FiChevronRight,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiClipboard,
  FiCheckSquare,
  FiAlertCircle,
  FiAlertTriangle,
  FiCheck,
  FiEdit2,
  FiEye,
} from "react-icons/fi";

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const SHOOT_TYPES = [
  "Food Shoot",
  "Product Shoot",
  "Fashion Shoot",
  "Event Shoot",
  "Video Shoot",
  "Photo Shoot",
  "Other",
];

const SHOOT_STATUSES = [
  "Planned",
  "Confirmed",
  "In Progress",
  "Completed",
  "Pending Approval",
  "At Risk",
  "Cancelled",
];

// Helper to parse time string like "09:00 AM" and apply to a date
const parseDateTime = (dateStr, timeStr) => {
  if (!dateStr) return new Date();
  const date = new Date(dateStr);
  if (!timeStr) return date;

  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return date;
  let [, hours, minutes, period] = match;
  hours = parseInt(hours, 10);
  minutes = parseInt(minutes, 10);
  if (period.toUpperCase() === "PM" && hours < 12) hours += 12;
  if (period.toUpperCase() === "AM" && hours === 12) hours = 0;

  date.setHours(hours, minutes, 0, 0);
  return date;
};

// Custom Toolbar
const CustomToolbar = (toolbar) => {
  const goToBack = () => {
    toolbar.onNavigate("PREV");
  };
  const goToNext = () => {
    toolbar.onNavigate("NEXT");
  };
  return (
    <div className="flex items-center justify-between mb-4 px-2">
      <div className="flex items-center gap-2 text-gray-500">
        <button
          onClick={goToBack}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <FiChevronLeft size={20} />
        </button>
        <span className="text-lg font-bold text-gray-800 min-w-[140px] text-center">
          {toolbar.label}
        </span>
        <button
          onClick={goToNext}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <FiChevronRight size={20} />
        </button>
      </div>
    </div>
  );
};

// Custom Event Component
const CustomEvent = ({ event }) => {
  const { resource } = event;

  const getStatusColors = (status) => {
    switch (status) {
      case "Confirmed":
        return "bg-green-50 text-green-800 border-green-200";
      case "In Progress":
        return "bg-blue-50 text-blue-800 border-blue-200";
      case "Planned":
        return "bg-purple-50 text-purple-800 border-purple-200";
      case "Pending Approval":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "At Risk":
        return "bg-red-50 text-red-800 border-red-200";
      case "Completed":
        return "bg-orange-50 text-orange-800 border-orange-200";
      case "Cancelled":
        return "bg-gray-200 text-gray-600 border-gray-300";
      default:
        return "bg-indigo-50 text-indigo-800 border-indigo-200";
    }
  };

  const getStatusDot = (status) => {
    switch (status) {
      case "Confirmed":
        return "text-green-500";
      case "In Progress":
        return "text-blue-500";
      case "Planned":
        return "text-purple-500";
      case "Pending Approval":
        return "text-gray-500";
      case "At Risk":
        return "text-red-500";
      case "Completed":
        return "text-orange-500";
      case "Cancelled":
        return "text-gray-400";
      default:
        return "text-indigo-500";
    }
  };

  const colors = getStatusColors(resource.status);
  const dotColor = getStatusDot(resource.status);

  const isVideo = resource.shootType?.toLowerCase().includes("video");

  return (
    <div
      className={`h-full w-full p-2 border rounded-lg flex flex-col justify-between overflow-hidden shadow-sm ${colors} group relative`}
    >
      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 p-1 rounded-md shadow-sm z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            resource.onView && resource.onView();
          }}
          className="text-blue-600 hover:bg-blue-100 p-1 rounded"
          title="View"
        >
          <FiEye size={12} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            resource.onEdit && resource.onEdit();
          }}
          className="text-indigo-600 hover:bg-indigo-100 p-1 rounded"
          title="Edit"
        >
          <FiEdit2 size={12} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            resource.onDelete && resource.onDelete();
          }}
          className="text-red-600 hover:bg-red-100 p-1 rounded"
          title="Delete"
        >
          <FiTrash2 size={12} />
        </button>
      </div>

      <div>
        <div className="text-[10px] font-medium opacity-80 mb-1 flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <div
              className={`w-1.5 h-1.5 rounded-full bg-current ${dotColor}`}
            ></div>
            {resource.schedule?.startTime} - {resource.schedule?.endTime}
          </div>
          <span
            className={`text-[9px] w-max px-1.5 py-0.5 rounded border ${colors} bg-white/50`}
          >
            {resource.status}
          </span>
        </div>
        <div className="font-bold text-xs truncate leading-tight mb-1 pr-14">
          {resource.shootTitle}
        </div>
        <div className="text-[11px] opacity-90 truncate">
          {resource.client?.companyName || "Unknown Client"}
        </div>
      </div>

      <div className="mt-2 space-y-1">
        <div className="flex items-center gap-1 text-[10px] opacity-80 truncate">
          <FiMapPin size={10} className="shrink-0" />
          <span className="truncate">
            {resource.location || "Location TBD"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-[9px] opacity-70 truncate font-medium">
            By: {resource.createdBy?.name || "Unknown"}
          </div>
          <div className="opacity-70 shrink-0 ml-1">
            {isVideo ? <FiVideo size={12} /> : <FiCamera size={12} />}
          </div>
        </div>
      </div>
    </div>
  );
};

// Custom Day Header Component
const CustomDateHeader = ({ date, label }) => {
  const isToday = isSameDay(date, new Date());

  // label comes as e.g. "01 Mon" or "Mon 01" depending on localizer, we can format manually
  const dayName = format(date, "E");
  const dayNumber = format(date, "d");

  return (
    <div className="flex flex-col items-center justify-center py-2">
      <span className="text-sm font-medium text-gray-500 mb-1">{dayName}</span>
      <span
        className={`text-lg font-semibold w-8 h-8 flex items-center justify-center rounded-full ${isToday ? "bg-indigo-600 text-white" : "text-gray-800"}`}
      >
        {dayNumber}
      </span>
    </div>
  );
};

const ShootCalendor = () => {
  const currentUser = useSelector((state) => state.auth?.user);
  const [shoots, setShoots] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedShoot, setSelectedShoot] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewShoot, setViewShoot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedClientFilter, setSelectedClientFilter] = useState("");

  const [formData, setFormData] = useState({
    client: "",
    shootTitle: "",
    shootType: "Food Shoot",
    description: "",
    shootDate: "",
    startTime: "09:00 AM",
    endTime: "01:00 PM",
    status: "Planned",
    location: "",
    assignedTo: "",
    shootTeam: [],
    purpose: "",
    contentUse: "",
    weather: "",
    transport: "",
    estimatedBudget: "",
    clientContactName: "",
    clientContactPhone: "",
    shootSchedule: [{ time: "", task: "" }],
    checklist: [{ task: "", isCompleted: false }],
    notes: "",
    specialInstructions: "",
  });

  useEffect(() => {
    fetchShoots();
    fetchClients();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await axiosInstance.get("/users");
      setUsers(data.data || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const fetchClients = async () => {
    try {
      const { data } = await axiosInstance.get("/clients");
      setClients(data.data || []);
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    }
  };

  const fetchShoots = async () => {
    try {
      const { data } = await axiosInstance.get("/shoot-calendar");
      setShoots(data.data || []);
    } catch (error) {
      toast.error("Failed to fetch shoots");
      console.error(error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, selectedOptions } = e.target;
    if (type === "select-multiple") {
      const values = Array.from(selectedOptions, (option) => option.value);
      setFormData((prev) => ({ ...prev, [name]: values }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const openModal = (shoot = null) => {
    if (shoot) {
      setSelectedShoot(shoot);
      setFormData({
        client: shoot.client?._id || shoot.client || "",
        shootTitle: shoot.shootTitle,
        shootType: shoot.shootType,
        description: shoot.description || "",
        shootDate: shoot.schedule?.shootDate
          ? new Date(shoot.schedule.shootDate).toISOString().split("T")[0]
          : "",
        startTime: shoot.schedule?.startTime || "09:00 AM",
        endTime: shoot.schedule?.endTime || "01:00 PM",
        status: shoot.status || "Planned",
        location: shoot.location || "",
        assignedTo: shoot.assignedTo?._id || shoot.assignedTo || "",
        shootTeam: shoot.shootTeam?.map((u) => u._id || u) || [],
        purpose: shoot.purpose || "",
        contentUse: shoot.contentUse || "",
        weather: shoot.weather || "",
        transport: shoot.transport || "",
        estimatedBudget: shoot.estimatedBudget || "",
        clientContactName: shoot.clientContact?.name || "",
        clientContactPhone: shoot.clientContact?.phone || "",
        shootSchedule: shoot.shootSchedule?.length
          ? shoot.shootSchedule
          : [{ time: "", task: "" }],
        checklist: shoot.checklist?.length
          ? shoot.checklist
          : [{ task: "", isCompleted: false }],
        notes: shoot.notes || "",
        specialInstructions: shoot.specialInstructions || "",
      });
    } else {
      setSelectedShoot(null);
      setFormData({
        client: "",
        shootTitle: "",
        shootType: "Food Shoot",
        description: "",
        shootDate: new Date().toISOString().split("T")[0],
        startTime: "09:00 AM",
        endTime: "01:00 PM",
        status: "Planned",
        location: "",
        assignedTo: "",
        shootTeam: [],
        purpose: "",
        contentUse: "",
        weather: "",
        transport: "",
        estimatedBudget: "",
        clientContactName: "",
        clientContactPhone: "",
        shootSchedule: [{ time: "", task: "" }],
        checklist: [{ task: "", isCompleted: false }],
        notes: "",
        specialInstructions: "",
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedShoot(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      client: formData.client,
      shootTitle: formData.shootTitle,
      shootType: formData.shootType,
      description: formData.description,
      schedule: {
        shootDate: formData.shootDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
      },
      status: formData.status,
      location: formData.location,
      assignedTo: formData.assignedTo,
      shootTeam: formData.shootTeam,
      purpose: formData.purpose,
      contentUse: formData.contentUse,
      weather: formData.weather,
      transport: formData.transport,
      estimatedBudget: formData.estimatedBudget,
      clientContact: {
        name: formData.clientContactName,
        phone: formData.clientContactPhone,
      },
      shootSchedule: formData.shootSchedule.filter((s) => s.time || s.task),
      checklist: formData.checklist.filter((c) => c.task),
      notes: formData.notes,
      specialInstructions: formData.specialInstructions,
      createdBy: currentUser?._id,
    };

    try {
      if (selectedShoot) {
        await axiosInstance.put(
          `/shoot-calendar/${selectedShoot._id}`,
          payload,
        );
        toast.success("Shoot updated successfully");
      } else {
        await axiosInstance.post("/shoot-calendar", payload);
        toast.success("Shoot created successfully");
      }
      fetchShoots();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error saving shoot");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedShoot) return;
    if (!window.confirm("Are you sure you want to delete this shoot?")) return;

    try {
      await axiosInstance.delete(`/shoot-calendar/${selectedShoot._id}`);
      toast.success("Shoot deleted");
      fetchShoots();
      closeModal();
    } catch (error) {
      toast.error("Failed to delete shoot");
      console.error(error);
    }
  };

  const handleDeleteShoot = async (shoot) => {
    if (!window.confirm("Are you sure you want to delete this shoot?")) return;

    try {
      await axiosInstance.delete(`/shoot-calendar/${shoot._id}`);
      toast.success("Shoot deleted");
      fetchShoots();
    } catch (error) {
      toast.error("Failed to delete shoot");
      console.error(error);
    }
  };

  const openViewOffcanvas = (shoot) => {
    setViewShoot(shoot);
    setIsViewOpen(true);
  };

  const closeViewOffcanvas = () => {
    setIsViewOpen(false);
    setViewShoot(null);
  };

  const filteredShoots = shoots.filter((shoot) => {
    // Check if client filter is applied
    if (
      selectedClientFilter &&
      shoot.client?._id !== selectedClientFilter &&
      shoot.client !== selectedClientFilter
    ) {
      return false;
    }

    // Role-based visibility
    if (
      currentUser?.role &&
      currentUser.role !== "admin" &&
      currentUser.role !== "operationmanager"
    ) {
      const currentUserId = String(currentUser._id);

      const isCreator =
        String(shoot.createdBy?._id || shoot.createdBy) === currentUserId;
      const isAssigned =
        String(shoot.assignedTo?._id || shoot.assignedTo) === currentUserId;
      const inTeam = shoot.shootTeam?.some(
        (member) => String(member?._id || member) === currentUserId,
      );

      if (!isCreator && !isAssigned && !inTeam) {
        return false;
      }
    }

    return true;
  });

  // Transform data for react-big-calendar
  const events = filteredShoots.map((shoot) => {
    const dateStr = shoot.schedule?.shootDate
      ? new Date(shoot.schedule.shootDate).toISOString().split("T")[0]
      : "";

    let start = new Date();
    let end = new Date();

    if (dateStr) {
      start = parseDateTime(dateStr, shoot.schedule?.startTime);
      end = parseDateTime(dateStr, shoot.schedule?.endTime);
    }

    return {
      id: shoot._id,
      title: shoot.shootTitle,
      start,
      end,
      allDay: false, // Must be false for time grid rendering
      resource: {
        ...shoot,
        onEdit: () => openModal(shoot),
        onDelete: () => handleDeleteShoot(shoot),
        onView: () => openViewOffcanvas(shoot),
      },
    };
  });

  // Customizing default react-big-calendar wrapper to remove internal padding
  const eventWrapperStyle = {
    style: { padding: "2px", backgroundColor: "transparent", border: "none" },
  };

  const eventStyleGetter = () => {
    return {
      style: {
        backgroundColor: "transparent",
        border: "none",
      },
    };
  };

  // Min and max times for the calendar (7 AM to 8 PM)
  const minTime = new Date();
  minTime.setHours(7, 0, 0);

  const maxTime = new Date();
  maxTime.setHours(20, 0, 0);

  const totalShoots = filteredShoots.length;
  const getCount = (status) =>
    filteredShoots.filter((s) => s.status === status).length;
  const getPercentage = (count) =>
    totalShoots === 0 ? "0%" : `${((count / totalShoots) * 100).toFixed(1)}%`;

  const statsCards = [
    {
      title: "Total Shoots",
      value: totalShoots,
      subtitle: "All time",
      icon: <FiCalendar size={22} className="text-blue-600" />,
      bg: "bg-blue-100",
      subtitleColor: "text-gray-500",
    },
    {
      title: "Confirmed",
      value: getCount("Confirmed"),
      subtitle: getPercentage(getCount("Confirmed")),
      icon: <FiCheckCircle size={22} className="text-green-600" />,
      bg: "bg-green-100",
      subtitleColor: "text-green-500",
    },
    {
      title: "In Progress",
      value: getCount("In Progress"),
      subtitle: getPercentage(getCount("In Progress")),
      icon: <FiClock size={22} className="text-blue-500" />,
      bg: "bg-blue-100",
      subtitleColor: "text-blue-500",
    },
    {
      title: "Planned",
      value: getCount("Planned"),
      subtitle: getPercentage(getCount("Planned")),
      icon: <FiClipboard size={22} className="text-purple-600" />,
      bg: "bg-purple-100",
      subtitleColor: "text-purple-500",
    },
    {
      title: "Completed",
      value: getCount("Completed"),
      subtitle: "This Month",
      icon: <FiCheckSquare size={22} className="text-emerald-600" />,
      bg: "bg-emerald-100",
      subtitleColor: "text-gray-500",
    },
    {
      title: "Pending",
      value: getCount("Pending Approval"),
      subtitle: "Needs Action",
      icon: <FiAlertCircle size={22} className="text-orange-500" />,
      bg: "bg-orange-100",
      subtitleColor: "text-gray-500",
    },
    {
      title: "At Risk",
      value: getCount("At Risk"),
      subtitle: "Needs Attention",
      icon: <FiAlertTriangle size={22} className="text-red-500" />,
      bg: "bg-red-100",
      subtitleColor: "text-gray-500",
    },
  ];

  return (
    <div className="max-w-8xl mx-auto min-h-[calc(100vh-64px)] flex flex-col pt-6 pb-2">
      <div className="flex justify-between items-center mb-6 px-5 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Shoot Calendar </h1>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedClientFilter}
            onChange={(e) => setSelectedClientFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white min-w-[200px]"
          >
            <option value="">All Clients</option>
            {clients.map((client) => (
              <option key={client._id} value={client._id}>
                {client.companyName}
              </option>
            ))}
          </select>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm text-sm"
          >
            <FiPlus /> Add Shoot
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6 px-5 shrink-0">
        {statsCards.map((card, idx) => (
          <div
            key={idx}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-4"
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${card.bg}`}
            >
              {card.icon}
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                {card.title}
              </p>
              <h3 className="text-lg font-bold text-gray-800 leading-tight">
                {card.value}
              </h3>
              <p
                className={`text-[10px] font-medium mt-0.5 ${card.subtitleColor}`}
              >
                {card.subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col mx-5 mb-5 min-h-[800px]">
        {/* Full-width Calendar */}
        <div className="w-full flex flex-col h-full">
          <style
            dangerouslySetInnerHTML={{
              __html: `
            .rbc-time-view { border: none; }
            .rbc-time-header { border-bottom: 1px solid #f3f4f6; margin-bottom: 10px;}
            .rbc-header { border-bottom: none !important; border-left: none !important; }
            .rbc-day-bg { border-left: 1px solid #f9fafb !important; }
            .rbc-timeslot-group { border-bottom: 1px solid #f3f4f6 !important; min-height: 60px; }
            .rbc-time-content { border-top: none; }
            .rbc-time-gutter .rbc-timeslot-group { border-left: none; border-bottom: none !important; }
            .rbc-label { font-size: 11px; color: #6b7280; font-weight: 500; padding: 0 8px; }
            .rbc-event { padding: 0 !important; background: transparent !important; }
            .rbc-allday-cell { display: none; }
            .rbc-time-header-content { border-left: none !important; }
            .rbc-today { background-color: transparent !important; }
            .rbc-current-time-indicator { background-color: #4f46e5; }
          `,
            }}
          />

          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            defaultView="week"
            views={["month", "week", "day", "agenda"]}
            step={60}
            timeslots={1}
            min={minTime}
            max={maxTime}
            style={{ height: "100%", border: "none" }}
            onSelectEvent={(event) => openViewOffcanvas(event.resource)}
            eventPropGetter={eventStyleGetter}
            components={{
              toolbar: CustomToolbar,
              event: CustomEvent,
              header: CustomDateHeader,
            }}
          />

          {/* Legend */}
          <div className="mt-6 flex flex-wrap gap-4 items-center px-4 text-xs font-medium text-gray-600">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>{" "}
              Confirmed
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div> In
              Progress
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div>{" "}
              Planned
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-500"></div>{" "}
              Pending Approval
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> At
              Risk
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>{" "}
              Completed
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-4 sm:p-6">
          <div className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] ring-1 ring-black/5">
            {/* Header */}
            <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                {selectedShoot ? "Edit Shoot Details" : "Schedule New Shoot"}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full p-2 transition-all"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-8 overflow-y-auto bg-gray-50/30">
              <form
                id="shoot-form"
                onSubmit={handleSubmit}
                className="space-y-8"
              >
                {/* Core Details */}
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                    <div className="w-6 h-[1px] bg-gray-300"></div> Core Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Client <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="client"
                        required
                        value={formData.client}
                        onChange={handleInputChange}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                      >
                        <option value="">Select a client</option>
                        {clients.map((client) => (
                          <option key={client._id} value={client._id}>
                            {client.companyName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Shoot Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="shootTitle"
                        required
                        value={formData.shootTitle}
                        onChange={handleInputChange}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        placeholder="e.g. Diwali Special Video"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Shoot Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="shootType"
                        required
                        value={formData.shootType}
                        onChange={handleInputChange}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                      >
                        {SHOOT_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedShoot && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                          Status
                        </label>
                        <select
                          name="status"
                          value={formData.status}
                          onChange={handleInputChange}
                          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        >
                          {SHOOT_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Schedule & Location */}
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                    <div className="w-6 h-[1px] bg-gray-300"></div> Schedule &
                    Location
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="shootDate"
                        required
                        value={formData.shootDate}
                        onChange={handleInputChange}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Start Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="startTime"
                        required
                        value={formData.startTime}
                        onChange={handleInputChange}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        placeholder="09:00 AM"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        End Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="endTime"
                        required
                        value={formData.endTime}
                        onChange={handleInputChange}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        placeholder="01:00 PM"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Location
                      </label>
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        placeholder="e.g. Studio A, ECR Road, Chennai"
                      />
                    </div>
                  </div>
                </div>

                {/* Team & Resources */}
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                    <div className="w-6 h-[1px] bg-gray-300"></div> Team &
                    Resources
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Assigned To (Lead)
                      </label>
                      <select
                        name="assignedTo"
                        value={formData.assignedTo}
                        onChange={handleInputChange}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                      >
                        <option value="">Select Assignee</option>
                        {users.map((user) => (
                          <option key={user._id} value={user._id}>
                            {user.name} ({user.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex justify-between items-center">
                        Shoot Team
                        <span className="text-[10px] font-normal text-gray-400">
                          Hold Ctrl/Cmd for multiple
                        </span>
                      </label>
                      <select
                        name="shootTeam"
                        multiple
                        value={formData.shootTeam}
                        onChange={handleInputChange}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all custom-scrollbar"
                        size="3"
                      >
                        {users.map((user) => (
                          <option
                            key={user._id}
                            value={user._id}
                            className="p-1.5 mb-1 rounded-md hover:bg-gray-100"
                          >
                            {user.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Transport Needs
                      </label>
                      <input
                        type="text"
                        name="transport"
                        value={formData.transport}
                        onChange={handleInputChange}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        placeholder="e.g. Agency Vehicle required"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Estimated Budget (₹)
                      </label>
                      <input
                        type="number"
                        name="estimatedBudget"
                        value={formData.estimatedBudget}
                        onChange={handleInputChange}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        placeholder="8500"
                      />
                    </div>
                  </div>
                </div>

                {/* Scope & Details */}
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                    <div className="w-6 h-[1px] bg-gray-300"></div> Scope &
                    Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Purpose
                      </label>
                      <input
                        type="text"
                        name="purpose"
                        value={formData.purpose}
                        onChange={handleInputChange}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        placeholder="e.g. Menu Photos & Reels"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Content Use
                      </label>
                      <input
                        type="text"
                        name="contentUse"
                        value={formData.contentUse}
                        onChange={handleInputChange}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        placeholder="e.g. Instagram, Facebook"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Weather / Environment
                      </label>
                      <input
                        type="text"
                        name="weather"
                        value={formData.weather}
                        onChange={handleInputChange}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        placeholder="e.g. Indoor / Outdoor Clear"
                      />
                    </div>
                  </div>
                </div>

                {/* Client Contact */}
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                    <div className="w-6 h-[1px] bg-gray-300"></div> Client
                    Contact
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Contact Name
                      </label>
                      <input
                        type="text"
                        name="clientContactName"
                        value={formData.clientContactName}
                        onChange={handleInputChange}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        placeholder="Name of SPOC"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Contact Phone
                      </label>
                      <input
                        type="text"
                        name="clientContactPhone"
                        value={formData.clientContactPhone}
                        onChange={handleInputChange}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        placeholder="+91 9876543210"
                      />
                    </div>
                  </div>
                </div>

                {/* Descriptions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none transition-all"
                      placeholder="Additional details about the shoot..."
                    ></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Special Instructions / Notes
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none transition-all"
                      placeholder="e.g. Focus on new monsoon menu items. Capture close-ups for reels."
                    ></textarea>
                  </div>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-gray-100 bg-white flex justify-between items-center shrink-0">
              {selectedShoot ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl transition-colors flex items-center gap-2 text-sm font-bold"
                >
                  <FiTrash2 size={16} /> Delete Shoot
                </button>
              ) : (
                <div></div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-bold transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="shoot-form"
                  disabled={loading}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md shadow-indigo-600/20 disabled:opacity-70 flex items-center gap-2 text-sm"
                >
                  {loading ? "Saving..." : "Save Shoot Details"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Offcanvas */}
      {isViewOpen && viewShoot && (
        <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl flex flex-col transform transition-transform duration-300 translate-x-0">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <h2 className="text-xl font-bold text-gray-900">Shoot Details</h2>
              <button
                onClick={closeViewOffcanvas}
                className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full p-2 transition-all"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="p-6 flex-1 space-y-6">
              {/* Status and Title */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-md">
                    {viewShoot.status}
                  </span>
                  <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-md">
                    {viewShoot.shootType}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  {viewShoot.shootTitle}
                </h1>
                <p className="text-gray-500 text-sm">
                  Client: {viewShoot.client?.companyName || "Unknown"}
                </p>
              </div>

              {/* Schedule */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <FiClock className="text-indigo-500" /> Schedule
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs mb-0.5">Date</p>
                    <p className="font-semibold text-gray-800">
                      {viewShoot.schedule?.shootDate
                        ? new Date(
                            viewShoot.schedule.shootDate,
                          ).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-0.5">Time</p>
                    <p className="font-semibold text-gray-800">
                      {viewShoot.schedule?.startTime} -{" "}
                      {viewShoot.schedule?.endTime}
                    </p>
                  </div>
                </div>
              </div>

              {/* Location & Contact */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 bg-gray-100 p-2 rounded-lg text-gray-500">
                    <FiMapPin size={16} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-0.5">
                      Location
                    </p>
                    <p className="text-sm font-semibold text-gray-800">
                      {viewShoot.location || "TBD"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-0.5 bg-gray-100 p-2 rounded-lg text-gray-500">
                    <FiUser size={16} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-0.5">
                      Client Contact
                    </p>
                    <p className="text-sm font-semibold text-gray-800">
                      {viewShoot.clientContact?.name || "N/A"}
                      {viewShoot.clientContact?.phone &&
                        ` (${viewShoot.clientContact.phone})`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Team */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3 border-b pb-2">
                  Team
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Assigned To (Lead)</span>
                    <span className="font-semibold text-gray-800">
                      {viewShoot.assignedTo?.name || "Unassigned"}
                    </span>
                  </div>
                  {viewShoot.shootTeam?.length > 0 && (
                    <div className="text-sm">
                      <span className="text-gray-500 block mb-1">
                        Shoot Team
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {viewShoot.shootTeam.map((member, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 bg-gray-100 border border-gray-200 text-gray-700 rounded-full text-xs font-medium"
                          >
                            {member.name || member}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Details */}
              {(viewShoot.description || viewShoot.notes) && (
                <div>
                  <h3 className="text-sm font-bold text-gray-700 mb-3 border-b pb-2">
                    Additional Details
                  </h3>
                  {viewShoot.description && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 font-medium mb-1">
                        Description
                      </p>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100 whitespace-pre-wrap">
                        {viewShoot.description}
                      </p>
                    </div>
                  )}
                  {viewShoot.notes && (
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-1">
                        Special Instructions
                      </p>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100 whitespace-pre-wrap">
                        {viewShoot.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3 sticky bottom-0">
              <button
                onClick={() => {
                  closeViewOffcanvas();
                  openModal(viewShoot);
                }}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <FiEdit2 size={16} /> Edit Shoot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShootCalendor;
