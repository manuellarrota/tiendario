import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL + "/auth";

const register = (fullName, email, password, role = 'client', companyName = null, phone = null, cedula = null) => {
    return axios.post(API_URL + "/signup", {
        username: email, // Use email as username for clients
        email,
        password,
        fullName,
        phoneNumber: phone,
        cedula,
        role: [role]
    });
};

const login = (username, password) => {
    return axios
        .post(API_URL + "/signin", {
            username,
            password,
        })
        .then((response) => {
            if (response.data.token) {
                localStorage.setItem("customer", JSON.stringify(response.data));
            }
            return response.data;
        });
};

const logout = () => {
    localStorage.removeItem("customer");
};

const getCurrentUser = () => {
    return JSON.parse(localStorage.getItem("customer"));
};

const AuthService = {
    register,
    login,
    logout,
    getCurrentUser,
};

export default AuthService;
