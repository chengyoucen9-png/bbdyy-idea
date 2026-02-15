// ==================== API 请求封装 ====================
// 文件路径: frontend/src/api/request.ts

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// 创建 axios 实例
const request: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加 Token
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('请求错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器 - 统一处理错误
request.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data;
  },
  (error) => {
    // Token 过期或无效，跳转到登录页
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_info');
      window.location.href = '/login';
    }
    
    // 其他错误提示
    const message = error.response?.data?.message || error.message || '请求失败';
    console.error('响应错误:', message);
    
    return Promise.reject(error);
  }
);

export default request;

// ==================== 认证 API ====================
// 文件路径: frontend/src/api/auth.ts

import request from './request';

export interface LoginDto {
  username: string;
  password: string;
}

export interface RegisterDto {
  username: string;
  email: string;
  password: string;
  nickname?: string;
}

export interface AuthResponse {
  access_token: string;
  user: {
    id: number;
    username: string;
    email: string;
    nickname: string;
    avatar?: string;
  };
}

export const authApi = {
  // 登录
  login: (data: LoginDto): Promise<AuthResponse> => {
    return request.post('/auth/login', data);
  },

  // 注册
  register: (data: RegisterDto): Promise<AuthResponse> => {
    return request.post('/auth/register', data);
  },

  // 获取当前用户信息
  getProfile: () => {
    return request.get('/auth/profile');
  },
};

// ==================== 素材 API ====================
// 文件路径: frontend/src/api/materials.ts

import request from './request';

export interface Material {
  id?: number;
  name: string;
  scene?: string;
  tags?: string[];
  duration?: string;
  note?: string;
  thumbnail?: string;
  fileType?: 'image' | 'video';
  fileSize?: number;
  usageCount?: number;
  lastUsed?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MaterialQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface MaterialListResponse {
  items: Material[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const materialsApi = {
  // 获取列表
  getList: (query?: MaterialQuery): Promise<MaterialListResponse> => {
    return request.get('/materials', { params: query });
  },

  // 获取单个
  getOne: (id: number): Promise<Material> => {
    return request.get(`/materials/${id}`);
  },

  // 创建
  create: (data: Material): Promise<Material> => {
    return request.post('/materials', data);
  },

  // 更新
  update: (id: number, data: Partial<Material>): Promise<Material> => {
    return request.put(`/materials/${id}`, data);
  },

  // 删除
  delete: (id: number): Promise<{ message: string }> => {
    return request.delete(`/materials/${id}`);
  },

  // 标记使用
  markUsed: (id: number): Promise<Material> => {
    return request.post(`/materials/${id}/mark-used`);
  },

  // 获取统计
  getStats: (): Promise<{
    total: number;
    imageCount: number;
    videoCount: number;
  }> => {
    return request.get('/materials/stats/summary');
  },
};

// ==================== 选题 API ====================
// 文件路径: frontend/src/api/topics.ts

import request from './request';

export interface Topic {
  id?: number;
  title: string;
  description?: string;
  source?: string;
  status?: 'pending' | 'inProgress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  difficulty?: number;
  createdAt?: string;
  updatedAt?: string;
}

export const topicsApi = {
  getList: (): Promise<Topic[]> => {
    return request.get('/topics');
  },

  getOne: (id: number): Promise<Topic> => {
    return request.get(`/topics/${id}`);
  },

  create: (data: Topic): Promise<Topic> => {
    return request.post('/topics', data);
  },

  update: (id: number, data: Partial<Topic>): Promise<Topic> => {
    return request.put(`/topics/${id}`, data);
  },

  delete: (id: number): Promise<{ message: string }> => {
    return request.delete(`/topics/${id}`);
  },

  getStats: (): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  }> => {
    return request.get('/topics/stats/summary');
  },
};

// ==================== 视频 API ====================
// 文件路径: frontend/src/api/videos.ts

import request from './request';

export interface Video {
  id?: number;
  title: string;
  topicId?: number;
  publishDate?: string;
  platform?: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  completionRate?: number;
  materialIds?: number[];
  createdAt?: string;
  updatedAt?: string;
}

export const videosApi = {
  getList: (): Promise<Video[]> => {
    return request.get('/videos');
  },

  getOne: (id: number): Promise<Video> => {
    return request.get(`/videos/${id}`);
  },

  create: (data: Video): Promise<Video> => {
    return request.post('/videos', data);
  },

  update: (id: number, data: Partial<Video>): Promise<Video> => {
    return request.put(`/videos/${id}`, data);
  },

  delete: (id: number): Promise<{ message: string }> => {
    return request.delete(`/videos/${id}`);
  },

  getStats: (): Promise<{
    totalVideos: number;
    totalViews: number;
    totalLikes: number;
    avgCompletionRate: number;
  }> => {
    return request.get('/videos/stats/summary');
  },
};

// ==================== AI配置 API ====================
// 文件路径: frontend/src/api/aiProviders.ts

import request from './request';

export interface ModelConfig {
  enabled: boolean;
  apiEndpoint: string;
  model: string;
  apiKey: string;
}

export interface AiProvider {
  id?: number;
  name: string;
  type: string;
  icon: string;
  description?: string;
  visionConfig?: ModelConfig;
  textConfig?: ModelConfig;
  isDefault?: number;
  enabled?: number;
  createdAt?: string;
  updatedAt?: string;
}

export const aiProvidersApi = {
  getList: (): Promise<AiProvider[]> => {
    return request.get('/ai-providers');
  },

  getDefault: (): Promise<AiProvider> => {
    return request.get('/ai-providers/default');
  },

  getOne: (id: number): Promise<AiProvider> => {
    return request.get(`/ai-providers/${id}`);
  },

  create: (data: AiProvider): Promise<AiProvider> => {
    return request.post('/ai-providers', data);
  },

  update: (id: number, data: Partial<AiProvider>): Promise<AiProvider> => {
    return request.put(`/ai-providers/${id}`, data);
  },

  setDefault: (id: number): Promise<AiProvider> => {
    return request.patch(`/ai-providers/${id}/set-default`);
  },

  delete: (id: number): Promise<{ message: string }> => {
    return request.delete(`/ai-providers/${id}`);
  },
};

// ==================== 文件上传 API ====================
// 文件路径: frontend/src/api/oss.ts

import request from './request';

export interface UploadResponse {
  url: string;
  name: string;
  size: number;
}

export const ossApi = {
  upload: (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    return request.post('/oss/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// ==================== 用户 API ====================
// 文件路径: frontend/src/api/users.ts

import request from './request';

export interface User {
  id: number;
  username: string;
  email: string;
  nickname?: string;
  avatar?: string;
}

export const usersApi = {
  getMe: (): Promise<User> => {
    return request.get('/users/me');
  },

  updateMe: (data: Partial<User>): Promise<User> => {
    return request.put('/users/me', data);
  },

  uploadAvatar: (file: File): Promise<User> => {
    const formData = new FormData();
    formData.append('file', file);
    
    return request.post('/users/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// ==================== 统一导出 ====================
// 文件路径: frontend/src/api/index.ts

export { authApi } from './auth';
export { materialsApi } from './materials';
export { topicsApi } from './topics';
export { videosApi } from './videos';
export { aiProvidersApi } from './aiProviders';
export { ossApi } from './oss';
export { usersApi } from './users';

export type { 
  Material, 
  Topic, 
  Video, 
  AiProvider, 
  User 
} from './types';
