import axios from 'axios';
import authHeader from './auth-header';

const API_URL = import.meta.env.VITE_API_URL + '/customer/';

const getDashboardStats = () => {
    return axios.get(API_URL + 'dashboard', { headers: authHeader() });
};

const getMyOrders = () => {
    return axios.get(API_URL + 'orders', { headers: authHeader() });
};

const CustomerService = {
    getDashboardStats,
    getMyOrders,
};

export default CustomerService;
