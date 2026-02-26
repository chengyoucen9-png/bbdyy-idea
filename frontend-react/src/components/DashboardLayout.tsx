import { useState } from 'react';
import { Layout, Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FileImageOutlined,
  BulbOutlined,
  SearchOutlined,
  RobotOutlined,
  LogoutOutlined,
  TeamOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../store/auth';
import { useUploadContext } from '../context/UploadContext';

const { Header, Sider, Content } = Layout;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { uploadTasks, setUploadTasks, uploadProgress, uploadRunning, setUploadProgress } = useUploadContext();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { key: '/', icon: <SearchOutlined />, label: '首页' },
    { key: '/videos', icon: <MessageOutlined />, label: 'AI 对话' },
    { key: '/materials', icon: <FileImageOutlined />, label: '素材管理' },
    { key: '/topics', icon: <BulbOutlined />, label: '选题管理' },
    { key: '/ai-config', icon: <RobotOutlined />, label: 'AI配置' },
    { key: '/users', icon: <TeamOutlined />, label: '用户管理' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} style={{ position: 'fixed', left: 0, top: 0, bottom: 0, overflow: 'auto', height: '100vh', zIndex: 999 }}>
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: collapsed ? 20 : 18,
          fontWeight: 'bold',
        }}>
          {collapsed ? '🎬' : '🎬 短视频系统'}
        </div>
        <Menu
          theme="dark"
          selectedKeys={[location.pathname]}
          mode="inline"
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 200 }}>
        <Header style={{
          padding: '0 24px',
          background: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'fixed',
          top: 0,
          right: 0,
          left: collapsed ? 80 : 200,
          zIndex: 998,
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}>
          <h2 style={{ margin: 0 }}>欢迎，{user?.nickname || user?.username}</h2>
          <a onClick={handleLogout} style={{ cursor: 'pointer' }}>
            <LogoutOutlined /> 退出登录
          </a>
        </Header>
        <Content style={{ marginTop: 64, height: 'calc(100vh - 64px)', overflowY: 'auto' }}>
          {children}
        </Content>
      </Layout>
      {/* 全局上传进度悬浮窗 */}
      {(uploadRunning || uploadTasks.some(t => t.status === 'error')) && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, width: 320, background: '#fff',
          borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', zIndex: 1000, overflow: 'hidden'
        }}>
          <div style={{ padding: '10px 14px', background: uploadRunning ? '#1890ff' : '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: uploadRunning ? '#fff' : '#333', fontWeight: 500, fontSize: 13 }}>
              {uploadRunning ? `上传中 ${uploadProgress?.done}/${uploadProgress?.total}` : '上传完成'}
            </span>
            {!uploadRunning && <span style={{ cursor: 'pointer', color: '#999', fontSize: 16 }} onClick={() => { 
              setUploadTasks([]); 
              setUploadProgress(null);
            }}>✕</span>}
          </div>
          <div style={{ maxHeight: 260, overflowY: 'auto', padding: '6px 0' }}>
            {uploadTasks.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', padding: '6px 14px', gap: 8 }}>
                <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>
                  {t.status === 'done' ? '✅' : t.status === 'error' ? '❌' : t.status === 'uploading' ? '⏳' : '⏸️'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: t.status === 'error' ? '#ff4d4f' : t.status === 'done' ? '#52c41a' : '#333' }}>
                    {t.name}
                  </div>
                  {t.error && (
                    <div style={{ fontSize: 11, color: '#ff4d4f', marginTop: 2, lineHeight: 1.4, wordBreak: 'break-all' }}>
                      {t.error}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
}
