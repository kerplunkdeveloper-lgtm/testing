import React, { useState, useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  getStickyNotes,
  createStickyNote,
  updateStickyNote,
  deleteStickyNote,
  reset,
} from "../../features/stickynotes/stickyNoteSlice";
import {
  FiBold,
  FiItalic,
  FiUnderline,
  FiList,
  FiImage,
  FiPlus,
  FiTrash2,
  FiCheck,
} from "react-icons/fi";
import { BiStrikethrough } from "react-icons/bi";
import toast from "react-hot-toast";

const COLORS = [
  { name: "yellow", class: "bg-yellow-200 dark:bg-yellow-900/30", border: "border-yellow-200 dark:border-yellow-700/50" },
  { name: "blue", class: "bg-blue-200 dark:bg-blue-900/30", border: "border-blue-200 dark:border-blue-700/50" },
  { name: "pink", class: "bg-pink-200 dark:bg-pink-900/30", border: "border-pink-200 dark:border-pink-700/50" },
  { name: "purple", class: "bg-purple-200 dark:bg-purple-900/30", border: "border-purple-200 dark:border-purple-700/50" },
  { name: "gray", class: "bg-gray-200 dark:bg-gray-900/30", border: "border-gray-200 dark:border-gray-700/50" },
];

const StickyNoteEditor = ({ note, onSave, onDelete, currentUser }) => {
  const [content, setContent] = useState(note.content || "");
  const [color, setColor] = useState(note.color || "yellow");
  const editorRef = useRef(null);
  
  // Ref to track if we need to sync to backend to avoid infinite loop
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (editorRef.current && note.content !== editorRef.current.innerHTML && !isTypingRef.current) {
      editorRef.current.innerHTML = note.content;
      setContent(note.content);
    }
  }, [note.content]);

  // Debounced save for content changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isTypingRef.current) {
        onSave({ ...note, content, color });
        isTypingRef.current = false;
      }
    }, 1000); // Autosave after 1 second of inactivity

    return () => clearTimeout(timeoutId);
  }, [content, color, note, onSave]);

  const handleCommand = (cmd, arg = null) => {
    document.execCommand(cmd, false, arg);
    editorRef.current.focus();
    isTypingRef.current = true;
    setContent(editorRef.current.innerHTML);
  };

  const handleColorChange = (newColor) => {
    setColor(newColor);
    // Immediate save for color change
    onSave({ ...note, content, color: newColor });
  };

  const selectedColorObj = COLORS.find((c) => c.name === color) || COLORS[0];
  
  const creatorName = note.user?.name || currentUser?.name || "You";
  const dateFormatted = new Date(note.createdAt || Date.now()).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`relative rounded-lg shadow-sm border flex flex-col transition-all duration-200 ${selectedColorObj.class} ${selectedColorObj.border} w-full max-w-sm overflow-hidden`}
    >
      {/* Action Bar (Top) */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5">
        <div className="flex gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c.name}
              onClick={() => handleColorChange(c.name)}
              className={`w-5 h-5 rounded-full cursor-pointer transition-transform hover:scale-110 ${
                color === c.name ? "ring-2 ring-black/50 dark:ring-white/50 ring-offset-1" : ""
              }`}
              style={{
                backgroundColor: `var(--color-${c.name}-300)`,
              }}
              title={c.name}
            >
              <div className={`w-full h-full rounded-full ${c.class.split(" ")[0].replace("/90", "")}`}></div>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onDelete} className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded cursor-pointer text-slate-600 dark:text-slate-300">
            <FiTrash2 size={14} />
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div
        ref={editorRef}
        contentEditable
        className="flex-1 p-4 min-h-[160px] max-h-[300px] overflow-y-auto focus:outline-none text-slate-800 dark:text-slate-200 text-sm placeholder-slate-400"
        onInput={(e) => {
          isTypingRef.current = true;
          setContent(e.currentTarget.innerHTML);
        }}
        suppressContentEditableWarning={true}
        style={{
          "--placeholder-color": "rgba(156, 163, 175, 0.7)"
        }}
      />
      {content === "" && (
        <div className="absolute top-[52px] left-4 text-slate-400 dark:text-slate-500 text-sm pointer-events-none">
          Take a note...
        </div>
      )}

      {/* Author and Date */}
      <div className="px-4 pb-2 pt-1">
        <div className="text-[10px] font-medium text-black/40 dark:text-white/40 flex justify-between">
          <span>By {creatorName}</span>
          <span>{dateFormatted}</span>
        </div>
      </div>

      {/* Formatting Bar (Bottom) */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5">
        <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
          <button onClick={() => handleCommand("bold")} className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded cursor-pointer">
            <FiBold size={15} />
          </button>
          <button onClick={() => handleCommand("italic")} className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded cursor-pointer">
            <FiItalic size={15} />
          </button>
          <button onClick={() => handleCommand("underline")} className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded cursor-pointer">
            <FiUnderline size={15} />
          </button>
          <button onClick={() => handleCommand("strikeThrough")} className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded cursor-pointer">
            <BiStrikethrough size={16} />
          </button>
          <div className="w-px h-4 bg-black/10 dark:bg-white/10 mx-1"></div>
          <button onClick={() => handleCommand("insertUnorderedList")} className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded cursor-pointer">
            <FiList size={15} />
          </button>
        </div>
        <div className="text-[10px] text-slate-400 dark:text-slate-500 italic pr-2">
          Autosaved
        </div>
      </div>
    </div>
  );
};

const Stickynotes = () => {
  const dispatch = useDispatch();
  const { stickyNotes, isLoading, isError, message } = useSelector(
    (state) => state.stickyNotes
  );
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isError) {
      toast.error(message);
    }
    dispatch(getStickyNotes());
    return () => {
      dispatch(reset());
    };
  }, [dispatch, isError, message]);

  const handleCreateNewNote = async () => {
    await dispatch(createStickyNote({ content: " ", color: "yellow" }));
    toast.success("New sticky note added!");
  };

  const handleUpdate = useCallback(
    (noteData) => {
      dispatch(updateStickyNote({ id: noteData._id, stickyNoteData: noteData }));
    },
    [dispatch]
  );

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this note?")) {
      await dispatch(deleteStickyNote(id));
      toast.success("Sticky note deleted!");
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold"></h1>
          <button
            onClick={handleCreateNewNote}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm cursor-pointer"
          >
            <FiPlus size={18} />
            <span>New Note</span>
          </button>
        </div>

        {isLoading && stickyNotes.length === 0 ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 items-start">
            {stickyNotes.map((note) => (
              <StickyNoteEditor
                key={note._id}
                note={note}
                onSave={handleUpdate}
                onDelete={() => handleDelete(note._id)}
                currentUser={user}
              />
            ))}
            {stickyNotes.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-slate-400">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                  <FiImage size={32} />
                </div>
                <h3 className="text-lg font-medium text-slate-600 dark:text-slate-300">No sticky notes yet</h3>
                <p className="mt-1 text-sm text-center">Click "New Note" to create your first sticky note.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Stickynotes;
