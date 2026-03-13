import axios from "axios";
import AuthService from "./auth.service";

export default function setupAxios() {
  axios.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      // If the error is 401 Unauthorized, it means the JWT is likely expired or invalid
      if (error.response && error.response.status === 401) {
        // Don't intercept 401 on login attempts
        const isLoginRequest = error.config.url.includes("/auth/signin");
        
        if (!isLoginRequest) {
          console.warn("JWT expired or invalid. Logging out...");
          AuthService.logout();
          
          // Only redirect if we are not already at the root
          if (window.location.pathname !== "/") {
            window.location.href = "/";
          }
        }
      }
      return Promise.reject(error);
    }
  );
}
