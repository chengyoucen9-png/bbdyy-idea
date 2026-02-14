import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
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
  EyeOutlined,
  LikeOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { videosAPI } from '../api/client';
import dayjs from 'dayjs';

export default function VideosPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<any>(null);
  const [form] = Form.useForm();

  const { data: videos, isLoading } = useQuery({
    queryKey: ['videos'],
    queryFn: () => videosAPI.getList(),
  });

  const { data: stats } = useQuery({
    queryKey: ['videos-stats'],
    queryFn: () => videosAPI.getStats(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => videosAPI.create(data),
    onSuccess: () => {
      message.success('创建成功！');
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      handleCloseModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => videosAPI.update(id, data),
    onSuccess: () => {
      message.success('更新成功！');
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      handleCloseModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => videosAPI.delete(id),
    onSuccess: () => {
      message.success('删除成功！');
      queryClient.invalidateQueries({ queryKey: ['videos'] });
    },
  });

  const handleOpenModal = (video?: any) => {
    if (video) {
      setEditingVideo(video);
      form.setFieldsValue({
        ...video,
        publishDate: video.publishDate ? dayjs(video.publishDate) : null,
      });
    } else {
      setEditingVideo(null);
      form.resetFields();
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingVideo(null);
    form.resetFields();
  };

  const handleSubmit = (values: any) => {
    const data = {
      ...values,
      publishDate: values.publishDate?.format('YYYY-MM-DD'),
    };
    
    if (editingVideo) {
      updateMutation.mutate({ id: editingVideo.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform',
    },
    {
      title: '发布日期',
      dataIndex: 'publishDate',
      key: 'publishDate',
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '数据',
      key: 'data',
      render: (_: any, record: any) => (
        <Space direction="vertical" size="small">
          <span><EyeOutlined /> {record.views || 0}</span>
          <span><LikeOutlined /> {record.likes || 0}</span>
          <span><MessageOutlined /> {record.comments || 0}</span>
        </Space>
      ),
    },
    {
      title: '完播率',
      dataIndex: 'completionRate',
      key: 'completionRate',
      render: (rate: number) => `${(rate || 0).toFixed(1)}%`,
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
              title="总视频数"
              value={stats?.totalVideos || 0}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总播放量"
              value={stats?.totalViews || 0}
              prefix={<EyeOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总点赞数"
              value={stats?.totalLikes || 0}
              prefix={<LikeOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均完播率"
              value={(stats?.avgCompletionRate || 0).toFixed(1)}
              suffix="%"
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
          新建视频记录
        </Button>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={videos || []}
          loading={isLoading}
          rowKey="id"
        />
      </Card>

      <Modal
        title={editingVideo ? '编辑视频' : '新建视频'}
        open={modalOpen}
        onCancel={handleCloseModal}
        footer={null}
        width={600}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            name="title"
            label="视频标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入视频标题" />
          </Form.Item>
          <Form.Item name="platform" label="发布平台">
            <Input placeholder="如：抖音、快手、B站" />
          </Form.Item>
          <Form.Item name="publishDate" label="发布日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="views" label="播放量">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="likes" label="点赞数">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="comments" label="评论数">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="completionRate" label="完播率(%)">
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingVideo ? '更新' : '创建'}
              </Button>
              <Button onClick={handleCloseModal}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
