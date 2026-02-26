import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

// 请求拦截器 - 添加Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => {
    return response.data.data || response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 认证API
export const authAPI = {
  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/register', data),
  getProfile: () => api.get('/auth/profile'),
};

// 素材API
export const materialsAPI = {
  getList: (params?: any) => api.get('/materials', { params }),
  getOne: (id: number) => api.get(`/materials/${id}`),
  create: (data: any) => api.post('/materials', data),
  update: (id: number, data: any) => api.put(`/materials/${id}`, data),
  delete: (id: number) => api.delete(`/materials/${id}`),
  upload: (file: File, data?: any) => {
    const formData = new FormData();
    formData.append('file', file);
    if (data) {
      Object.keys(data).forEach(key => {
        formData.append(key, data[key]);
      });
    }
    return api.post('/materials/upload', formData);
  },
  transcribe: (id: number) => api.post(`/materials/${id}/transcribe`),
  getStats: () => api.get('/materials/stats/summary'),
};

// 选题API
export const topicsAPI = {
  getList: () => api.get('/topics'),
  getOne: (id: number) => api.get(`/topics/${id}`),
  create: (data: any) => api.post('/topics', data),
  update: (id: number, data: any) => api.put(`/topics/${id}`, data),
  delete: (id: number) => api.delete(`/topics/${id}`),
  getStats: () => api.get('/topics/stats/summary'),
};

// 视频API
export const videosAPI = {
  getList: () => api.get('/videos'),
  getOne: (id: number) => api.get(`/videos/${id}`),
  create: (data: any) => api.post('/videos', data),
  update: (id: number, data: any) => api.put(`/videos/${id}`, data),
  delete: (id: number) => api.delete(`/videos/${id}`),
  getStats: () => api.get('/videos/stats/summary'),
};

// 系统配置API
export const settingsAPI = {
  getAll: () => api.get('/settings'),
  update: (updates: Record<string, string>) => api.put('/settings', { updates }),
};

export default api;
