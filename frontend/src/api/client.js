import axios from 'axios';

import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
} from '../auth/tokenStorage';


/*
  LOCAL:
  http://127.0.0.1:8000/api

  STAGING:
  Render VITE_API_BASE_URL environment variable
  orqali public backend URL beradi.
*/
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL
  || 'http://127.0.0.1:8000/api';


const api = axios.create({
  baseURL: API_BASE_URL,

  headers: {
    'Content-Type': 'application/json',
  },

  timeout: 30000,
});


api.interceptors.request.use(
  (config) => {
    const accessToken =
      getAccessToken();

    if (accessToken) {
      config.headers.Authorization =
        `Bearer ${accessToken}`;
    }

    return config;
  },

  (error) => Promise.reject(error)
);


let refreshPromise = null;


async function refreshAccessToken() {
  const refreshToken =
    getRefreshToken();

  if (!refreshToken) {
    throw new Error(
      'Refresh token mavjud emas.'
    );
  }


  /*
    Bir vaqtda bir nechta request 401 olsa,
    faqat bitta refresh request yuboramiz.
  */
  if (!refreshPromise) {
    refreshPromise = axios
      .post(
        `${API_BASE_URL}/auth/refresh/`,
        {
          refresh: refreshToken,
        },
        {
          headers: {
            'Content-Type':
              'application/json',
          },

          timeout: 30000,
        }
      )
      .then((response) => {
        const newAccessToken =
          response.data.access;

        if (!newAccessToken) {
          throw new Error(
            'Yangi access token qaytmadi.'
          );
        }

        setAccessToken(
          newAccessToken
        );

        return newAccessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }


  return refreshPromise;
}


api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest =
      error.config;


    if (
      error.response?.status !== 401
      || !originalRequest
      || originalRequest._retry
    ) {
      return Promise.reject(error);
    }


    originalRequest._retry = true;


    try {
      const newAccessToken =
        await refreshAccessToken();

      originalRequest.headers =
        originalRequest.headers || {};

      originalRequest.headers.Authorization =
        `Bearer ${newAccessToken}`;

      return api(
        originalRequest
      );

    } catch (refreshError) {
      clearTokens();

      localStorage.removeItem(
        'medconnect_last_activity'
      );

      if (
        window.location.pathname
        !== '/login'
      ) {
        window.location.replace(
          '/login'
        );
      }

      return Promise.reject(
        refreshError
      );
    }
  }
);


export default api;
