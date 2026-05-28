import axios from 'axios';
import AuthService from './auth.service';

const API_URL = import.meta.env.VITE_API_URL + '/company';

const getAuthHeader = () => {
    const user = AuthService.getCurrentUser();
    if (user && user.token) {
        return { Authorization: 'Bearer ' + user.token };
    } else {
        return {};
    }
}

const getProfile = () => {
    return axios.get(API_URL + '/profile', { headers: getAuthHeader() });
};

const upgradeSubscription = () => {
    return axios.post(API_URL + '/subscribe', {}, { headers: getAuthHeader() });
};

const downgradeSubscription = () => {
    return axios.post(API_URL + '/unsubscribe', {}, { headers: getAuthHeader() });
};

const addExtraRegisters = (requested) => {
    return axios.post(API_URL + '/add-registers', { requested }, { headers: getAuthHeader() });
};

const updateProfile = (profileData) => {
    return axios.put(API_URL + '/profile', profileData, { headers: getAuthHeader() });
};

const CompanyService = {
    getProfile,
    upgradeSubscription,
    downgradeSubscription,
    updateProfile,
    addExtraRegisters
};

export default CompanyService;
