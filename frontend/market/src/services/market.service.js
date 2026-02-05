import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL + "/public/";

const getAllProducts = () => {
    return axios.get(API_URL + "products");
};

const getCompanyProducts = (companyId) => {
    return axios.get(API_URL + "products/company/" + companyId);
};

const MarketService = {
    getAllProducts,
    getCompanyProducts
};

export default MarketService;
