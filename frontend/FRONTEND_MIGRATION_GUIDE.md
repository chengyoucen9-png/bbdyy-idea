cd /workspaces/bbdyy-idea/backend

# 修改RegisterDto，移除nickname的必需验证
cat > src/modules/auth/dto/register.dto.ts << 'EOF'
import { IsString, IsEmail, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ description: '用户名', example: 'testuser' })
  @IsString()
  @MinLength(3, { message: '用户名至少3个字符' })
  username: string;

  @ApiProperty({ description: '邮箱', example: 'test@example.com' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  @ApiProperty({ description: '密码', example: '123456' })
  @IsString()
  @MinLength(6, { message: '密码至少6个字符' })
  password: string;

  @ApiProperty({ description: '昵称', required: false })
  @IsOptional()
  @IsString()
  nickname?: string;
}
EOF

echo "✅ 修复完成！"# 前端改造指南 - 完整版

## 🎯 改造目标

将纯前端应用改造为调用后端 API 的前后端分离应用

## 📦 需要安装的依赖

```bash
cd frontend
npm install axios
npm install react-router-dom
```

## 📁 新建文件结构

```
frontend/src/
├── api/
│   ├── request.ts          # Axios 封装
│   ├── auth.ts              # 认证接口  
│   ├── materials.ts         # 素材接口
│   ├── topics.ts            # 选题接口
│   ├── videos.ts            # 视频接口
│   └── aiProviders.ts       # AI配置接口
├── pages/
│   ├── Login.tsx            # 登录页
│   ├── Register.tsx         # 注册页
│   └── Dashboard.tsx        # 主页（原有内容）
└── utils/
    ├── auth.ts              # Token管理
    └── storage.ts           # 本地存储工具
```

## 🔧 核心代码

### 1. Axios 封装 (`api/request.ts`)

```typescript
import axios from 'axios';

const request = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 15000,
});

// 请求拦截器 - 添加 Token
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器 - 处理错误
request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default request;
```

### 2. 素材 API (`api/materials.ts`)

```typescript
import request from './request';

export interface Material {
  id?: number;
  name: string;
  scene: string;
  tags: string[];
  duration?: string;
  note?: string;
  thumbnail?: string;
}

export const materialsApi = {
  // 获取列表
  getList: () => request.get('/materials'),
  
  // 获取单个
  getOne: (id: number) => request.get(`/materials/${id}`),
  
  // 创建
  create: (data: Material) => request.post('/materials', data),
  
  // 更新
  update: (id: number, data: Partial<Material>) => 
    request.put(`/materials/${id}`, data),
  
  // 删除
  delete: (id: number) => request.delete(`/materials/${id}`),
  
  // 上传文件
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request.post('/materials/upload', formData);
  },
  
  // 标记使用
  markUsed: (id: number) => request.post(`/materials/${id}/mark-used`),
};
```

### 3. 认证 API (`api/auth.ts`)

```typescript
import request from './request';

export const authApi = {
  // 登录
  login: (username: string, password: string) =>
    request.post('/auth/login', { username, password }),
  
  // 注册
  register: (data: {
    username: string;
    email: string;
    password: string;
  }) => request.post('/auth/register', data),
  
  // 获取当前用户信息
  getCurrentUser: () => request.get('/auth/profile'),
};
```

### 4. 登录页面 (`pages/Login.tsx`)

```typescript
import { useState } from 'react';
import { authApi } from '../api/auth';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await authApi.login(username, password);
      localStorage.setItem('token', res.access_token);
      window.location.href = '/';
    } catch (error) {
      alert('登录失败：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="bg-white p-8 rounded-xl shadow-lg w-96">
        <h1 className="text-2xl font-bold text-center mb-6">短视频生产系统</h1>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

### 5. 修改主应用入口 (`App.tsx`)

```typescript
import { useEffect, useState } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard'; // 原有的应用

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
    setLoading(false);
  }, []);

  if (loading) {
    return <div>加载中...</div>;
  }

  return isAuthenticated ? <Dashboard /> : <Login />;
}
```

### 6. 替换原有的存储逻辑

在原有的 `usePersistedState` Hook 中，将所有 `window.storage` 调用替换为 API 调用。

**示例：素材列表管理**

```typescript
// 原代码：
const [materials, setMaterials] = usePersistedState('materials_v2', []);

// 改为：
const [materials, setMaterials] = useState([]);

useEffect(() => {
  // 加载数据
  materialsApi.getList().then(setMaterials);
}, []);

// 添加素材
const addMaterial = async (material) => {
  const newMaterial = await materialsApi.create(material);
  setMaterials([...materials, newMaterial]);
};

// 更新素材
const updateMaterial = async (id, data) => {
  await materialsApi.update(id, data);
  setMaterials(materials.map(m => m.id === id ? {...m, ...data} : m));
};

// 删除素材
const deleteMaterial = async (id) => {
  await materialsApi.delete(id);
  setMaterials(materials.filter(m => m.id !== id));
};
```

## 🔄 完整改造清单

- [ ] 安装依赖 (axios, react-router-dom)
- [ ] 创建 API 目录和文件
- [ ] 创建登录注册页面
- [ ] 修改 App.tsx 添加路由守卫
- [ ] 替换所有 window.storage 为 API 调用
- [ ] 处理 Token 过期逻辑
- [ ] 测试所有功能

## 🚀 环境变量配置

创建 `.env` 文件：

```env
VITE_API_URL=http://localhost:3000/api
```

生产环境 `.env.production`：

```env
VITE_API_URL=https://api.your-domain.com/api
```

## 📝 改造完成后的目录结构

```
frontend/
├── src/
│   ├── api/           # 新增：API 接口
│   ├── pages/         # 新增：页面组件
│   ├── components/    # 保留：原有组件
│   ├── utils/         # 新增：工具函数
│   ├── App.tsx        # 修改：添加路由
│   └── main.tsx       # 保留：入口文件
├── .env               # 新增：环境变量
└── package.json       # 修改：添加依赖
```

## ✅ 测试清单

1. [ ] 登录功能正常
2. [ ] 素材CRUD正常
3. [ ] 选题CRUD正常
4. [ ] 视频CRUD正常
5. [ ] 文件上传正常
6. [ ] Token过期自动跳转登录

完成这些改造后，你的应用就可以部署到阿里云了！
