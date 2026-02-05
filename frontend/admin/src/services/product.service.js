import axios from "axios";
import AuthService from "./auth.service";

const API_URL = import.meta.env.VITE_API_URL + "/products/";

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

const remove = (id) => {
    return axios.delete(API_URL + id, { headers: getAuthHeader() });
};

const update = (id, data) => {
    return axios.put(API_URL + id, data, { headers: getAuthHeader() });
};

const getSuggestedSku = (name, category, variant) => {
    return axios.get(API_URL + "suggest-sku", {
        params: { name, category, variant },
        headers: getAuthHeader()
    });
};

const ProductService = {
    getAll,
    getCompanyProducts: getAll,
    create,
    update,
    remove,
    getSuggestedSku
};

export default ProductService;
