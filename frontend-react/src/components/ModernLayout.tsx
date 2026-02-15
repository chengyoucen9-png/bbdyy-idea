import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Tabs, Avatar, Dropdown, Space } from 'antd';
import { UserOutlined, SettingOutlined, LogoutOutlined } from '@ant-design/icons';
import { useAuthStore } from '../store/auth';

const { Header, Content } = Layout;

interface LayoutProps {
  children: React.ReactNode;
}

export default function ModernLayout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const tabs = [
    { key: '/ai-home', label: 'AI 首页' },
    { key: '/materials', label: '素材库' },
    { key: '/topics', label: '选题库' },
    { key: '/videos', label: '成品库' },
    { key: '/analytics', label: '数据分析' },
  ];

  const menuItems = [
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
      onClick: () => navigate('/settings'),
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <Header style={{ background: '#fff', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>短视频内容生产系统</h2>
          <span style={{ fontSize: 12, color: '#999', background: '#f0f0f0', padding: '2px 8px', borderRadius: 4 }}>AI智能版 v3.2 🚀</span>
        </div>
        <Dropdown menu={{ items: menuItems }} placement="bottomRight">
          <Space style={{ cursor: 'pointer' }}>
            <Avatar icon={<UserOutlined />} src={user?.avatar} />
            <span>{user?.nickname || user?.username}</span>
          </Space>
        </Dropdown>
      </Header>
      <div style={{ background: '#fff', padding: '0 32px' }}>
        <Tabs activeKey={location.pathname} onChange={(key) => navigate(key)} items={tabs.map(tab => ({ key: tab.key, label: tab.label }))} size="large" />
      </div>
      <Content style={{ padding: '24px 32px', minHeight: 'calc(100vh - 120px)' }}>
        {children}
      </Content>
    </Layout>
  );
}
