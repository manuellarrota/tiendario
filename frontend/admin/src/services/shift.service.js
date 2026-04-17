import axios from "axios";
import authHeader from "./auth-header";

const API_URL = import.meta.env.VITE_API_URL + "/shifts/";

const getCurrentShift = () => {
  return axios.get(API_URL + "current", { headers: authHeader() });
};

const openShift = (initialCash) => {
  return axios.post(API_URL + "open", { initialCash }, { headers: authHeader() });
};

const closeShift = (shiftId, data) => {
  return axios.post(API_URL + `${shiftId}/close`, data, { headers: authHeader() });
};

const verifyShift = (shiftId, observation) => {
  return axios.post(API_URL + `${shiftId}/verify`, { observation }, { headers: authHeader() });
};

const getHistory = () => {
  return axios.get(API_URL + "history", { headers: authHeader() });
};

const ShiftService = {
  getCurrentShift,
  openShift,
  closeShift,
  verifyShift,
  getHistory
};

export default ShiftService;
