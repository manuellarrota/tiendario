import axios from "axios";
import AuthService from "./auth.service";

const API_URL = import.meta.env.VITE_API_URL + "/suppliers/";

const getAuthHeader = () => {
    const user = AuthService.getCurrentUser();
    if (user && user.token) {
        return { Authorization: 'Bearer ' + user.token };
    } else {
        return {};
    }
}

const getAll = () => {
    return axios.get(API_URL, { headers: getAuthHeader() });
};

const create = (data) => {
    return axios.post(API_URL, data, { headers: getAuthHeader() });
};

const SupplierService = {
    getAll,
    create,
};

export default SupplierService;
