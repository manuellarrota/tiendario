import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL + "/auth/";

const register = (username, email, password, role, companyName, phoneNumber, latitude, longitude, address, fullName, cedula, plan) => {
    return axios.post(API_URL + "signup", {
        username,
        email,
        password,
        role: [role],
        companyName,
        phoneNumber,
        latitude,
        longitude,
        address,
        fullName,
        cedula,
        plan
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

const refreshSubscriptionStatus = () => {
    const user = getCurrentUser();
    if (!user || !user.token) return Promise.resolve(null);

    return axios.get(API_URL + "me", {
        headers: { Authorization: "Bearer " + user.token }
    }).then((response) => {
        const freshStatus = response.data.subscriptionStatus;
        const freshPlan = response.data.subscriptionPlan;
        
        let changed = false;
        let updatedUser = { ...user };

        if (freshStatus && freshStatus !== user.subscriptionStatus) {
            updatedUser.subscriptionStatus = freshStatus;
            changed = true;
        }

        if (freshPlan && freshPlan !== user.subscriptionPlan) {
            updatedUser.subscriptionPlan = freshPlan;
            changed = true;
        }

        if (changed) {
            // Something changed — update the stored user object
            if (localStorage.getItem("user")) {
                localStorage.setItem("user", JSON.stringify(updatedUser));
            } else {
                sessionStorage.setItem("user", JSON.stringify(updatedUser));
            }
            return true; // signals a change occurred
        }
        return false; // no change
    }).catch(() => false);
};

const AuthService = {
    register,
    login,
    logout,
    getCurrentUser,
    refreshSubscriptionStatus,
};

// ─── Interceptor: check subscription on every API response (throttled) ───────
// Fires at most once every 60s — piggybacking on calls the user already makes.
let _lastSubscriptionCheck = 0;

axios.interceptors.response.use(
    (response) => {
        const now = Date.now();
        const user = getCurrentUser();
        // Only check for non-admin users with a valid session, and respect the throttle
        if (user && user.token && !user.roles?.includes('ROLE_ADMIN') && (now - _lastSubscriptionCheck > 60_000)) {
            _lastSubscriptionCheck = now;
            refreshSubscriptionStatus().then((changed) => {
                if (changed) {
                    window.location.reload();
                }
            });
        }
        return response;
    },
    (error) => Promise.reject(error)
);

export default AuthService;
