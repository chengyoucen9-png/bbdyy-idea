import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  Button,
  Upload,
  Modal,
  Form,
  Input,
  Tag,
  message,
  Space,
  Card,
  Statistic,
  Row,
  Col,
} from 'antd';
import {
  UploadOutlined,
  FileImageOutlined,
  VideoCameraOutlined,
  AudioOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { materialsAPI } from '../api/client';

export default function MaterialsPage() {
  const queryClient = useQueryClient();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [form] = Form.useForm();

  // 获取素材列表
  const { data: materials, isLoading } = useQuery({
    queryKey: ['materials'],
    queryFn: () => materialsAPI.getList(),
  });

  // 获取统计数据
  const { data: stats } = useQuery({
    queryKey: ['materials-stats'],
    queryFn: () => materialsAPI.getStats(),
  });

  // 上传素材
  const uploadMutation = useMutation({
    mutationFn: (data: { file: File; name?: string }) =>
      materialsAPI.upload(data.file, { name: data.name }),
    onSuccess: () => {
      message.success('上传成功！');
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      setUploadModalOpen(false);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '上传失败');
    },
  });

  // 删除素材
  const deleteMutation = useMutation({
    mutationFn: (id: number) => materialsAPI.delete(id),
    onSuccess: () => {
      message.success('删除成功！');
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
  });

  // 手动转写
  const transcribeMutation = useMutation({
    mutationFn: (id: number) => materialsAPI.transcribe(id),
    onSuccess: () => {
      message.success('转写成功！');
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
  });

  const handleUpload = (values: any) => {
    const file = values.file?.file;
    if (file) {
      uploadMutation.mutate({ file, name: values.name });
    }
  };

  const getFileTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return <FileImageOutlined style={{ color: '#52c41a' }} />;
      case 'video': return <VideoCameraOutlined style={{ color: '#1890ff' }} />;
      case 'audio': return <AudioOutlined style={{ color: '#722ed1' }} />;
      default: return null;
    }
  };

  const columns = [
    {
      title: '类型',
      dataIndex: 'fileType',
      key: 'fileType',
      width: 80,
      render: (type: string) => getFileTypeIcon(type),
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '场景描述',
      dataIndex: 'scene',
      key: 'scene',
      ellipsis: true,
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) => (
        <>
          {tags?.map((tag: string) => <Tag key={tag}>{tag}</Tag>)}
        </>
      ),
    },
    {
      title: '使用次数',
      dataIndex: 'usageCount',
      key: 'usageCount',
      width: 100,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: any) => (
        <Space>
          {(record.fileType === 'video' || record.fileType === 'audio') && (
            <Button
              size="small"
              onClick={() => transcribeMutation.mutate(record.id)}
              loading={transcribeMutation.isPending}
            >
              转写
            </Button>
          )}
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => setSelectedMaterial(record)}
          >
            查看
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
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="总素材数"
              value={stats?.total || 0}
              prefix={<FileImageOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="图片素材"
              value={stats?.imageCount || 0}
              prefix={<FileImageOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="视频素材"
              value={stats?.videoCount || 0}
              prefix={<VideoCameraOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 操作栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<UploadOutlined />}
          onClick={() => setUploadModalOpen(true)}
        >
          上传素材
        </Button>
      </Card>

      {/* 素材列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={materials?.items || []}
          loading={isLoading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 上传对话框 */}
      <Modal
        title="上传素材"
        open={uploadModalOpen}
        onCancel={() => setUploadModalOpen(false)}
        footer={null}
      >
        <Form form={form} onFinish={handleUpload} layout="vertical">
          <Form.Item
            name="name"
            label="素材名称"
            rules={[{ required: true, message: '请输入素材名称' }]}
          >
            <Input placeholder="请输入素材名称" />
          </Form.Item>
          <Form.Item
            name="file"
            label="选择文件"
            rules={[{ required: true, message: '请选择文件' }]}
          >
            <Upload beforeUpload={() => false} maxCount={1}>
              <Button icon={<UploadOutlined />}>选择文件</Button>
            </Upload>
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={uploadMutation.isPending}
            >
              上传
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* 查看详情对话框 */}
      <Modal
        title="素材详情"
        open={!!selectedMaterial}
        onCancel={() => setSelectedMaterial(null)}
        footer={null}
        width={600}
      >
        {selectedMaterial && (
          <div>
            <p><strong>名称：</strong>{selectedMaterial.name}</p>
            <p><strong>类型：</strong>{selectedMaterial.fileType}</p>
            <p><strong>场景：</strong>{selectedMaterial.scene}</p>
            {selectedMaterial.note && (
              <p><strong>转写文本：</strong>{selectedMaterial.note}</p>
            )}
            {selectedMaterial.thumbnail && (
              <div>
                <strong>预览：</strong>
                <br />
                {selectedMaterial.fileType === 'image' ? (
                  <img
                    src={selectedMaterial.thumbnail}
                    alt={selectedMaterial.name}
                    style={{ maxWidth: '100%', marginTop: 8 }}
                  />
                ) : (
                  <video
                    src={selectedMaterial.thumbnail}
                    controls
                    style={{ maxWidth: '100%', marginTop: 8 }}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
