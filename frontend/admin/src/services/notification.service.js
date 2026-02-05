import axios from 'axios';
import authHeader from './auth-header';

const API_URL = import.meta.env.VITE_API_URL + '/notifications/';

const getNotifications = () => {
    return axios.get(API_URL, { headers: authHeader() });
};

const getUnreadCount = () => {
    return axios.get(API_URL + 'unread-count', { headers: authHeader() });
};

const markAsRead = (id) => {
    return axios.put(API_URL + id + '/read', {}, { headers: authHeader() });
};

export default {
    getNotifications,
    getUnreadCount,
    markAsRead
};
