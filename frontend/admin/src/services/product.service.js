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

const getAll = (params) => {
    return axios.get(API_URL, {
        params,
        headers: getAuthHeader()
    });
};

const getPOSProducts = () => {
    // POS might need all products or a larger page size
    return axios.get(API_URL, {
        params: { page: 0, size: 2000 },
        headers: getAuthHeader()
    });
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

const getSuggestedSku = (name, category, variant, brand) => {
    return axios.get(API_URL + "suggest-sku", {
        params: { name, category, variant, brand },
        headers: getAuthHeader()
    });
};

const searchCatalog = (query) => {
    return axios.get(API_URL + "catalog-search", {
        params: { q: query },
        headers: getAuthHeader()
    });
};

const uploadImage = (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return axios.post(API_URL + "upload", formData, {
        headers: {
            ...getAuthHeader(),
            "Content-Type": "multipart/form-data"
        }
    });
};

const findByBarcode = (barcode) => {
    return axios.get(API_URL + `by-barcode/${encodeURIComponent(barcode)}`, {
        headers: getAuthHeader()
    });
};

const ProductService = {
    getAll,
    getCompanyProducts: getAll,
    create,
    update,
    remove,
    getSuggestedSku,
    searchCatalog,
    uploadImage,
    getPOSProducts,
    findByBarcode
};

export default ProductService;
