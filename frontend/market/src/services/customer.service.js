import axios from 'axios';
import authHeader from './auth-header';

const API_URL = 'import.meta.env.VITE_API_URL + '/'customer-portal/';

const getMyOrders = () => {
    return axios.get(API_URL + 'orders', { headers: authHeader() });
};

const getDashboardStats = () => {
    return axios.get(API_URL + 'dashboard', { headers: authHeader() });
};

const CustomerService = {
    getMyOrders,
    getDashboardStats
};

export default CustomerService;
