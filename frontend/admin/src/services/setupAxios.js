import axios from "axios";
import AuthService from "./auth.service";

export default function setupAxios() {
  axios.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      // 1. Identify common technical errors and translate them
      let niceMessage = "Ha ocurrido un error inesperado. Por favor, intente más tarde.";
      
      if (error.response) {
        const status = error.response.status;
        const serverMessage = error.response.data?.message;
        const isLoginRequest = error.config?.url?.includes("/auth/signin");
        
        if (status === 401) {
          // For login requests, preserve the backend's specific error message
          // (e.g. "Cuenta inactiva" or "Credenciales incorrectas")
          niceMessage = isLoginRequest && serverMessage
            ? serverMessage
            : "Tu sesión ha expirado. Por favor, ingresa de nuevo.";
        } else if (status === 403) {
          niceMessage = "No tienes permisos para ver esta información.";
        } else if (status === 429) {
          niceMessage = serverMessage || "Demasiados intentos de acceso. Por favor, espera unos minutos.";
        } else if (status === 404) {
          niceMessage = "El recurso solicitado no existe.";
        } else if (status === 400) {
          niceMessage = serverMessage || "Hay un error en los datos enviados.";
        } else if (status >= 500) {
          niceMessage = "Hubo un fallo en el servidor. Estamos trabajando en ello.";
        }
      } else if (error.message === "Network Error") {
        niceMessage = "No pudimos conectar con el servidor. Revisa tu internet.";
      } else if (error.message && error.message.includes("timeout")) {
        niceMessage = "La conexión tardó demasiado. Intenta de nuevo.";
      }

      // Attach translated message
      error.translatedMessage = niceMessage;

      // 2. Original Logic for 401 - auto-logout for expired sessions
      if (error.response && error.response.status === 401) {
        const isLoginAttempt = error.config?.url?.includes("/auth/signin");
        
        if (!isLoginAttempt) {
          AuthService.logout();
          if (window.location.pathname !== "/") {
            window.location.href = "/";
          }
        }
      }
      return Promise.reject(error);
    }
  );
}
