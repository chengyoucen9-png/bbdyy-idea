import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  message,
  Space,
  Card,
  Statistic,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { topicsAPI } from '../api/client';

const { TextArea } = Input;

export default function TopicsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<any>(null);
  const [form] = Form.useForm();

  const { data: topics, isLoading } = useQuery({
    queryKey: ['topics'],
    queryFn: () => topicsAPI.getList(),
  });

  const { data: stats } = useQuery({
    queryKey: ['topics-stats'],
    queryFn: () => topicsAPI.getStats(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => topicsAPI.create(data),
    onSuccess: () => {
      message.success('创建成功！');
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      handleCloseModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => topicsAPI.update(id, data),
    onSuccess: () => {
      message.success('更新成功！');
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      handleCloseModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => topicsAPI.delete(id),
    onSuccess: () => {
      message.success('删除成功！');
      queryClient.invalidateQueries({ queryKey: ['topics'] });
    },
  });

  const handleOpenModal = (topic?: any) => {
    if (topic) {
      setEditingTopic(topic);
      form.setFieldsValue(topic);
    } else {
      setEditingTopic(null);
      form.resetFields();
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingTopic(null);
    form.resetFields();
  };

  const handleSubmit = (values: any) => {
    if (editingTopic) {
      updateMutation.mutate({ id: editingTopic.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const getStatusTag = (status: string) => {
    const colors: any = {
      pending: 'default',
      inProgress: 'processing',
      completed: 'success',
    };
    const labels: any = {
      pending: '待处理',
      inProgress: '进行中',
      completed: '已完成',
    };
    return <Tag color={colors[status]}>{labels[status]}</Tag>;
  };

  const getPriorityTag = (priority: string) => {
    const colors: any = {
      low: 'green',
      medium: 'orange',
      high: 'red',
    };
    const labels: any = {
      low: '低',
      medium: '中',
      high: '高',
    };
    return <Tag color={colors[priority]}>{labels[priority]}</Tag>;
  };

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => getPriorityTag(priority),
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      render: (difficulty: number) => '⭐'.repeat(difficulty),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(record)}
          >
            编辑
          </Button>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              Modal.confirm({
                title: '确认删除？',
                onOk: () => deleteMutation.mutate(record.id),
              });
            }}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总选题数"
              value={stats?.total || 0}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待处理"
              value={stats?.pending || 0}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="进行中"
              value={stats?.inProgress || 0}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已完成"
              value={stats?.completed || 0}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleOpenModal()}
        >
          新建选题
        </Button>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={topics || []}
          loading={isLoading}
          rowKey="id"
        />
      </Card>

      <Modal
        title={editingTopic ? '编辑选题' : '新建选题'}
        open={modalOpen}
        onCancel={handleCloseModal}
        footer={null}
        width={600}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            name="title"
            label="选题标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入选题标题" />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <TextArea rows={4} placeholder="请输入选题描述" />
          </Form.Item>
          <Form.Item
            name="source"
            label="来源"
          >
            <Input placeholder="选题来源" />
          </Form.Item>
          <Form.Item
            name="status"
            label="状态"
            initialValue="pending"
          >
            <Select>
              <Select.Option value="pending">待处理</Select.Option>
              <Select.Option value="inProgress">进行中</Select.Option>
              <Select.Option value="completed">已完成</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="priority"
            label="优先级"
            initialValue="medium"
          >
            <Select>
              <Select.Option value="low">低</Select.Option>
              <Select.Option value="medium">中</Select.Option>
              <Select.Option value="high">高</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="difficulty"
            label="难度"
            initialValue={2}
          >
            <Select>
              <Select.Option value={1}>⭐</Select.Option>
              <Select.Option value={2}>⭐⭐</Select.Option>
              <Select.Option value={3}>⭐⭐⭐</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingTopic ? '更新' : '创建'}
              </Button>
              <Button onClick={handleCloseModal}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
