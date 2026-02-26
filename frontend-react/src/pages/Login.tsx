import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { authAPI } from '../api/client';
import { useAuthStore } from '../store/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (values: any) => {
    setLoading(true);
    try {
      const response = await authAPI.login(values);
      const r = response as any;
      login(r?.access_token || r?.data?.access_token, r?.user || r?.data?.user);
      message.success('登录成功！');
      navigate('/');
    } catch (error: any) {
      message.error(error.response?.data?.message || '用户名或密码错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
    }}>
      {/* ── 左侧海报区 ── */}
      <div style={{
        flex: 1,
        background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #533483 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 48px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* 装饰光晕 */}
        <div style={{
          position: 'absolute', top: -80, right: -80,
          width: 320, height: 320, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(83,52,131,0.5) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -60, left: -60,
          width: 260, height: 260, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(15,52,96,0.7) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* 主插图 SVG */}
        <svg viewBox="0 0 420 300" style={{ width: '80%', maxWidth: 380, marginBottom: 40 }} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* 背景屏幕 */}
          <rect x="40" y="30" width="340" height="210" rx="16" fill="#0d1b2a" stroke="#2a4a6b" strokeWidth="2"/>
          <rect x="40" y="30" width="340" height="24" rx="12" fill="#162032"/>
          <circle cx="60" cy="42" r="5" fill="#ff5f57"/>
          <circle cx="78" cy="42" r="5" fill="#ffbd2e"/>
          <circle cx="96" cy="42" r="5" fill="#28c840"/>

          {/* 视频播放区 */}
          <rect x="60" y="68" width="200" height="130" rx="8" fill="#111d2e"/>
          {/* 播放按钮 */}
          <circle cx="160" cy="133" r="28" fill="rgba(99,102,241,0.3)" stroke="#6366f1" strokeWidth="1.5"/>
          <polygon points="152,120 152,146 178,133" fill="#6366f1"/>
          {/* 进度条 */}
          <rect x="60" y="207" width="200" height="4" rx="2" fill="#1e3a5f"/>
          <rect x="60" y="207" width="120" height="4" rx="2" fill="#6366f1"/>
          <circle cx="180" cy="209" r="5" fill="#6366f1"/>

          {/* 右侧面板 */}
          <rect x="276" y="68" width="88" height="40" rx="6" fill="#111d2e"/>
          <rect x="284" y="78" width="32" height="4" rx="2" fill="#3b5480"/>
          <rect x="284" y="88" width="48" height="4" rx="2" fill="#2a4a6b"/>
          <rect x="276" y="118" width="88" height="40" rx="6" fill="#111d2e"/>
          <rect x="284" y="128" width="24" height="4" rx="2" fill="#3b5480"/>
          <rect x="284" y="138" width="56" height="4" rx="2" fill="#2a4a6b"/>
          <rect x="276" y="168" width="88" height="44" rx="6" fill="#111d2e"/>
          <rect x="284" y="178" width="40" height="4" rx="2" fill="#3b5480"/>
          <rect x="284" y="188" width="52" height="4" rx="2" fill="#2a4a6b"/>
          <rect x="284" y="198" width="30" height="4" rx="2" fill="#2a4a6b"/>

          {/* 底部统计栏 */}
          <rect x="60" y="222" width="304" height="2" rx="1" fill="#1a2e45"/>
          <rect x="60" y="232" width="60" height="8" rx="4" fill="#1a3a6b"/>
          <rect x="130" y="232" width="60" height="8" rx="4" fill="#1a3a6b"/>
          <rect x="200" y="232" width="60" height="8" rx="4" fill="#1a3a6b"/>

          {/* 浮动标签 */}
          <rect x="10" y="100" width="48" height="22" rx="11" fill="#6366f1"/>
          <text x="34" y="115" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">AI 生成</text>
          <rect x="362" y="90" width="52" height="22" rx="11" fill="#10b981"/>
          <text x="388" y="105" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">素材库</text>
          <rect x="130" y="270" width="64" height="22" rx="11" fill="#f59e0b"/>
          <text x="162" y="285" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">选题管理</text>
        </svg>

        {/* 标题 */}
        <div style={{ color: '#fff', fontSize: 28, fontWeight: 700, letterSpacing: 1, marginBottom: 12, textAlign: 'center' }}>
          短视频内容生产系统
        </div>
        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, textAlign: 'center', lineHeight: 1.8, maxWidth: 300 }}>
          AI 辅助选题 · 素材智能管理 · 一键生成文稿
        </div>

        {/* 特性标签 */}
        <div style={{ display: 'flex', gap: 10, marginTop: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
          {['🤖 AI 文案', '📁 素材库', '🎬 视频管理', '📊 数据统计'].map(tag => (
            <span key={tag} style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 20,
              padding: '4px 14px',
              color: 'rgba(255,255,255,0.75)',
              fontSize: 13,
            }}>{tag}</span>
          ))}
        </div>
      </div>

      {/* ── 右侧登录区 ── */}
      <div style={{
        width: 420,
        minWidth: 360,
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 48px',
      }}>
        <div style={{ width: '100%', maxWidth: 320 }}>
          <div style={{ marginBottom: 36, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🎬</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#111', marginBottom: 6 }}>欢迎回来</div>
            <div style={{ color: '#888', fontSize: 14 }}>请登录你的账号继续使用</div>
          </div>

          <Form onFinish={handleLogin} layout="vertical" size="large">
            <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
              <Input
                prefix={<UserOutlined style={{ color: '#bbb' }} />}
                placeholder="用户名"
                style={{ borderRadius: 8, height: 46 }}
              />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password
                prefix={<LockOutlined style={{ color: '#bbb' }} />}
                placeholder="密码"
                style={{ borderRadius: 8, height: 46 }}
              />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                style={{
                  height: 46,
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 600,
                  background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                  border: 'none',
                }}
              >
                登 录
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center', marginTop: 32, color: '#bbb', fontSize: 13 }}>
            如需创建账号，请联系管理员
          </div>
        </div>
      </div>
    </div>
  );
}
