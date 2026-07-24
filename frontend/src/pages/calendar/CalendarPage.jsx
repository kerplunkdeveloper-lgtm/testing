import React, { useState, useEffect, useRef } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import enIN from "date-fns/locale/en-IN";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useDispatch, useSelector } from "react-redux";
import {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} from "../../features/events/eventSlice";
import {
  FiPlus,
  FiCalendar,
  FiTrash2,
  FiInstagram,
  FiVideo,
  FiLayers,
  FiTarget,
  FiFileText,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import EventModal from "./EventModal";
import toast from "react-hot-toast";
import ClientBadge from "../../components/common/ClientBadge";
import { getClientIconComponent } from "../../utils/clientHelpers";

const locales = { "en-IN": enIN };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

const TYPE_COLORS = {
  Post: "#3b82f6",
  Reel: "#ef4444",
  Story: "#8b5cf6",
  Ad: "#f59e0b",
  Report: "#10b981",
  "Birthday Celebration": "#ec4899",
};

const playNotificationSound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const playTone = (frequency, startTime, duration) => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, startTime);
      gainNode.gain.setValueAtTime(0.15, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    const now = audioCtx.currentTime;
    playTone(1046.5, now, 0.15); // C6 tone
    playTone(1567.98, now + 0.1, 0.3); // G6 tone
  } catch (error) {
    console.error("Audio Context not supported or allowed:", error);
  }
};

