import axios from "axios";
import AuthService from "./auth.service";

const API_URL = import.meta.env.VITE_API_URL + "/sales/";

const getSales = (page = 0, size = 10, status = null) => {
    const user = AuthService.getCurrentUser();
    const params = { page, size };
    if (status && status !== 'ALL') {
        params.status = status;
    }
    return axios.get(API_URL, {
        params,
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const getSaleById = (id) => {
    const user = AuthService.getCurrentUser();
    return axios.get(API_URL + id, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const createSale = (saleData) => {
    const user = AuthService.getCurrentUser();
    return axios.post(API_URL, saleData, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const updateStatus = (id, status, paymentMethod = null) => {
    const user = AuthService.getCurrentUser();
    const params = { status };
    if (paymentMethod) {
        params.paymentMethod = paymentMethod;
    }
    return axios.put(API_URL + id + "/status", null, {
        params,
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const getDailySummary = () => {
    const user = AuthService.getCurrentUser();
    return axios.get(API_URL + "daily-summary", {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const SaleService = {
    getSales,
    getSaleById,
    createSale,
    updateStatus,
    getDailySummary
};

export default SaleService;
