import axios from "axios";
import AuthService from "./auth.service";

const API_URL = import.meta.env.VITE_API_URL + "/purchases";

const getAuthHeader = () => {
    const user = AuthService.getCurrentUser();
    if (user && user.token) {
        return { Authorization: 'Bearer ' + user.token };
    } else {
        return {};
    }
}

const getAll = (page = 0, size = 10, filters = {}) => {
    const params = { page, size };
    if (filters.supplier) params.supplier = filters.supplier;
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;
    if (filters.paymentMethod && filters.paymentMethod !== 'ALL') params.paymentMethod = filters.paymentMethod;
    return axios.get(API_URL, { params, headers: getAuthHeader() });
};

const create = (data) => {
    return axios.post(API_URL, data, { headers: getAuthHeader() });
};

const getAdjustments = (purchaseId) => {
    return axios.get(`${API_URL}/${purchaseId}/adjustments`, { headers: getAuthHeader() });
};

const createAdjustment = (purchaseId, data) => {
    return axios.post(`${API_URL}/${purchaseId}/adjustments`, data, { headers: getAuthHeader() });
};

const voidPurchase = (purchaseId, reason) => {
    return axios.post(`${API_URL}/${purchaseId}/void`, { reason }, { headers: getAuthHeader() });
};

const updateCosts = (purchaseId, items) => {
    return axios.patch(`${API_URL}/${purchaseId}/costs`, { items }, { headers: getAuthHeader() });
};

const PurchaseService = {
    getAll,
    create,
    getAdjustments,
    createAdjustment,
    voidPurchase,
    updateCosts,
};

export default PurchaseService;
