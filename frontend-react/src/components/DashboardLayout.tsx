import { useState } from 'react';
import { Layout, Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FileImageOutlined,
  BulbOutlined,
  VideoCameraOutlined,
  RobotOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../store/auth';

const { Header, Sider, Content } = Layout;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { key: '/materials', icon: <FileImageOutlined />, label: '素材管理' },
    { key: '/topics', icon: <BulbOutlined />, label: '选题管理' },
    { key: '/videos', icon: <VideoCameraOutlined />, label: '视频管理' },
    { key: '/ai-config', icon: <RobotOutlined />, label: 'AI配置' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
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
      <Layout>
        <Header style={{
          padding: '0 24px',
          background: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ margin: 0 }}>欢迎，{user?.nickname || user?.username}</h2>
          <a onClick={handleLogout} style={{ cursor: 'pointer' }}>
            <LogoutOutlined /> 退出登录
          </a>
        </Header>
        <Content style={{ margin: '24px 16px 0', overflow: 'initial' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
