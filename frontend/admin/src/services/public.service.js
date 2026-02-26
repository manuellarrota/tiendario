import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL + "/public/";

const getPlatformConfig = () => {
    return axios.get(API_URL + "config");
};

const PublicService = {
    getPlatformConfig
};

export default PublicService;
