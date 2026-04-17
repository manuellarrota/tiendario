import axios from 'axios';
import authHeader from './auth-header';

const API_URL = import.meta.env.VITE_API_URL + '/reports/';

const getTopProducts = (page = 0, size = 10) => {
    return axios.get(API_URL + 'top-products', { 
        headers: authHeader(),
        params: { page, size }
    });
};

const getInventoryStats = () => {
    return axios.get(API_URL + 'inventory-stats', { headers: authHeader() });
};

const ReportService = {
    getTopProducts,
    getInventoryStats
};

export default ReportService;
