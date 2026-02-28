import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Button, Modal, Form, Input, Select, Tag, message,
  Space, Card, Statistic, Row, Col, Tooltip, Popconfirm, List,
  Tabs, Spin, Avatar, Badge,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  SearchOutlined, ExternalLinkOutlined, VideoCameraOutlined,
  PictureOutlined, FileTextOutlined, SyncOutlined,
} from '@ant-design/icons';
import { talentAPI, crawlerAPI } from '../api/client';

const { Option } = Select;

// 达人平台选项
const platformOptions = [
  { value: 'douyin', label: '抖音' },
  { value: 'kuaishou', label: '快手' },
  { value: 'bili', label: '哔哩哔哩' },
  { value: 'weibo', label: '微博' },
];

// 素材类型选项
const materialTypeOptions = [
  { value: 'video', label: '视频', icon: <VideoCameraOutlined /> },
  { value: 'image', label: '图片', icon: <PictureOutlined /> },
  { value: 'text', label: '文本', icon: <FileTextOutlined /> },
];

// 素材类型图标
const getMaterialTypeIcon = (type: string) => {
  if (type === 'video') return <VideoCameraOutlined style={{ color: '#1890ff' }} />;
  if (type === 'image') return <PictureOutlined style={{ color: '#52c41a' }} />;
  if (type === 'text') return <FileTextOutlined style={{ color: '#fa8c16' }} />;
  return null;
};

