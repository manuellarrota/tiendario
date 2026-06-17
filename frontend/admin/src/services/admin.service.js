import axios from "axios";
import AuthService from "./auth.service";

const API_URL = import.meta.env.VITE_API_URL + "/superadmin";

const getGlobalStats = () => {
    const user = AuthService.getCurrentUser();
    return axios.get(API_URL + "/stats", {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const getAllCompanies = () => {
    const user = AuthService.getCurrentUser();
    return axios.get(API_URL + "/companies", {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const getCompanyKpis = (id) => {
    const user = AuthService.getCurrentUser();
    return axios.get(API_URL + `/companies/${id}/kpis`, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const updateCompanySubscription = (id, data) => {
    const user = AuthService.getCurrentUser();
    return axios.put(API_URL + `/companies/${id}/subscription`, data, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const updateCompany = (id, data) => {
    const user = AuthService.getCurrentUser();
    return axios.put(API_URL + `/companies/${id}`, data, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const getGlobalPayments = () => {
    const user = AuthService.getCurrentUser();
    return axios.get(API_URL + "/payments", {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const getPaymentById = (id) => {
    const user = AuthService.getCurrentUser();
    return axios.get(API_URL + `/payments/${id}`, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const approvePayment = (id) => {
    const user = AuthService.getCurrentUser();
    return axios.post(API_URL + `/payments/${id}/approve`, {}, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const rejectPayment = (id, reason) => {
    const user = AuthService.getCurrentUser();
    return axios.post(API_URL + `/payments/${id}/reject`, { reason }, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const getAllUsers = () => {
    const user = AuthService.getCurrentUser();
    return axios.get(API_URL + "/users", {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const toggleUser = (id) => {
    const user = AuthService.getCurrentUser();
    return axios.put(API_URL + `/users/${id}/toggle`, {}, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const getPlatformConfig = () => {
    const user = AuthService.getCurrentUser();
    return axios.get(API_URL + "/config", {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const updatePlatformConfig = (data) => {
    const user = AuthService.getCurrentUser();
    return axios.put(API_URL + "/config", data, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const getAllCatalogProducts = () => {
    const user = AuthService.getCurrentUser();
    return axios.get(API_URL + "/catalog", {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const updateCatalogProduct = (id, data) => {
    const user = AuthService.getCurrentUser();
    return axios.put(API_URL + `/catalog/${id}`, data, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const deleteCatalogProduct = (id) => {
    const user = AuthService.getCurrentUser();
    return axios.delete(API_URL + `/catalog/${id}`, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const syncCatalog = () => {
    const user = AuthService.getCurrentUser();
    return axios.post(API_URL + '/catalog/sync', {}, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const createStore = (data) => {
    const user = AuthService.getCurrentUser();
    return axios.post(API_URL + "/onboard/create-store", data, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const addGlobalCategory = (data) => {
    const user = AuthService.getCurrentUser();
    return axios.post(API_URL + "/categories/global", data, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const addProductToCompany = (companyId, data) => {
    const user = AuthService.getCurrentUser();
    return axios.post(API_URL + `/onboard/${companyId}/products`, data, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const getGlobalCategories = () => {
    const user = AuthService.getCurrentUser();
    return axios.get(API_URL + "/categories/global", {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const getCatalogSuggestions = () => {
    const user = AuthService.getCurrentUser();
    return axios.get(API_URL + "/catalog-suggestions", {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const approveCatalogSuggestion = (id) => {
    const user = AuthService.getCurrentUser();
    return axios.put(API_URL + `/catalog-suggestions/${id}/approve`, {}, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const rejectCatalogSuggestion = (id) => {
    const user = AuthService.getCurrentUser();
    return axios.put(API_URL + `/catalog-suggestions/${id}/reject`, {}, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const getSuperAdminNotifications = (page = 0, size = 10, type = '', search = '', readStatus = '') => {
    const user = AuthService.getCurrentUser();
    let url = API_URL + `/notifications?page=${page}&size=${size}`;
    if (type) url += `&type=${type}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (readStatus) url += `&readStatus=${readStatus}`;
    return axios.get(url, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const getAdminUnreadCount = () => {
    const user = AuthService.getCurrentUser();
    return axios.get(API_URL + `/notifications/unread-count`, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const markNotificationAsRead = (id) => {
    const user = AuthService.getCurrentUser();
    return axios.put(API_URL + `/notifications/${id}/read`, {}, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

// ── Asistencia Técnica: Ventas ─────────────────────────────────────────────
const getCompanySales = (companyId, page = 0, size = 15) => {
    const user = AuthService.getCurrentUser();
    return axios.get(API_URL + `/companies/${companyId}/sales?page=${page}&size=${size}`, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const patchCompanySale = (companyId, saleId, data) => {
    const user = AuthService.getCurrentUser();
    return axios.patch(API_URL + `/companies/${companyId}/sales/${saleId}`, data, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const voidCompanySale = (companyId, saleId, reason) => {
    const user = AuthService.getCurrentUser();
    return axios.post(API_URL + `/companies/${companyId}/sales/${saleId}/void`, { reason }, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

// ── Asistencia Técnica: Compras ────────────────────────────────────────────
const getCompanyPurchases = (companyId, page = 0, size = 15) => {
    const user = AuthService.getCurrentUser();
    return axios.get(API_URL + `/companies/${companyId}/purchases?page=${page}&size=${size}`, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const patchCompanyPurchase = (companyId, purchaseId, data) => {
    const user = AuthService.getCurrentUser();
    return axios.patch(API_URL + `/companies/${companyId}/purchases/${purchaseId}`, data, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const voidCompanyPurchase = (companyId, purchaseId, reason) => {
    const user = AuthService.getCurrentUser();
    return axios.post(API_URL + `/companies/${companyId}/purchases/${purchaseId}/void`, { reason }, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

// ── Asistencia Técnica: Productos ──────────────────────────────────────────
const getCompanyProducts = (companyId, page = 0, size = 20) => {
    const user = AuthService.getCurrentUser();
    return axios.get(API_URL + `/companies/${companyId}/products?page=${page}&size=${size}`, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const patchCompanyProduct = (companyId, productId, data) => {
    const user = AuthService.getCurrentUser();
    return axios.patch(API_URL + `/companies/${companyId}/products/${productId}`, data, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

// ── Asistencia Técnica: Usuarios ───────────────────────────────────────────
const getCompanyUsers = (companyId) => {
    const user = AuthService.getCurrentUser();
    return axios.get(API_URL + `/companies/${companyId}/users`, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const patchCompanyUser = (companyId, userId, data) => {
    const user = AuthService.getCurrentUser();
    return axios.patch(API_URL + `/companies/${companyId}/users/${userId}`, data, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const resetCompanyUserPassword = (companyId, userId, newPassword, reason) => {
    const user = AuthService.getCurrentUser();
    return axios.post(API_URL + `/companies/${companyId}/users/${userId}/reset-password`, { newPassword, reason }, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

// ── Asistencia Técnica: Historial de Cambios ───────────────────────────────
const getCompanyAuditLog = (companyId, page = 0, size = 20) => {
    const user = AuthService.getCurrentUser();
    return axios.get(API_URL + `/companies/${companyId}/audit-log?page=${page}&size=${size}`, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const AdminService = {
    getGlobalStats,
    getAllCompanies,
    getCompanyKpis,
    updateCompany,
    updateCompanySubscription,
    getGlobalPayments,
    getPaymentById,
    approvePayment,
    rejectPayment,
    getAllUsers,
    toggleUser,
    getPlatformConfig,
    updatePlatformConfig,
    getAllCatalogProducts,
    updateCatalogProduct,
    deleteCatalogProduct,
    syncCatalog,
    createStore,
    addGlobalCategory,
    addProductToCompany,
    getGlobalCategories,
    getCatalogSuggestions,
    approveCatalogSuggestion,
    rejectCatalogSuggestion,
    getSuperAdminNotifications,
    getAdminUnreadCount,
    markNotificationAsRead,
    // Asistencia Técnica
    getCompanySales,
    patchCompanySale,
    voidCompanySale,
    getCompanyPurchases,
    patchCompanyPurchase,
    voidCompanyPurchase,
    getCompanyProducts,
    patchCompanyProduct,
    getCompanyUsers,
    patchCompanyUser,
    resetCompanyUserPassword,
    getCompanyAuditLog,
};

export default AdminService;
