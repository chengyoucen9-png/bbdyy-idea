import { useState, useEffect } from 'react';
import { Button, Card, Form, Input, Table, Tag, Progress, message, Modal, InputNumber, Switch, Select } from 'antd';
import { SyncOutlined, DeleteOutlined, PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

// 定义爬虫任务类型
interface CrawlerTask {
  id: number;
  type: string;
  status: string;
  talentId: number;
  talentUrl: string;
  taskTitle: string;
  progress: number;
  materialsCount: number;
  crawlStartTime: string;
  crawlEndTime: string;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  talent: {
    id: number;
    name: string;
    platform: string;
    profileUrl: string;
  };
}

// 定义爬虫记录类型
interface CrawlerRecord {
  id: number;
  taskId: number;
  type: string;
  url: string;
  title: string;
  status: string;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

// 定义API函数
const crawlerAPI = {
  createTask: (data: any) => axios.post(`/api/crawler/douyin/talent/0`, data),
  getTasks: () => axios.get('/api/crawler/tasks'),
  getTask: (id: number) => axios.get(`/api/crawler/tasks/${id}`),
  deleteTask: (id: number) => axios.delete(`/api/crawler/tasks/${id}`),
  getRecords: (taskId: number) => axios.get(`/api/crawler/tasks/${taskId}/records`),
};

export default function CrawlerPage() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<CrawlerTask | null>(null);
  const [records, setRecords] = useState<CrawlerRecord[]>([]);
  const [recordsModalOpen, setRecordsModalOpen] = useState(false);

  // 获取任务列表
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['crawler-tasks'],
    queryFn: () => crawlerAPI.getTasks().then(res => res.data),
  });

  // 创建爬虫任务
  const createTaskMutation = useMutation({
    mutationFn: (data: any) => crawlerAPI.createTask(data),
    onSuccess: (res) => {
      message.success(res.data.message);
      setModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['crawler-tasks'] });
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || '创建任务失败');
    },
  });

  // 删除任务
  const deleteTaskMutation = useMutation({
    mutationFn: (id: number) => crawlerAPI.deleteTask(id),
    onSuccess: (res) => {
      message.success(res.data.message);
      queryClient.invalidateQueries({ queryKey: ['crawler-tasks'] });
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || '删除任务失败');
    },
  });

  // 获取任务记录
  const getRecords = async (taskId: number) => {
    try {
      const res = await crawlerAPI.getRecords(taskId);
      setRecords(res.data);
      setRecordsModalOpen(true);
    } catch (err) {
      message.error('获取记录失败');
    }
  };

  // 处理表单提交
  const handleSubmit = (values: any) => {
    createTaskMutation.mutate({
      taskTitle: values.taskTitle,
      talentUrl: values.talentUrl,
    });
  };

  // 处理删除任务
  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个爬虫任务吗？',
      okText: '删除',
      cancelText: '取消',
      onOk: () => deleteTaskMutation.mutate(id),
    });
  };

  // 处理查看任务记录
  const handleViewRecords = (task: CrawlerTask) => {
    setSelectedTask(task);
    getRecords(task.id);
  };

  // 处理重新爬取
  const handleRetry = (task: CrawlerTask) => {
    createTaskMutation.mutate({
      taskTitle: task.taskTitle,
      talentUrl: task.talentUrl,
    });
  };

  // 状态标签颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return 'blue';
      case 'COMPLETED':
        return 'green';
      case 'FAILED':
        return 'red';
      case 'PENDING':
        return 'orange';
      default:
        return 'default';
    }
  };

  // 状态标签文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return '运行中';
      case 'COMPLETED':
        return '已完成';
      case 'FAILED':
        return '失败';
      case 'PENDING':
        return '待处理';
      default:
        return status;
    }
  };

  // 表格列配置
  const columns = [
    {
      title: '任务标题',
      dataIndex: 'taskTitle',
      key: 'taskTitle',
      render: (text: string, record: CrawlerTask) => (
        <span style={{ fontWeight: 500 }}>{text}</span>
      ),
    },
    {
      title: '达人',
      dataIndex: 'talent',
      key: 'talent',
      render: (talent: any) => (
        <span>{talent?.name || '-'}</span>
      ),
    },
    {
      title: '抖音链接',
      dataIndex: 'talentUrl',
      key: 'talentUrl',
      render: (url: string) => (
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#1890ff' }}>
          {url.length > 50 ? url.slice(0, 50) + '...' : url}
        </a>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      ),
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress: number, record: CrawlerTask) => (
        <div style={{ width: '120px' }}>
          <Progress percent={progress} size="small" status={record.status === 'FAILED' ? 'exception' : undefined} />
        </div>
      ),
    },
    {
      title: '素材数量',
      dataIndex: 'materialsCount',
      key: 'materialsCount',
      render: (count: number) => (
        <span style={{ color: count > 0 ? '#52c41a' : '#aaa' }}>{count}</span>
      ),
    },
    {
      title: '开始时间',
      dataIndex: 'crawlStartTime',
      key: 'crawlStartTime',
      render: (time: string) => (
        <span style={{ fontSize: 13, color: '#888' }}>
          {time ? new Date(time).toLocaleString('zh-CN') : '-'}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: CrawlerTask) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            size="small"
            type="text"
            icon={<PlayCircleOutlined />}
            onClick={() => handleViewRecords(record)}
            style={{ color: '#1890ff' }}
          >
            查看
          </Button>
          {record.status === 'FAILED' && (
            <Button
              size="small"
              type="text"
              icon={<ReloadOutlined />}
              onClick={() => handleRetry(record)}
              style={{ color: '#faad14' }}
            >
              重试
            </Button>
          )}
          <Button
            size="small"
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </div>
      ),
    },
  ];

  // 记录表格列配置
  const recordColumns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      render: (url: string) => (
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#1890ff' }}>
          {url.length > 50 ? url.slice(0, 50) + '...' : url}
        </a>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'success' ? 'green' : 'red'}>
          {status === 'success' ? '成功' : '失败'}
        </Tag>
      ),
    },
    {
      title: '错误信息',
      dataIndex: 'error',
      key: 'error',
      render: (error: string | null) => (
        <span style={{ fontSize: 12, color: '#ff4d4f' }}>
          {error || '-'}
        </span>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (time: string) => (
        <span style={{ fontSize: 13, color: '#888' }}>
          {new Date(time).toLocaleString('zh-CN')}
        </span>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: '#f0f2f5' }}>
      <Card title="爬虫管理" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>抖音达人视频爬取</h3>
          <Button 
            type="primary" 
            icon={<SyncOutlined />} 
            onClick={() => setModalOpen(true)}
          >
            新建爬虫任务
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={tasks?.data || []}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 新建任务模态框 */}
      <Modal
        title="新建爬虫任务"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setModalOpen(false)}>
            取消
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={createTaskMutation.isPending}
            onClick={() => form.submit()}
          >
            开始爬取
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="taskTitle"
            label="任务名称"
            rules={[{ required: true, message: '请输入任务名称' }]}
          >
            <Input placeholder="请输入任务名称" />
          </Form.Item>
          <Form.Item
            name="talentUrl"
            label="抖音链接"
            rules={[{ required: true, message: '请输入抖音达人主页链接' }]}
          >
            <Input placeholder="请输入抖音达人主页链接，例如：https://www.douyin.com/user/xxx" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 任务记录模态框 */}
      <Modal
        title={`任务记录 - ${selectedTask?.taskTitle}`}
        open={recordsModalOpen}
        onCancel={() => setRecordsModalOpen(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setRecordsModalOpen(false)}>
            关闭
          </Button>,
        ]}
      >
        <Table
          columns={recordColumns}
          dataSource={records}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Modal>
    </div>
  );
}
