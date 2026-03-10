import axios from "axios";
import AuthService from "./auth.service";

const API_URL = import.meta.env.VITE_API_URL + "/category-suggestions/";

const getAuthHeader = () => {
    const user = AuthService.getCurrentUser();
    if (user && user.token) {
        return { Authorization: 'Bearer ' + user.token };
    } else {
        return {};
    }
}

const suggest = (name) => {
    return axios.post(API_URL, { name }, { headers: getAuthHeader() });
};

const getAll = () => {
    return axios.get(API_URL, { headers: getAuthHeader() });
};

const approve = (id) => {
    return axios.put(API_URL + id + '/approve', {}, { headers: getAuthHeader() });
};

const reject = (id) => {
    return axios.put(API_URL + id + '/reject', {}, { headers: getAuthHeader() });
};

const merge = (id, targetCategoryId) => {
    return axios.put(API_URL + id + '/merge', { targetCategoryId }, { headers: getAuthHeader() });
};

const CategorySuggestionService = {
    suggest,
    getAll,
    approve,
    reject,
    merge
};

export default CategorySuggestionService;
