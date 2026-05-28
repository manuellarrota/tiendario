import axios from "axios";
import authHeader from "./auth-header";

const API_URL = import.meta.env.VITE_API_URL + "/cash-registers";

const getAvailableRegisters = () => {
    return axios.get(API_URL + "/available", { headers: authHeader() });
};

const getAllRegisters = () => {
    return axios.get(API_URL, { headers: authHeader() });
};

const CashRegisterService = {
    getAvailableRegisters,
    getAllRegisters
};

export default CashRegisterService;
