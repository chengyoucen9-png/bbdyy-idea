import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Tag,
  Space,
  Popconfirm,
  Avatar,
  message,
  Tooltip,
  Typography,
  Badge,
  Card,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LoginOutlined,
  UserOutlined,
  ReloadOutlined,
  CrownOutlined,
} from '@ant-design/icons';
import { usersAPI } from '../api/client';
import { useAuthStore } from '../store/auth';
import { useNavigate } from 'react-router-dom';

const { Text } = Typography;

interface User {
  id: number;
  username: string;
  email: string;
  nickname: string;
  avatar?: string;
  role: 'user' | 'admin';
  status: number;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loginAsLoading, setLoginAsLoading] = useState<number | null>(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const { login: storeLogin, user: currentUser } = useAuthStore();
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const data: any = await usersAPI.getList();
      setUsers(Array.isArray(data) ? data : data?.data || []);
    } catch {
      message.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── 创建用户 ────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    const values = await createForm.validateFields();
    try {
      await usersAPI.create(values);
      message.success(`用户「${values.username}」创建成功`);
      createForm.resetFields();
      setCreateOpen(false);
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.message || '创建失败');
    }
  };

  // ── 编辑用户 ────────────────────────────────────────────────────────────────
  const openEdit = (u: User) => {
    setEditingUser(u);
    editForm.setFieldsValue({
      nickname: u.nickname,
      email: u.email,
      role: u.role,
    });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editingUser) return;
    const values = await editForm.validateFields();
    try {
      await usersAPI.update(editingUser.id, values);
      message.success('已更新');
      setEditOpen(false);
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.message || '更新失败');
    }
  };

  // ── 启用 / 禁用 ─────────────────────────────────────────────────────────────
  const handleToggleStatus = async (u: User) => {
    try {
      await usersAPI.toggleStatus(u.id);
      message.success(u.status === 1 ? '已禁用' : '已启用');
      load();
    } catch {
      message.error('操作失败');
    }
  };

  // ── 删除 ────────────────────────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    try {
      await usersAPI.delete(id);
      message.success('已删除');
      load();
    } catch {
      message.error('删除失败');
    }
  };

  // ── 一键登录 ────────────────────────────────────────────────────────────────
  const handleLoginAs = async (u: User) => {
    setLoginAsLoading(u.id);
    try {
      const res: any = await usersAPI.loginAs(u.id);
      const token = res.access_token || res.data?.access_token;
      const userInfo = res.user || res.data?.user;
      if (!token) throw new Error('未获取到 token');
      storeLogin(token, userInfo);
      message.success(`已切换为用户「${u.nickname || u.username}」`);
      navigate('/');
    } catch {
      message.error('登录失败');
    } finally {
      setLoginAsLoading(null);
    }
  };

  // ── 列定义 ──────────────────────────────────────────────────────────────────
  const columns = [
    {
      title: '用户',
      key: 'user',
      render: (_: any, u: User) => (
        <Space>
          <Avatar
            src={u.avatar}
            icon={!u.avatar && <UserOutlined />}
            style={{ backgroundColor: u.role === 'admin' ? '#722ed1' : '#1890ff' }}
          />
          <div>
            <div style={{ fontWeight: 500, lineHeight: 1.4 }}>
              {u.nickname || u.username}
              {u.id === currentUser?.id && (
                <Tag color="blue" style={{ marginLeft: 6, fontSize: 11 }}>当前</Tag>
              )}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>@{u.username}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      render: (v: string) => <Text style={{ fontSize: 13 }}>{v}</Text>,
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 90,
      render: (role: string) =>
        role === 'admin' ? (
          <Tag icon={<CrownOutlined />} color="purple">管理员</Tag>
        ) : (
          <Tag color="default">普通用户</Tag>
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: number) => (
        <Badge status={status === 1 ? 'success' : 'default'} text={status === 1 ? '正常' : '禁用'} />
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (v: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {v ? new Date(v).toLocaleString('zh-CN', { hour12: false }) : '—'}
        </Text>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 220,
      render: (_: any, u: User) => (
        <Space size={4}>
          <Tooltip title="一键登录为该用户">
            <Button
              size="small"
              type="primary"
              icon={<LoginOutlined />}
              loading={loginAsLoading === u.id}
              disabled={u.id === currentUser?.id}
              onClick={() => handleLoginAs(u)}
            >
              登录
            </Button>
          </Tooltip>
          <Tooltip title="编辑">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(u)} />
          </Tooltip>
          <Tooltip title={u.status === 1 ? '点击禁用' : '点击启用'}>
            <Switch
              size="small"
              checked={u.status === 1}
              disabled={u.id === currentUser?.id}
              onChange={() => handleToggleStatus(u)}
            />
          </Tooltip>
          <Popconfirm
            title={`确认删除用户「${u.nickname || u.username}」?`}
            onConfirm={() => handleDelete(u.id)}
            disabled={u.id === currentUser?.id}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={u.id === currentUser?.id}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* 头部 */}
      <Card
        style={{ marginBottom: 16 }}
        title={
          <Space>
            <span style={{ fontSize: 15, fontWeight: 600 }}>用户管理</span>
            <Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>
              共 {users.length} 个用户
            </Text>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={load} loading={loading} />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { createForm.resetFields(); setCreateOpen(true); }}>
              创建用户
            </Button>
          </Space>
        }
      >
        {/* 用户表格 */}
        <Table
          rowKey="id"
          dataSource={users}
          columns={columns}
          loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: false }}
          size="middle"
          bordered={false}
        />
      </Card>

      {/* 创建用户弹窗 */}
      <Modal
        title="创建新用户"
        open={createOpen}
        onOk={handleCreate}
        onCancel={() => setCreateOpen(false)}
        okText="创建"
        cancelText="取消"
        width={480}
      >
        <Form form={createForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '至少 3 个字符' },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="登录用户名（不可重复）" />
          </Form.Item>
          <Form.Item
            name="nickname"
            label="昵称"
          >
            <Input placeholder="显示昵称（留空则与用户名相同）" />
          </Form.Item>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '邮箱格式不正确' },
            ]}
          >
            <Input placeholder="example@email.com" />
          </Form.Item>
          <Form.Item
            name="password"
            label="初始密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '至少 6 个字符' },
            ]}
          >
            <Input.Password placeholder="至少 6 位" />
          </Form.Item>
          <Form.Item name="role" label="角色" initialValue="user">
            <Select
              options={[
                { label: '普通用户', value: 'user' },
                { label: '管理员', value: 'admin' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑用户弹窗 */}
      <Modal
        title={`编辑用户：${editingUser?.nickname || editingUser?.username}`}
        open={editOpen}
        onOk={handleEdit}
        onCancel={() => setEditOpen(false)}
        okText="保存"
        cancelText="取消"
        width={480}
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="nickname" label="昵称">
            <Input placeholder="显示昵称" />
          </Form.Item>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[{ type: 'email', message: '邮箱格式不正确' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="role" label="角色">
            <Select
              options={[
                { label: '普通用户', value: 'user' },
                { label: '管理员', value: 'admin' },
              ]}
            />
          </Form.Item>
          <Form.Item name="password" label="重置密码（留空不修改）">
            <Input.Password placeholder="输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
