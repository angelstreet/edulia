import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const raw = localStorage.getItem('auth-storage');
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const token = parsed?.state?.accessToken;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // ignore parse errors
    }
  }
  return config;
});

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const raw = localStorage.getItem('auth-storage');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const refreshToken = parsed?.state?.refreshToken;
          if (refreshToken) {
            const { data } = await axios.post(
              `${client.defaults.baseURL}/v1/auth/refresh`,
              { refresh_token: refreshToken },
            );
            parsed.state.accessToken = data.access_token;
            if (data.refresh_token) {
              parsed.state.refreshToken = data.refresh_token;
            }
            localStorage.setItem('auth-storage', JSON.stringify(parsed));
            original.headers.Authorization = `Bearer ${data.access_token}`;
            return client(original);
          }
        } catch {
          // refresh failed — clear and redirect
        }
      }
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default client;
