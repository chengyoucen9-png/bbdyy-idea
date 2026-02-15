// ==================== 登录页面组件 ====================
// 文件路径: frontend/src/pages/Login.tsx

import React, { useState } from 'react';
import { authApi } from '../api';

interface LoginProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 登录表单
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: '',
  });

  // 注册表单
  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    nickname: '',
  });

  // 处理登录
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.login(loginForm);
      
      // 保存 Token 和用户信息
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('user_info', JSON.stringify(response.user));
      
      // 通知父组件登录成功
      onLoginSuccess(response.access_token, response.user);
    } catch (err: any) {
      setError(err.response?.data?.message || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  // 处理注册
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 验证密码
    if (registerForm.password !== registerForm.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (registerForm.password.length < 6) {
      setError('密码至少需要6位');
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.register({
        username: registerForm.username,
        email: registerForm.email,
        password: registerForm.password,
        nickname: registerForm.nickname || registerForm.username,
      });

      // 保存 Token 和用户信息
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('user_info', JSON.stringify(response.user));

      // 通知父组件登录成功
      onLoginSuccess(response.access_token, response.user);
    } catch (err: any) {
      setError(err.response?.data?.message || '注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* Logo 和标题 */}
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-indigo-100 rounded-full mb-4">
            <i className="fas fa-video text-4xl text-indigo-600"></i>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            短视频内容生产系统
          </h1>
          <p className="text-gray-500">
            {isLogin ? '登录您的账号' : '创建新账号'}
          </p>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">
              <i className="fas fa-exclamation-circle mr-2"></i>
              {error}
            </p>
          </div>
        )}

        {/* 登录表单 */}
        {isLogin ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                用户名
              </label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, username: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="请输入用户名"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                密码
              </label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, password: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="请输入密码"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg font-medium text-white transition-all ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg'
              }`}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  登录中...
                </>
              ) : (
                <>
                  <i className="fas fa-sign-in-alt mr-2"></i>
                  登录
                </>
              )}
            </button>
          </form>
        ) : (
          // 注册表单
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                用户名 *
              </label>
              <input
                type="text"
                value={registerForm.username}
                onChange={(e) =>
                  setRegisterForm({ ...registerForm, username: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="至少3个字符"
                required
                minLength={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                邮箱 *
              </label>
              <input
                type="email"
                value={registerForm.email}
                onChange={(e) =>
                  setRegisterForm({ ...registerForm, email: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                昵称
              </label>
              <input
                type="text"
                value={registerForm.nickname}
                onChange={(e) =>
                  setRegisterForm({ ...registerForm, nickname: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="显示名称（可选）"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                密码 *
              </label>
              <input
                type="password"
                value={registerForm.password}
                onChange={(e) =>
                  setRegisterForm({ ...registerForm, password: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="至少6位"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                确认密码 *
              </label>
              <input
                type="password"
                value={registerForm.confirmPassword}
                onChange={(e) =>
                  setRegisterForm({
                    ...registerForm,
                    confirmPassword: e.target.value,
                  })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="再次输入密码"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg font-medium text-white transition-all ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg'
              }`}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  注册中...
                </>
              ) : (
                <>
                  <i className="fas fa-user-plus mr-2"></i>
                  注册
                </>
              )}
            </button>
          </form>
        )}

        {/* 切换登录/注册 */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            {isLogin ? (
              <>
                还没有账号？
                <span className="underline ml-1">立即注册</span>
              </>
            ) : (
              <>
                已有账号？
                <span className="underline ml-1">立即登录</span>
              </>
            )}
          </button>
        </div>

        {/* 底部说明 */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>登录即表示同意我们的服务条款和隐私政策</p>
        </div>
      </div>
    </div>
  );
}

// ==================== 使用示例 ====================
// 文件路径: frontend/src/App.tsx

import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard'; // 你原有的应用主界面

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // 检查是否已登录
    const token = localStorage.getItem('access_token');
    const userInfo = localStorage.getItem('user_info');
    
    if (token && userInfo) {
      setIsAuthenticated(true);
      setUser(JSON.parse(userInfo));
    }
    
    setLoading(false);
  }, []);

  const handleLoginSuccess = (token: string, userData: any) => {
    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_info');
    setIsAuthenticated(false);
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <i className="fas fa-spinner fa-spin text-4xl text-indigo-600"></i>
      </div>
    );
  }

  return (
    <>
      {isAuthenticated ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </>
  );
}