const CalendarPage = () => {
  const dispatch = useDispatch();
  const { events } = useSelector((s) => s.events);

  const [openModal, setOpenModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const notifiedEvents = useRef(new Set());

  useEffect(() => {
    dispatch(getEvents());
  }, [dispatch]);

  useEffect(() => {
    if (!events || events.length === 0) return;

    const checkUpcomingEvents = () => {
      const now = new Date();
      let shouldPlaySound = false;

      events.forEach((event) => {
        const eventTime = new Date(event.date);
        const timeDiffMs = eventTime.getTime() - now.getTime();
        const timeDiffMins = timeDiffMs / (1000 * 60);

        // Notify if the event starts in the next 10 minutes (or has started in the last 1 minute)
        // and has not been notified yet.
        if (timeDiffMins >= -1 && timeDiffMins <= 10) {
          if (!notifiedEvents.current.has(event._id)) {
            notifiedEvents.current.add(event._id);
            shouldPlaySound = true;

            toast(
              (t) => (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                    <FiCalendar size={15} />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-wide">
                      Event Starting Soon!
                    </h4>
                    <p className="text-xs font-bold text-slate-700 mt-0.5">
                      {event.title}
                    </p>
                    <p className="text-[9px] text-gray-400 font-semibold">
                      {event.client?.companyName || "Client Event"} at{" "}
                      {eventTime.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ),
              {
                duration: 8000,
                position: "top-right",
                style: {
                  borderRadius: "16px",
                  background: "#ffffff",
                  color: "#1e293b",
                  boxShadow:
                    "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                  border: "1px solid #f1f5f9",
                  padding: "12px",
                },
              },
            );
          }
        }
      });

      if (shouldPlaySound) {
        playNotificationSound();
      }
    };

    checkUpcomingEvents();
    const interval = setInterval(checkUpcomingEvents, 30000);
    return () => clearInterval(interval);
  }, [events]);

  const handleSelectSlot = ({ start }) => {
    setSelectedEvent({ start });
    setIsEditing(false);
    setOpenModal(true);
  };

  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
    setIsEditing(true);
    setOpenModal(true);
  };

  const handleEventSubmit = async (formData) => {
    try {
      if (isEditing) {
        await dispatch(
          updateEvent({ id: selectedEvent._id, eventData: formData }),
        ).unwrap();
        toast.success("Event Updated");
      } else {
        await dispatch(createEvent(formData)).unwrap();
        toast.success("Event Scheduled");
      }
      setOpenModal(false);
      setSelectedEvent(null);
    } catch (err) {
      toast.error(err);
    }
  };

  const handleDeleteEvent = async () => {
    if (!window.confirm("Delete this event?")) return;
    try {
      await dispatch(deleteEvent(selectedEvent._id)).unwrap();
      toast.success("Event Deleted");
      setOpenModal(false);
      setSelectedEvent(null);
    } catch (err) {
      toast.error(err);
    }
  };

  const calendarEvents = events.map((e) => {
    const start = new Date(e.date);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    return { ...e, start, end };
  });

  const eventStyleGetter = (event) => ({
    style: {
      backgroundColor: TYPE_COLORS[event.type] || "#3b82f6",
      borderRadius: "8px",
      color: "white",
      border: "none",
      fontSize: "0.7rem",
      padding: "0",
      boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
    },
  });

  const ICONS = {
    Post: <FiInstagram />,
    Reel: <FiVideo />,
    Story: <FiLayers />,
    Ad: <FiTarget />,
    Report: <FiFileText />,
    "Birthday Celebration": <FiCalendar />
  };

  const CustomEvent = ({ event }) => {
    const ClientIcon = event.client ? getClientIconComponent(event.client.icon) : null;
    const clientColor = event.client?.color || "#3b82f6";
    return (
      <div className="flex flex-col px-1.5 py-0.5 h-full overflow-hidden text-left">
        <div className="flex items-center gap-1.5 font-bold truncate">
          <span className="text-[9px] opacity-80 shrink-0">{ICONS[event.type]}</span>
          {event.client && (
            <ClientBadge client={event.client} size="sm" className="!text-[8px] !px-1.5 !py-0.5" />
          )}
        </div>
        <div className="truncate text-[10px] leading-tight font-semibold mt-0.5">{event.title}</div>
      </div>
    );
  };

  const CustomToolbar = (toolbar) => {
    const goToBack = () => {
      toolbar.onNavigate("PREV");
    };

    const goToNext = () => {
      toolbar.onNavigate("NEXT");
    };

    const goToCurrent = () => {
      toolbar.onNavigate("TODAY");
    };

    const toggleView = (view) => {
      toolbar.onView(view);
    };

    return (
      <div className="flex flex-col md:flex-row  justify-between items-center gap-4 mb-5 p-1 ">
        {/* Navigation Buttons (Back, Today, Next) */}
        <div className="flex items-center gap-1 bg-slate-150/70 dark:bg-transparent p-1.5 rounded-xl border border-slate-200/50 dark:border-slate-800">
          <button
            onClick={goToBack}
            className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-650 dark:text-slate-300 transition-all cursor-pointer hover:shadow-xs active:scale-95"
            title="Previous"
          >
            <FiChevronLeft size={16} />
          </button>
          <button
            onClick={goToCurrent}
            className="px-3 py-1 rounded-lg text-xs font-extrabold bg-white dark:bg-transparent text-slate-750 dark:text-slate-200 border border-slate-200/30 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-xs cursor-pointer active:scale-95"
          >
            Today
          </button>
          <button
            onClick={goToNext}
            className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-650 dark:text-slate-300 transition-all cursor-pointer hover:shadow-xs active:scale-95"
            title="Next"
          >
            <FiChevronRight size={16} />
          </button>
        </div>

        {/* Title (Month/Year) */}
        <h2 className="text-sm sm:text-base font-black text-slate-800 dark:text-yellow-50 uppercase tracking-wider">
          {toolbar.label}
        </h2>

        {/* View Switchers (Month, Week, Day) */}
        <div className="flex items-center gap-1 bg-slate-150/70 dark:bg-transparent p-1.5 rounded-xl border border-slate-200/50 dark:border-slate-800">
          {toolbar.views.map((v) => {
            const isActive = toolbar.view === v;
            return (
              <button
                key={v}
                onClick={() => toggleView(v)}
                className={`px-3 py-1 rounded-lg text-xs font-extrabold capitalize transition-all cursor-pointer active:scale-95 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                {v}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen  max-w-6xl mx-auto ">
      <div className="py-4 sm:py-6 ">
        {/* HEADER */}
        <div className="flex justify-between items-center gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-0.5 ">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                <FiCalendar size={14} className="text-white" />
              </div>
              <h1 className="text-sm sm:text-lg md:text-xl font-bold text-slate-800 dark:text-yellow-50">
                Calender
              </h1>
            </div>
            <p className="text-[10px] sm:text-xs text-gray-400 dark:text-slate-400 ml-9 hidden xs:block">
              Orchestrate content cycles and marketing initiatives
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setSelectedEvent(null);
                setIsEditing(false);
                setOpenModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm  transition-all active:scale-95 shrink-0"
            >
              <FiPlus size={14} /> New Event
            </button>
          </div>
        </div>

        {/* CALENDAR */}
        <div
          className="rounded-2xl p-3 sm:p-5 shadow-sm"
          style={{ height: "calc(100vh - 160px)", minHeight: "500px" }}
        >
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: "100%" }}
            selectable
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            eventPropGetter={eventStyleGetter}
            components={{ event: CustomEvent, toolbar: CustomToolbar }}
            views={["month", "week", "day"]}
            className="compact-calendar"
          />
        </div>
      </div>

      <EventModal
        open={openModal}
        setOpen={setOpenModal}
        onSubmit={handleEventSubmit}
        initialData={selectedEvent}
        isEditing={isEditing}
        onDelete={handleDeleteEvent}
      />

      <style>{`
        .compact-calendar { color: #1e293b; }
        .dark .compact-calendar { color: #cbd5e1; }

        /* Month/Week/Day Views Outer Border */
        .compact-calendar .rbc-month-view,
        .compact-calendar .rbc-time-view {
          border: 1px solid #f1f5f9 !important;
          border-radius: 12px;
          overflow: hidden;
        }
        .dark .compact-calendar .rbc-month-view,
        .dark .compact-calendar .rbc-time-view {
          border: 1px solid #1e293b !important;
          background-color: #0f172a;
        }

        /* Headers styling */
        .compact-calendar .rbc-header {
          color: #64748b;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-size: 0.65rem;
          padding: 8px 0;
          background: #f8fafc;
          border-bottom: 1px solid #f1f5f9 !important;
        }
        .dark .compact-calendar .rbc-header {
          color: #94a3b8;
          background: #1e293b;
          border-bottom: 1px solid #1e293b !important;
        }
        
        .compact-calendar .rbc-header + .rbc-header {
          border-left: 1px solid #f1f5f9 !important;
        }
        .dark .compact-calendar .rbc-header + .rbc-header {
          border-left: 1px solid #1e293b !important;
        }

        /* Day BGs */
        .compact-calendar .rbc-day-bg {
          background-color: #ffffff;
        }
        .dark .compact-calendar .rbc-day-bg {
          background-color: #0f172a;
        }
        .compact-calendar .rbc-day-bg + .rbc-day-bg {
          border-left: 1px solid #f1f5f9 !important;
        }
        .dark .compact-calendar .rbc-day-bg + .rbc-day-bg {
          border-left: 1px solid #1e293b !important;
        }

        /* Rows */
        .compact-calendar .rbc-month-row {
          border-top: 1px solid #f1f5f9 !important;
        }
        .dark .compact-calendar .rbc-month-row {
          border-top: 1px solid #1e293b !important;
        }

        /* Today highlight */
        .compact-calendar .rbc-today {
          background-color: #eff6ff !important;
        }
        .dark .compact-calendar .rbc-today {
          background-color: rgba(59, 130, 246, 0.08) !important;
        }

        /* Out of range/off range days */
        .compact-calendar .rbc-off-range-bg {
          background-color: #f8fafc !important;
        }
        .dark .compact-calendar .rbc-off-range-bg {
          background-color: #0b0f19 !important;
        }

        /* Events display */
        .compact-calendar .rbc-event {
          padding: 2px 4px !important;
          margin-top: 1px !important;
          transition: all 0.2s ease;
        }
        .compact-calendar .rbc-event:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
          filter: brightness(1.05);
        }

        /* Event Content */
        .compact-calendar .rbc-event-content {
          font-size: 11px;
          font-weight: 600;
        }

        /* Time view settings (Week/Day) */
        .compact-calendar .rbc-time-header {
          background: #f8fafc;
        }
        .dark .compact-calendar .rbc-time-header {
          background: #1e293b;
        }

        .compact-calendar .rbc-time-header-content {
          border-left: 1px solid #f1f5f9 !important;
        }
        .dark .compact-calendar .rbc-time-header-content {
          border-left: 1px solid #1e293b !important;
        }

        .compact-calendar .rbc-time-content {
          border-top: 2px solid #f1f5f9 !important;
          background: #ffffff;
        }
        .dark .compact-calendar .rbc-time-content {
          border-top: 2px solid #1e293b !important;
          background: #0f172a;
        }

        .compact-calendar .rbc-time-gutter {
          background: #ffffff;
        }
        .dark .compact-calendar .rbc-time-gutter {
          background: #0f172a;
        }

        .compact-calendar .rbc-timeslot-group {
          border-bottom: 1px solid #f1f5f9 !important;
        }
        .dark .compact-calendar .rbc-timeslot-group {
          border-bottom: 1px solid #1e293b !important;
        }

        .compact-calendar .rbc-time-slot {
          border-top: 1px solid #f8fafc !important;
        }
        .dark .compact-calendar .rbc-time-slot {
          border-top: 1px solid #152033 !important;
        }

        .compact-calendar .rbc-day-slot {
          background: #ffffff;
        }
        .dark .compact-calendar .rbc-day-slot {
          background: #0f172a;
        }

        .compact-calendar .rbc-day-slot .rbc-time-slot {
          border-top: 1px solid #f1f5f9 !important;
        }
        .dark .compact-calendar .rbc-day-slot .rbc-time-slot {
          border-top: 1px solid #1e293b !important;
        }

        /* Show more button */
        .compact-calendar .rbc-show-more {
          font-weight: 750;
          color: #3b82f6;
          font-size: 10px;
          text-transform: uppercase;
          background: transparent;
        }
        .dark .compact-calendar .rbc-show-more {
          color: #60a5fa;
        }
      `}</style>
    </div>
  );
};

export default CalendarPage;
