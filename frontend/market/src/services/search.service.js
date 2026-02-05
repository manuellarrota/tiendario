import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL + '/public/';

const searchProducts = (query) => {
    return axios.get(API_URL + 'search', { params: { q: query } });
};

const getAllProducts = () => {
    return axios.get(API_URL + 'products');
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

const getSellersByName = (name) => {
    return axios.get(API_URL + 'products/name/' + encodeURIComponent(name) + '/sellers');
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
    getSellersByName,
    getCustomerPoints
};

export default SearchService;
