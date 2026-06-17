import axios from "axios";
import authHeader from "./auth-header";

const API_URL = import.meta.env.VITE_API_URL + "/shifts";

const getCurrentShift = () => {
  return axios.get(API_URL + "/current", { headers: authHeader() });
};

const openShift = (initialCash, extraData = {}) => {
  return axios.post(API_URL + "/open", { initialCash, ...extraData }, { headers: authHeader() });
};

const closeShift = (shiftId, data) => {
  return axios.post(API_URL + `/${shiftId}/close`, data, { headers: authHeader() });
};

const verifyShift = (shiftId, observation, hasIssues = false) => {
  return axios.post(API_URL + `/${shiftId}/verify`, { observation, hasIssues }, { headers: authHeader() });
};

const getHistory = () => {
  return axios.get(API_URL + "/history", { headers: authHeader() });
};

const registerCashMovement = (shiftId, data) => {
  return axios.post(API_URL + `/${shiftId}/movement`, data, { headers: authHeader() });
};

const transferCash = (shiftId, data) => {
  return axios.post(API_URL + `/${shiftId}/transfer`, data, { headers: authHeader() });
};

const ShiftService = {
  getCurrentShift,
  openShift,
  closeShift,
  verifyShift,
  getHistory,
  registerCashMovement,
  transferCash
};

export default ShiftService;
