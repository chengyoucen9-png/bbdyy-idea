import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response.data.data || response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data: { username: string; password: string }) => api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/register', data),
  getProfile: () => api.get('/auth/profile'),
};

export const materialsAPI = {
  getList: (params?: any) => api.get('/materials', { params }),
  getOne: (id: number) => api.get(`/materials/${id}`),
  create: (data: any) => api.post('/materials', data),
  update: (id: number, data: any) => api.put(`/materials/${id}`, data),
  delete: (id: number) => api.delete(`/materials/${id}`),
  upload: (file: File, data?: any) => {
    const formData = new FormData();
    formData.append('file', file);
    if (data) Object.keys(data).forEach(key => formData.append(key, data[key]));
    return api.post('/materials/upload', formData);
  },
  transcribe: (id: number) => api.post(`/materials/${id}/transcribe`),
  getStats: () => api.get('/materials/stats/summary'),
  // 按关键词/文本匹配素材（不需要 topicId）
  searchByKeywords: (text: string) => api.post('/materials/search-by-keywords', { text }),
};

export const topicsAPI = {
  getList: () => api.get('/topics'),
  getOne: (id: number) => api.get(`/topics/${id}`),
  create: (data: any) => api.post('/topics', data),
  update: (id: number, data: any) => api.put(`/topics/${id}`, data),
  delete: (id: number) => api.delete(`/topics/${id}`),
  getStats: () => api.get('/topics/stats/summary'),
  searchMaterials: (id: number) => api.post(`/topics/${id}/search-materials`),
  generateScript: (id: number, materialIds?: number[]) => api.post(`/topics/${id}/generate-script`, { materialIds }),
  generateTitles: (id: number, platform?: string) => api.post(`/topics/${id}/generate-titles`, { platform }),
  optimizeOpening: (id: number) => api.post(`/topics/${id}/optimize-opening`),
};

export const videosAPI = {
  getList: () => api.get('/videos'),
  getOne: (id: number) => api.get(`/videos/${id}`),
  create: (data: any) => api.post('/videos', data),
  update: (id: number, data: any) => api.put(`/videos/${id}`, data),
  delete: (id: number) => api.delete(`/videos/${id}`),
  getStats: () => api.get('/videos/stats/summary'),
};


export const settingsAPI = {
  getAll: () => api.get('/settings'),
  update: (updates: Record<string, string>) => api.put('/settings', { updates }),
};

export const usersAPI = {
  getList: () => api.get('/users'),
  create: (data: any) => api.post('/users', data),
  update: (id: number, data: any) => api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
  toggleStatus: (id: number) => api.patch(`/users/${id}/toggle-status`),
  loginAs: (id: number) => api.post(`/users/${id}/login-as`),
};

export const chatAPI = {
  send: (model: string, messages: { role: string; content: string }[]) =>
    api.post('/chat/send', { model, messages }),
};

export default api;
