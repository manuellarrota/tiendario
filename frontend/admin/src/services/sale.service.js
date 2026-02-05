import axios from "axios";
import AuthService from "./auth.service";

const API_URL = import.meta.env.VITE_API_URL + "/sales/";

const getSales = () => {
    const user = AuthService.getCurrentUser();
    return axios.get(API_URL, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const createSale = (saleData) => {
    const user = AuthService.getCurrentUser();
    return axios.post(API_URL, saleData, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const updateStatus = (id, status) => {
    const user = AuthService.getCurrentUser();
    return axios.put(API_URL + id + "/status", null, {
        params: { status },
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const SaleService = {
    getSales,
    createSale,
    updateStatus
};

export default SaleService;
