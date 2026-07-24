import axiosInstance from "../../services/axiosInstance";

// GET ALL EVENTS
export const getEventsAPI = async () => {
  const response = await axiosInstance.get("/events");
  return response.data;
};

// CREATE EVENT
export const createEventAPI = async (eventData) => {
  const response = await axiosInstance.post("/events", eventData);
  return response.data;
};

// UPDATE EVENT
export const updateEventAPI = async (id, eventData) => {
  const response = await axiosInstance.put(`/events/${id}`, eventData);
  return response.data;
};

// DELETE EVENT
export const deleteEventAPI = async (id) => {
  const response = await axiosInstance.delete(`/events/${id}`);
  return response.data;
};
