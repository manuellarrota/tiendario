import axios from 'axios';
import AuthService from './auth.service';

const API_URL = import.meta.env.VITE_API_URL + '/debit-notes';

class DebitNoteService {
    getCompanyDebitNotes() {
        const user = AuthService.getCurrentUser();
        return axios.get(API_URL, {
            headers: { Authorization: 'Bearer ' + user.token }
        });
    }

    getDebitNotesByPurchase(purchaseId) {
        const user = AuthService.getCurrentUser();
        return axios.get(`${API_URL}/by-purchase/${purchaseId}`, {
            headers: { Authorization: 'Bearer ' + user.token }
        });
    }

    createDebitNote(data) {
        const user = AuthService.getCurrentUser();
        return axios.post(API_URL, data, {
            headers: { Authorization: 'Bearer ' + user.token }
        });
    }
}

export default new DebitNoteService();
