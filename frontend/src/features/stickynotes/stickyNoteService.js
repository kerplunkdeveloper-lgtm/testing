import axiosInstance from "../../services/axiosInstance";

const API_URL = "/stickynotes/";

// Get user sticky notes
const getStickyNotes = async () => {
  const response = await axiosInstance.get(API_URL);
  return response.data;
};

// Create new sticky note
const createStickyNote = async (stickyNoteData) => {
  const response = await axiosInstance.post(API_URL, stickyNoteData);
  return response.data;
};

// Update sticky note
const updateStickyNote = async (stickyNoteId, stickyNoteData) => {
  const response = await axiosInstance.put(API_URL + stickyNoteId, stickyNoteData);
  return response.data;
};

// Delete sticky note
const deleteStickyNote = async (stickyNoteId) => {
  const response = await axiosInstance.delete(API_URL + stickyNoteId);
  return response.data;
};

const stickyNoteService = {
  getStickyNotes,
  createStickyNote,
  updateStickyNote,
  deleteStickyNote,
};

export default stickyNoteService;
