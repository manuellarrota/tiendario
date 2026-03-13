import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL + '/public/';

const searchProducts = (query) => {
    return axios.get(API_URL + 'search', { params: { q: query } });
};

const getAllProducts = (params) => {
    return axios.get(API_URL + 'products', { params });
};

const getProductDetail = (id) => {
    return axios.get(API_URL + 'products/' + id);
};

const createOrder = (orderData) => {
    return axios.post(API_URL + 'order', orderData);
};

const getPlatformConfig = () => {
    return axios.get(API_URL + 'config');
};

const getCategories = () => {
    return axios.get(API_URL + 'categories');
};

const getSellersByName = (name, sku) => {
    const params = sku ? { sku } : {};
    return axios.get(API_URL + 'products/name/' + encodeURIComponent(name) + '/sellers', { params });
};

const getCustomerPoints = (email) => {
    return axios.get(API_URL + 'customer/points', { params: { email } });
};

const SearchService = {
    searchProducts,
    getAllProducts,
    getProductDetail,
    createOrder,
    getPlatformConfig,
    getCategories,
    getSellersByName,
    getCustomerPoints
};

export default SearchService;
