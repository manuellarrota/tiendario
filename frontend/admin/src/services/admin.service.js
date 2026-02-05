import axios from "axios";
import AuthService from "./auth.service";

const API_URL = import.meta.env.VITE_API_URL + "/superadmin/";

const getGlobalStats = () => {
    const user = AuthService.getCurrentUser();
    return axios.get(API_URL + "stats", {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const getAllCompanies = () => {
    const user = AuthService.getCurrentUser();
    return axios.get(API_URL + "companies", {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const updateCompanySubscription = (id, status) => {
    const user = AuthService.getCurrentUser();
    return axios.put(API_URL + `companies/${id}/subscription`, { status }, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const getGlobalPayments = () => {
    const user = AuthService.getCurrentUser();
    return axios.get(API_URL + "payments", {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const approvePayment = (id) => {
    const user = AuthService.getCurrentUser();
    return axios.post(API_URL + `payments/${id}/approve`, {}, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const rejectPayment = (id, reason) => {
    const user = AuthService.getCurrentUser();
    return axios.post(API_URL + `payments/${id}/reject`, { reason }, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const getAllUsers = () => {
    const user = AuthService.getCurrentUser();
    return axios.get(API_URL + "users", {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const toggleUser = (id) => {
    const user = AuthService.getCurrentUser();
    return axios.put(API_URL + `users/${id}/toggle`, {}, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const getPlatformConfig = () => {
    const user = AuthService.getCurrentUser();
    return axios.get(API_URL + "config", {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const updatePlatformConfig = (config) => {
    const user = AuthService.getCurrentUser();
    return axios.put(API_URL + "config", config, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const AdminService = {
    getGlobalStats,
    getAllCompanies,
    updateCompanySubscription,
    getGlobalPayments,
    approvePayment,
    rejectPayment,
    getAllUsers,
    toggleUser,
    getPlatformConfig,
    updatePlatformConfig
};

export default AdminService;
