import axios from "axios";
import AuthService from "./auth.service";

const API_URL = import.meta.env.VITE_API_URL + "/dashboard/";

const getSummary = () => {
    const user = AuthService.getCurrentUser();
    return axios.get(API_URL + "summary", {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const getSalesChart = (period = "weekly") => {
    const user = AuthService.getCurrentUser();
    return axios.get(API_URL + "sales-chart?period=" + period, {
        headers: { Authorization: 'Bearer ' + user.token }
    });
};

const DashboardService = {
    getSummary,
    getSalesChart
};

export default DashboardService;
