import axios from "axios";
import AuthService from "./auth.service";

const API_URL = import.meta.env.VITE_API_URL + "/customers/";

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

const update = (id, data) => {
    return axios.put(API_URL + id, data, { headers: getAuthHeader() });
};

const deleteCustomer = (id) => {
    return axios.delete(API_URL + id, { headers: getAuthHeader() });
};

const CustomerService = {
    getAll,
    create,
    update,
    delete: deleteCustomer,
};

export default CustomerService;
