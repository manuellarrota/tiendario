import axios from 'axios';
import AuthService from './auth.service';

const API_URL = import.meta.env.VITE_API_URL + '/payments/';

const getAuthHeader = () => {
    const user = AuthService.getCurrentUser();
    if (user && user.token) {
        return { Authorization: 'Bearer ' + user.token };
    } else {
        return {};
    }
}

const submitPayment = (paymentData) => {
    return axios.post(API_URL + 'submit', paymentData, { headers: getAuthHeader() });
};

const getMyPayments = () => {
    return axios.get(API_URL + 'my-payments', { headers: getAuthHeader() });
};

const simulateSuccess = () => {
    return axios.post(API_URL + 'simulate-success', {}, { headers: getAuthHeader() });
};

const PaymentService = {
    submitPayment,
    getMyPayments,
    simulateSuccess
};

export default PaymentService;