// 达人管理组件
function TalentManager() {
  const queryClient = useQueryClient();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentTalent, setCurrentTalent] = useState<any>(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [platformFilter, setPlatformFilter] = useState('all');

  const { data: talents, isLoading: talentsLoading } = useQuery({
    queryKey: ['talents', platformFilter],
    queryFn: () => talentAPI.getList({ 
      platform: platformFilter === 'all' ? undefined : platformFilter 
    }),
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['talent-stats'],
    queryFn: () => talentAPI.getStats(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => talentAPI.create(data),
    onSuccess: () => {
      message.success('达人创建成功！');
      setCreateModalOpen(false);
      createForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['talents'] });
      queryClient.invalidateQueries({ queryKey: ['talent-stats'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => talentAPI.update(id, data),
    onSuccess: () => {
      message.success('达人更新成功！');
      setEditModalOpen(false);
      setCurrentTalent(null);
      editForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['talents'] });
      queryClient.invalidateQueries({ queryKey: ['talent-stats'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => talentAPI.delete(id),
    onSuccess: () => {
      message.success('达人删除成功！');
      queryClient.invalidateQueries({ queryKey: ['talents'] });
      queryClient.invalidateQueries({ queryKey: ['talent-stats'] });
    },
  });

  const crawlMutation = useMutation({
    mutationFn: (talentId: number) => crawlerAPI.crawlDouyinTalent(talentId),
    onSuccess: (data) => {
      message.success(data.message || '爬取成功！');
      queryClient.invalidateQueries({ queryKey: ['talent-materials'] });
      queryClient.invalidateQueries({ queryKey: ['talent-stats'] });
    },
    onError: () => {
      message.error('爬取失败，请重试');
    },
  });

  const batchCrawlMutation = useMutation({
    mutationFn: () => crawlerAPI.batchCrawl(),
    onSuccess: (data) => {
      message.success(`批量爬取完成，成功爬取 ${data.results?.filter((r: any) => r.success).length || 0} 个达人的素材`);
      queryClient.invalidateQueries({ queryKey: ['talent-materials'] });
      queryClient.invalidateQueries({ queryKey: ['talent-stats'] });
    },
    onError: () => {
      message.error('批量爬取失败，请重试');
    },
  });

  const handleCreate = () => {
    createForm.validateFields().then(data => {
      createMutation.mutate(data);
    });
  };

  const handleEdit = (talent: any) => {
    setCurrentTalent(talent);
    editForm.setFieldsValue(talent);
    setEditModalOpen(true);
  };

  const handleUpdate = () => {
    editForm.validateFields().then(data => {
      updateMutation.mutate({ id: currentTalent.id, data });
    });
  };

  const handleCrawl = (talentId: number) => {
    crawlMutation.mutate(talentId);
  };

  const handleBatchCrawl = () => {
    batchCrawlMutation.mutate();
  };

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card style={{ borderTop: '3px solid #1890ff' }}>
            <Statistic 
              title="总达人数" 
              value={stats?.totalTalents || 0} 
              prefix={<Avatar icon={<PlusOutlined />} />} 
              valueStyle={{ color: '#1890ff' }} 
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ borderTop: '3px solid #52c41a' }}>
            <Statistic 
              title="活跃达人" 
              value={stats?.activeTalents || 0} 
              prefix={<Badge status="success" />} 
              valueStyle={{ color: '#52c41a' }} 
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ borderTop: '3px solid #faad14' }}>
            <Statistic 
              title="总素材数" 
              value={stats?.totalMaterials || 0} 
              prefix={<VideoCameraOutlined />} 
              valueStyle={{ color: '#faad14' }} 
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ borderTop: '3px solid #722ed1' }}>
            <Statistic 
              title="视频素材" 
              value={stats?.videoMaterials || 0} 
              prefix={<VideoCameraOutlined />} 
              valueStyle={{ color: '#722ed1' }} 
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>达人管理</span>
            <Space>
              <Button 
                type="default" 
                icon={<SyncOutlined />} 
                onClick={handleBatchCrawl}
                loading={batchCrawlMutation.isPending}
              >
                批量爬取素材
              </Button>
              <Select
                value={platformFilter}
                onChange={setPlatformFilter}
                style={{ width: 120 }}
                options={[
                  { value: 'all', label: '全部平台' },
                  ...platformOptions,
                ]}
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
                添加达人
              </Button>
            </Space>
          </div>
        }
      >
        <Table
          columns={[
            {
              title: '序号',
              key: 'index',
              width: 60,
              render: (_: any, __: any, index: number) => (
                <span style={{ color: '#aaa' }}>{index + 1}</span>
              ),
            },
            {
              title: '达人信息',
              key: 'info',
              render: (record: any) => (
                <Space direction="vertical" style={{ alignItems: 'flex-start' }}>
                  <Space align="center">
                    <Avatar src={record.avatar} size={48} />
                    <div>
                      <div style={{ fontWeight: 500 }}>{record.name}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>
                        {platformOptions.find(p => p.value === record.platform)?.label}
                      </div>
                    </div>
                  </Space>
                  {record.description && (
                    <div style={{ fontSize: 13, color: '#666', lineHeight: 1.4 }}>
                      {record.description}
                    </div>
                  )}
                </Space>
              ),
            },
            {
              title: '粉丝数',
              dataIndex: 'followers',
              key: 'followers',
              width: 120,
              render: (followers: number) => (
                <span style={{ fontWeight: 500, color: '#1890ff' }}>
                  {followers >= 10000 ? (followers / 10000).toFixed(1) + 'w' : followers}
                </span>
              ),
            },
            {
              title: '状态',
              key: 'status',
              width: 80,
              render: (record: any) => (
                <Badge status={record.isActive ? 'success' : 'default'} text={record.isActive ? '活跃' : '停用'} />
              ),
            },
            {
              title: '操作',
              key: 'action',
              width: 200,
              fixed: 'right' as const,
              render: (record: any) => (
                <Space size={4}>
                  <Tooltip title="爬取素材">
                    <Button
                      size="small"
                      type="text"
                      icon={<SyncOutlined spin={crawlMutation.isPending && crawlMutation.variables === record.id} />}
                      onClick={() => handleCrawl(record.id)}
                      style={{ color: '#1890ff' }}
                    />
                  </Tooltip>
                  <Tooltip title="编辑">
                    <Button
                      size="small"
                      type="text"
                      icon={<EditOutlined />}
                      onClick={() => handleEdit(record)}
                      style={{ color: '#faad14' }}
                    />
                  </Tooltip>
                  <Tooltip title="删除">
                    <Popconfirm
                      title="确认删除？"
                      onConfirm={() => deleteMutation.mutate(record.id)}
                      okText="删除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                    >
                      <Button
                        size="small"
                        type="text"
                        icon={<DeleteOutlined />}
                        style={{ color: '#ff4d4f' }}
                      />
                    </Popconfirm>
                  </Tooltip>
                </Space>
              ),
            },
          ]}
          dataSource={(talents?.talents || []).map((t: any) => ({ ...t, key: t.id }))}
          loading={talentsLoading}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showTotal: (t) => `共 ${t} 条`,
            showSizeChanger: true,
          }}
          size="middle"
        />
      </Card>

      {/* 创建达人弹窗 */}
      <Modal
        title="添加达人"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false);
          createForm.resetFields();
        }}
        onOk={handleCreate}
        confirmLoading={createMutation.isPending}
        width={600}
      >
        <Form form={createForm} layout="vertical">
          <Form.Item name="name" label="达人名称" rules={[{ required: true }]}>
            <Input placeholder="请输入达人名称" />
          </Form.Item>
          <Form.Item name="platform" label="平台" rules={[{ required: true }]}>
            <Select placeholder="请选择平台">
              {platformOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="platformId" label="平台ID" rules={[{ required: true }]}>
            <Input placeholder="请输入平台ID" />
          </Form.Item>
          <Form.Item name="avatar" label="头像URL">
            <Input placeholder="请输入头像URL" />
          </Form.Item>
          <Form.Item name="profileUrl" label="主页链接">
            <Input placeholder="请输入达人主页链接" />
          </Form.Item>
          <Form.Item name="followers" label="粉丝数">
            <Input type="number" placeholder="请输入粉丝数" />
          </Form.Item>
          <Form.Item name="description" label="简介">
            <Input.TextArea rows={3} placeholder="请输入达人简介" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑达人弹窗 */}
      <Modal
        title="编辑达人"
        open={editModalOpen}
        onCancel={() => {
          setEditModalOpen(false);
          setCurrentTalent(null);
          editForm.resetFields();
        }}
        onOk={handleUpdate}
        confirmLoading={updateMutation.isPending}
        width={600}
      >
        {currentTalent && (
          <Form form={editForm} layout="vertical">
            <Form.Item name="name" label="达人名称" rules={[{ required: true }]}>
              <Input placeholder="请输入达人名称" />
            </Form.Item>
            <Form.Item name="platform" label="平台" rules={[{ required: true }]}>
              <Select placeholder="请选择平台">
                {platformOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="avatar" label="头像URL">
              <Input placeholder="请输入头像URL" />
            </Form.Item>
            <Form.Item name="profileUrl" label="主页链接">
              <Input placeholder="请输入达人主页链接" />
            </Form.Item>
            <Form.Item name="followers" label="粉丝数">
              <Input type="number" placeholder="请输入粉丝数" />
            </Form.Item>
            <Form.Item name="description" label="简介">
              <Input.TextArea rows={3} placeholder="请输入达人简介" />
            </Form.Item>
            <Form.Item name="isActive" label="状态">
              <Select placeholder="请选择状态">
                <Option value={true}>活跃</Option>
                <Option value={false}>停用</Option>
              </Select>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
}

// 素材管理组件
function TalentMaterials() {
  const queryClient = useQueryClient();
  const [searchKeywords, setSearchKeywords] = useState('');
  const [talentFilter, setTalentFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: talents, isLoading: talentsLoading } = useQuery({
    queryKey: ['talents-list'],
    queryFn: () => talentAPI.getList(),
  });

  const { data: materials, isLoading: materialsLoading } = useQuery({
    queryKey: ['talent-materials', talentFilter, typeFilter, searchKeywords],
    queryFn: () => talentAPI.getMaterials({
      talentId: talentFilter === 'all' ? undefined : Number(talentFilter),
      type: typeFilter === 'all' ? undefined : typeFilter,
      keywords: searchKeywords,
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => talentAPI.deleteMaterial(id),
    onSuccess: () => {
      message.success('素材删除成功！');
      queryClient.invalidateQueries({ queryKey: ['talent-materials'] });
      queryClient.invalidateQueries({ queryKey: ['talent-stats'] });
    },
  });

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <div style={{ fontSize: 15, fontWeight: 600 }}>达人素材管理</div>
        }
      >
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
          <Input.Search
            placeholder="搜索素材标题或场景"
            allowClear
            value={searchKeywords}
            onChange={e => setSearchKeywords(e.target.value)}
            onSearch={v => setSearchKeywords(v)}
            style={{ flex: 1, maxWidth: 400 }}
          />
          <Select
            value={talentFilter}
            onChange={setTalentFilter}
            style={{ width: 160 }}
            options={[
              { value: 'all', label: '全部达人' },
              ...(talents?.talents || []).map((t: any) => ({
                value: t.id.toString(),
                label: t.name,
              })),
            ]}
          />
          <Select
            value={typeFilter}
            onChange={setTypeFilter}
            style={{ width: 120 }}
            options={[
              { value: 'all', label: '全部类型' },
              ...materialTypeOptions.map(option => ({
                value: option.value,
                label: option.label,
                icon: option.icon,
              })),
            ]}
          />
        </div>

        <Table
          columns={[
            {
              title: '序号',
              key: 'index',
              width: 60,
              render: (_: any, __: any, index: number) => (
                <span style={{ color: '#aaa' }}>{index + 1}</span>
              ),
            },
            {
              title: '类型',
              key: 'type',
              width: 60,
              render: (record: any) => getMaterialTypeIcon(record.type),
            },
            {
              title: '素材信息',
              key: 'info',
              render: (record: any) => (
                <div>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>{record.title}</div>
                  {record.cover && (
                    <img
                      src={record.cover}
                      alt={record.title}
                      style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 4, marginBottom: 4 }}
                    />
                  )}
                  <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                    来源：{record.talent?.name || '未知'}
                  </div>
                </div>
              ),
            },
            {
              title: '数据',
              key: 'stats',
              width: 180,
              render: (record: any) => (
                <Space direction="vertical" size={4}>
                  <div style={{ fontSize: 12 }}>
                    点赞：<span style={{ color: '#1890ff' }}>{record.likes}</span>
                  </div>
                  <div style={{ fontSize: 12 }}>
                    评论：<span style={{ color: '#52c41a' }}>{record.comments}</span>
                  </div>
                  <div style={{ fontSize: 12 }}>
                    分享：<span style={{ color: '#faad14' }}>{record.shares}</span>
                  </div>
                </Space>
              ),
            },
            {
              title: '标签',
              key: 'tags',
              width: 150,
              render: (record: any) => (
                <div>
                  {record.tags?.map((tag: string) => (
                    <Tag key={tag} color="blue" style={{ marginBottom: 2 }}>
                      {tag}
                    </Tag>
                  )) || <span style={{ color: '#ccc' }}>—</span>}
                </div>
              ),
            },
            {
              title: '爬取时间',
              key: 'crawlTime',
              width: 120,
              render: (record: any) => (
                <span style={{ fontSize: 12, color: '#888' }}>
                  {record.crawlTime ? new Date(record.crawlTime).toLocaleDateString('zh-CN') : '—'}
                </span>
              ),
            },
            {
              title: '操作',
              key: 'action',
              width: 120,
              fixed: 'right' as const,
              render: (record: any) => (
                <Space size={4}>
                  <Tooltip title="查看链接">
                    <Button
                      size="small"
                      type="text"
                      icon={<ExternalLinkOutlined />}
                      onClick={() => window.open(record.url, '_blank')}
                      style={{ color: '#1890ff' }}
                    />
                  </Tooltip>
                  <Tooltip title="删除">
                    <Popconfirm
                      title="确认删除？"
                      onConfirm={() => deleteMutation.mutate(record.id)}
                      okText="删除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                    >
                      <Button
                        size="small"
                        type="text"
                        icon={<DeleteOutlined />}
                        style={{ color: '#ff4d4f' }}
                      />
                    </Popconfirm>
                  </Tooltip>
                </Space>
              ),
            },
          ]}
          dataSource={(materials?.materials || []).map((m: any) => ({ ...m, key: m.id }))}
          loading={materialsLoading || talentsLoading}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showTotal: (t) => `共 ${t} 条`,
            showSizeChanger: true,
          }}
          size="middle"
        />
      </Card>
    </div>
  );
}

// 主页面组件
export default function TalentsPage() {
  const [activeTab, setActiveTab] = useState('talents');

  return (
    <div>
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <Tabs.TabPane tab="达人管理" key="talents">
          <TalentManager />
        </Tabs.TabPane>
        <Tabs.TabPane tab="素材管理" key="materials">
          <TalentMaterials />
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
}
