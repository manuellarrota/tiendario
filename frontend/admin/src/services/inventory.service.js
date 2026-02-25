import axios from 'axios';
import authHeader from './auth-header';

const API_URL = 'http://localhost:8080/api/inventory/';

const exportExcel = () => {
    return axios.get(API_URL + 'export/excel', {
        headers: authHeader(),
        responseType: 'blob'
    });
};

const exportPdf = () => {
    return axios.get(API_URL + 'export/pdf', {
        headers: authHeader(),
        responseType: 'blob'
    });
};

const importExcel = (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post(API_URL + 'import', formData, {
        headers: {
            ...authHeader(),
            'Content-Type': 'multipart/form-data'
        }
    });
};

const InventoryService = {
    exportExcel,
    exportPdf,
    importExcel
};

export default InventoryService;
