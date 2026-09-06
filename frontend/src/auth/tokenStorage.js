const ACCESS_TOKEN_KEY = 'medical_access_token';
const REFRESH_TOKEN_KEY = 'medical_refresh_token';


export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}


export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}


export function saveTokens(access, refresh) {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}


export function setAccessToken(access) {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
}


export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}


export function hasAuthTokens() {
  return Boolean(getAccessToken() || getRefreshToken());
}