import axios from 'axios';
import authHeader from './auth-header';

const API_URL = import.meta.env.VITE_API_URL + '/company/staff';

class StaffService {
    getStaff() {
        return axios.get(API_URL, { headers: authHeader() });
    }

    createStaff(username, email, password) {
        return axios.post(API_URL, {
            username,
            email,
            password
        }, { headers: authHeader() });
    }

    toggleStaffStatus(id) {
        return axios.put(`${API_URL}/${id}/toggle`, {}, { headers: authHeader() });
    }

    deleteStaff(id) {
        return axios.delete(`${API_URL}/${id}`, { headers: authHeader() });
    }
}

export default new StaffService();
