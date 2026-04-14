import axios from 'axios';

const setupAxios = () => {
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
          niceMessage = isLoginRequest && serverMessage
            ? serverMessage
            : "Tu sesión ha expirado o no tienes acceso. Por favor, inicia sesión de nuevo.";
        } else if (status === 403) {
          niceMessage = "No tienes permisos suficientes para realizar esta acción.";
        } else if (status === 429) {
          niceMessage = error.response.data?.message || "Demasiados intentos de acceso. Por favor, espera unos minutos.";
        } else if (status === 404) {
          niceMessage = "No pudimos encontrar lo que buscabas.";
        } else if (status >= 500) {
          niceMessage = "Tenemos problemas en nuestro servidor. Estamos trabajando en ello.";
        }
      } else if (error.request) {
        niceMessage = "No pudimos conectar con el servidor. Revisa tu conexión a internet.";
      }

      // Attach translated message to the error object so components can use it
      error.translatedMessage = niceMessage;

      return Promise.reject(error);
    }
  );
};

export default setupAxios;
