import axios from 'axios';
import AuthService from './auth.service';

const API_URL = import.meta.env.VITE_API_URL + '/credit-notes';

class CreditNoteService {
    getCompanyCreditNotes() {
        const user = AuthService.getCurrentUser();
        return axios.get(API_URL, {
            headers: { Authorization: 'Bearer ' + user.token }
        });
    }

    getCreditNotesBySale(saleId) {
        const user = AuthService.getCurrentUser();
        return axios.get(`${API_URL}/by-sale/${saleId}`, {
            headers: { Authorization: 'Bearer ' + user.token }
        });
    }

    createCreditNote(data) {
        const user = AuthService.getCurrentUser();
        return axios.post(API_URL, data, {
            headers: { Authorization: 'Bearer ' + user.token }
        });
    }
}

export default new CreditNoteService();
