import axios from "axios";
const API = axios.create({ baseURL: "http://localhost:5000/api" });
export const getDepartments = () => API.get("/departments");
export const getQuestions = () => API.get("/questions");
export const createEvent = (data) => API.post("/events", data);
export const submitResponse = (data) => API.post("/responses", data);
export const exportExcel = () => API.get("/responses/export");