import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL + "/auth/";

const register = (username, email, password, role, companyName, phoneNumber) => {
    return axios.post(API_URL + "signup", {
        username,
        email,
        password,
        role: [role],
        companyName,
        phoneNumber
    });
};

const login = (username, password, rememberMe) => {
    return axios
        .post(API_URL + "signin", {
            username,
            password,
        })
        .then((response) => {
            if (response.data.token) {
                const storage = rememberMe ? localStorage : sessionStorage;
                storage.setItem("user", JSON.stringify(response.data));
            }
            return response.data;
        });
};

const logout = () => {
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
};

const getCurrentUser = () => {
    try {
        const user = localStorage.getItem("user") || sessionStorage.getItem("user");
        return user ? JSON.parse(user) : null;
    } catch (e) {
        console.error("Error parsing user from storage", e);
        return null;
    }
};

const AuthService = {
    register,
    login,
    logout,
    getCurrentUser,
};

export default AuthService;
