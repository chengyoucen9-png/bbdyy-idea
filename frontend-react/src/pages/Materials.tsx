import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Button, Upload, Modal, Form, Input, Select, Tag, message,
  Space, Card, Statistic, Row, Col, Tooltip, Popconfirm, List, Drawer,
} from 'antd';
import {
  UploadOutlined, FileImageOutlined, VideoCameraOutlined,
  AudioOutlined, DeleteOutlined, EyeOutlined, EditOutlined,
  SyncOutlined, PlayCircleOutlined, CloseCircleOutlined,
} from '@ant-design/icons';
import { materialsAPI } from '../api/client';
import { useUploadContext } from '../context/UploadContext';

const TAG_OPTIONS = [
  {
    label: '内容结构',
    options: ['开场', '结尾', '口播', '产品展示', '成分讲解', '对比测评', '种草', '避坑', '日常分享'].map(t => ({ label: t, value: t })),
  },
  {
    label: '祛痘成分',
    options: ['水杨酸', '壬二酸', '维A酸', '烟酰胺', '积雪草', '茶树精油', '硫磺', '杜鹃花酸', '过氧化苯甲酰'].map(t => ({ label: t, value: t })),
  },
  {
    label: '皮肤问题',
    options: ['闭口粉刺', '黑头', '炎症痘', '囊肿痘', '痘印', '痘疤', '控油', '毛孔粗大', '屏障受损', '敏感泛红'].map(t => ({ label: t, value: t })),
  },
  {
    label: '适用肤质',
    options: ['油皮', '混合偏油', '干皮', '敏感肌', '痘痘肌'].map(t => ({ label: t, value: t })),
  },
  {
    label: '产品类型',
    options: ['洗面奶', '水乳', '精华液', '面霜', '面膜', '防晒', '喷雾', '卸妆', '去角质'].map(t => ({ label: t, value: t })),
  },
  {
    label: '使用场景',
    options: ['早C晚A', '日常护肤', '应急处理', '换季护肤', '睡前护肤', '孕期可用'].map(t => ({ label: t, value: t })),
  },
];

const PREDEFINED_TAG_VALUES = new Set(TAG_OPTIONS.flatMap(g => g.options.map(o => o.value)));

// 标签多选组件
function TagSelector({ value = [], onChange }: { value?: string[]; onChange?: (tags: string[]) => void }) {
  const [searchText, setSearchText] = useState('');

  const toggle = (tag: string) => {
    const next = value.includes(tag) ? value.filter(t => t !== tag) : [...value, tag];
    onChange?.(next);
  };

  const addCustom = () => {
    const trimmed = searchText.trim();
    if (!trimmed) return;
    if (!value.includes(trimmed)) onChange?.([...value, trimmed]);
    setSearchText('');
  };

  const keyword = searchText.trim().toLowerCase();
  const isSearching = keyword.length > 0;

  // 搜索时展示所有命中的预设标签（跨组平铺）
  const filteredAll = isSearching
    ? TAG_OPTIONS.flatMap(g => g.options).filter(o => o.label.includes(keyword))
    : [];

  // 自定义标签（不在预设中）
  const customTags = value.filter(t => !PREDEFINED_TAG_VALUES.has(t));

  const TagChip = ({ label, val }: { label: string; val: string }) => {
    const selected = value.includes(val);
    return (
      <span
        onClick={() => toggle(val)}
        style={{
          cursor: 'pointer', userSelect: 'none', borderRadius: 4,
          padding: '3px 10px', fontSize: 13,
          background: selected ? '#1677ff' : '#f5f5f5',
          color: selected ? '#fff' : '#555',
          border: `1px solid ${selected ? '#1677ff' : '#e0e0e0'}`,
          fontWeight: selected ? 500 : 400,
          transition: 'all 0.15s',
        }}
      >
        {label}
      </span>
    );
  };

  return (
    <div>
      <Input
        value={searchText}
        onChange={e => setSearchText(e.target.value)}
        onPressEnter={addCustom}
        placeholder="搜索标签，无结果时按 Enter 添加自定义"
        size="small"
        allowClear
        style={{ marginBottom: 10 }}
      />

      {isSearching ? (
        // 搜索模式：平铺命中标签 + 自定义入口
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {filteredAll.length > 0
            ? filteredAll.map(opt => <TagChip key={opt.value} label={opt.label} val={opt.value} />)
            : <span style={{ fontSize: 12, color: '#aaa' }}>无匹配，按 Enter 添加「{searchText.trim()}」</span>
          }
        </div>
      ) : (
        // 浏览模式：按分组展示
        TAG_OPTIONS.map(group => (
          <div key={group.label} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 5, fontWeight: 500 }}>{group.label}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {group.options.map(opt => <TagChip key={opt.value} label={opt.label} val={opt.value} />)}
            </div>
          </div>
        ))
      )}

      {customTags.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: '#999', marginBottom: 5, fontWeight: 500 }}>自定义</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {customTags.map(t => (
              <Tag key={t} closable onClose={() => toggle(t)} color="blue" style={{ margin: 0 }}>{t}</Tag>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 预览弹窗
function PreviewModal({ mat, open, onClose }: { mat: any; open: boolean; onClose: () => void }) {
  if (!mat) return null;
  const fileUrl = mat.ossUrl || mat.thumbnail;
  return (
    <Modal title={mat.name} open={open} onCancel={onClose} footer={null} width={700} centered>
      <div>
        {fileUrl && mat.fileType === 'video' && (
          <video controls autoPlay style={{ width: '100%', borderRadius: 8, maxHeight: 400, background: '#000' }} src={fileUrl} />
        )}
        {fileUrl && mat.fileType === 'audio' && (
          <div style={{ padding: '20px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎵</div>
            <audio controls style={{ width: '100%' }} src={fileUrl} />
          </div>
        )}
        {fileUrl && mat.fileType === 'image' && (
          <img src={fileUrl} alt={mat.name} style={{ width: '100%', borderRadius: 8, objectFit: 'contain', maxHeight: 400 }} />
        )}
        {!fileUrl && <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>文件链接不可用</div>}
        <div style={{ marginTop: 16, padding: '12px 16px', background: '#f7f8fa', borderRadius: 8 }}>
          <Row gutter={12}>
            <Col span={24} style={{ marginBottom: 8 }}>
              <span style={{ color: '#888', fontSize: 13 }}>场景：</span>
              <span style={{ fontSize: 13 }}>{mat.scene || '—'}</span>
            </Col>
            {mat.tags?.length > 0 && (
              <Col span={24} style={{ marginBottom: 8 }}>
                {mat.tags.map((t: string) => <Tag key={t} color="blue">{t}</Tag>)}
              </Col>
            )}
            {mat.note && (
              <Col span={24}>
                <div style={{ color: '#888', fontSize: 13, marginBottom: 4 }}>逐字稿：</div>
                <div style={{ fontSize: 13, lineHeight: 1.8, padding: '8px 12px', background: '#fff', borderRadius: 6, maxHeight: 200, overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {mat.note}
                </div>
              </Col>
            )}
          </Row>
        </div>
      </div>
    </Modal>
  );
}

export default function MaterialsPage() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const { setUploadTasks, setUploadProgress, setUploadRunning } = useUploadContext();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [createAttachment, setCreateAttachment] = useState<File | null>(null);
  const [previewMat, setPreviewMat] = useState<any>(null);
  const [editMat, setEditMat] = useState<any>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [batchUploading, setBatchUploading] = useState(false);
  const [editForm] = Form.useForm();
  const [createForm] = Form.useForm();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: materials, isLoading } = useQuery({
    queryKey: ['materials', 'bbdyy'],
    queryFn: () => materialsAPI.getList({ limit: 100, page: 1, type: 'bbdyy' }),
  });

  // 从首页"编辑素材"按钮跳转过来时，自动打开对应编辑弹窗
  useEffect(() => {
    const editId = (location.state as any)?.editId;
    if (!editId || !materials) return;
    const items: any[] = (materials as any)?.items ?? (Array.isArray(materials) ? materials : []);
    const mat = items.find((m: any) => m.id === editId);
    if (mat) {
      setEditMat(mat);
      editForm.setFieldsValue({ name: mat.name, scene: mat.scene, note: mat.note, tags: mat.tags || [] });
    }
  }, [location.state, materials]);

  const { data: stats } = useQuery({
    queryKey: ['materials-stats', 'bbdyy'],
    queryFn: () => materialsAPI.getStats({ type: 'bbdyy' }),
  });

  const handleBatchUpload = async () => {
    if (pendingFiles.length === 0) {
      message.warning('请至少选择一个文件');
      return;
    }
    const tasks: { name: string; status: 'pending' | 'uploading' | 'done' | 'error'; error?: string }[] =
      pendingFiles.map(f => ({ name: f.name, status: 'pending' }));
    setUploadTasks([...tasks]);
    setUploadProgress({ done: 0, total: pendingFiles.length });
    setUploadRunning(true);
    setBatchUploading(true);
    setUploadModalOpen(false);
    setPendingFiles([]);

    for (let i = 0; i < pendingFiles.length; i++) {
      tasks[i] = { ...tasks[i], status: 'uploading' };
      setUploadTasks([...tasks]);
      try {
        await materialsAPI.upload(pendingFiles[i], { name: pendingFiles[i].name, authorName: 'bbdyy' });
        tasks[i] = { ...tasks[i], status: 'done' };
      } catch (err: any) {
        tasks[i] = { ...tasks[i], status: 'error', error: err.response?.data?.message || '上传失败' };
      }
      setUploadTasks([...tasks]);
      setUploadProgress({ done: i + 1, total: pendingFiles.length });
    }

    setUploadRunning(false);
    setBatchUploading(false);
    queryClient.invalidateQueries({ queryKey: ['materials'] });
    queryClient.invalidateQueries({ queryKey: ['materials-stats'] });
    const errCount = tasks.filter(t => t.status === 'error').length;
    if (errCount === 0) message.success(`全部 ${tasks.length} 个文件上传成功！`);
    else message.warning(`上传完成：${tasks.length - errCount} 成功，${errCount} 失败`);
  };

  const deleteMutation = useMutation({
    mutationFn: (id: number) => materialsAPI.delete(id),
    onSuccess: () => {
      message.success('删除成功！');
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['materials-stats'] });
    },
  });

  const transcribeMutation = useMutation({
    mutationFn: (id: number) => materialsAPI.transcribe(id),
    onSuccess: () => {
      message.success('转写成功！');
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || '转写失败';
      message.error(`转写失败: ${errorMessage}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => materialsAPI.update(id, data),
    onSuccess: () => {
      message.success('保存成功！');
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      setEditMat(null);
    },
  });

  const handleCreateSubmit = async () => {
    const v = await createForm.validateFields();
    if (createAttachment) {
      await materialsAPI.upload(createAttachment, {
        name: v.name,
        scene: v.scene || '',
        note: v.note || '',
        authorName: 'bbdyy',
      });
    } else {
      await materialsAPI.create({ ...v, authorName: 'bbdyy', fileSize: 0 });
    }
    message.success('创建成功！');
    queryClient.invalidateQueries({ queryKey: ['materials'] });
    queryClient.invalidateQueries({ queryKey: ['materials-stats'] });
    setCreateDrawerOpen(false);
    setCreateAttachment(null);
    createForm.resetFields();
  };

  const createMutation = useMutation({
    mutationFn: handleCreateSubmit,
    onError: (err: any) => {
      message.error(err.response?.data?.message || '创建失败');
    },
  });

  const getFileTypeIcon = (type: string) => {
    if (type === 'image') return <FileImageOutlined style={{ color: '#52c41a', fontSize: 18 }} />;
    if (type === 'video') return <VideoCameraOutlined style={{ color: '#1890ff', fontSize: 18 }} />;
    if (type === 'audio') return <AudioOutlined style={{ color: '#722ed1', fontSize: 18 }} />;
    return null;
  };

  const statData = stats as any;
  const matList = (materials as any)?.items || (Array.isArray(materials) ? materials : []);

  const filteredList = matList.filter((item: any) => {
    const matchType = typeFilter === 'all' || item.fileType === typeFilter;
    if (!searchKeyword) return matchType;
    const kw = searchKeyword.toLowerCase();
    return matchType && (
      (item.name || '').toLowerCase().includes(kw) ||
      (item.note || '').toLowerCase().includes(kw) ||
      (item.scene || '').toLowerCase().includes(kw) ||
      (item.tags || []).some((t: string) => t.toLowerCase().includes(kw))
    );
  });

  const columns = [
    {
      title: '序号', key: 'index', width: 60,
      render: (_: any, __: any, index: number) => <span style={{ color: '#aaa' }}>{index + 1}</span>,
    },
    {
      title: '类型', dataIndex: 'fileType', key: 'fileType', width: 60,
      render: (type: string) => getFileTypeIcon(type),
    },
    {
      title: '名称', dataIndex: 'name', key: 'name', width: 180,
      render: (name: string) => (
        <span style={{ fontWeight: 500 }}>{name}</span>
      ),
    },
    {
      title: '逐字稿', dataIndex: 'note', key: 'note',
      render: (note: string) => note
        ? <span style={{ color: '#555', fontSize: 13 }}>{note.length > 40 ? note.slice(0, 40) + '...' : note}</span>
        : <span style={{ color: '#ccc', fontSize: 13 }}>暂无</span>,
    },
    {
      title: '标签', dataIndex: 'tags', key: 'tags', width: 220,
      render: (tags: string[]) => Array.isArray(tags) && tags.length
        ? tags.slice(0, 4).map((tag: string) => <Tag key={tag} color="blue" style={{ marginBottom: 2 }}>{tag}</Tag>)
        : <span style={{ color: '#ccc' }}>—</span>,
    },
    {
      title: '上传时间', dataIndex: 'createdAt', key: 'createdAt', width: 110,
      render: (d: string) => <span style={{ color: '#888', fontSize: 13 }}>{d ? new Date(d).toLocaleDateString('zh-CN') : '—'}</span>,
    },
    {
      title: '使用次数', dataIndex: 'usageCount', key: 'usageCount', width: 80,
      render: (n: number) => <span style={{ color: n > 0 ? '#52c41a' : '#aaa', fontWeight: n > 0 ? 500 : 400 }}>{n || 0}</span>,
    },
    {
      title: '操作', key: 'action', width: 180, fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space size={4}>
          {(record.fileType === 'video' || record.fileType === 'audio') && (
            <Tooltip title="转写">
              <Button
                size="small" type="text"
                icon={<SyncOutlined spin={transcribeMutation.isPending && transcribeMutation.variables === record.id} />}
                onClick={() => transcribeMutation.mutate(record.id)}
                style={{ color: '#1890ff' }}
              />
            </Tooltip>
          )}
          <Tooltip title="预览">
            <Button
              size="small" type="text"
              icon={record.fileType === 'image' ? <EyeOutlined /> : <PlayCircleOutlined />}
              onClick={() => setPreviewMat(record)}
              style={{ color: '#52c41a' }}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              size="small" type="text"
              icon={<EditOutlined />}
              onClick={() => { setEditMat(record); editForm.setFieldsValue({ name: record.name, scene: record.scene, note: record.note, tags: record.tags || [] }); }}
              style={{ color: '#faad14' }}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Popconfirm title="确认删除？" onConfirm={() => deleteMutation.mutate(record.id)} okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
              <Button size="small" type="text" icon={<DeleteOutlined />} style={{ color: '#ff4d4f' }} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card style={{ borderTop: '3px solid #1890ff' }}>
            <Statistic title="总素材数" value={statData?.total || 0} prefix={<FileImageOutlined />} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card style={{ borderTop: '3px solid #52c41a' }}>
            <Statistic title="图片素材" value={statData?.imageCount || 0} prefix={<FileImageOutlined />} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card style={{ borderTop: '3px solid #722ed1' }}>
            <Statistic title="视频素材" value={statData?.videoCount || 0} prefix={<VideoCameraOutlined />} valueStyle={{ color: '#722ed1' }} />
          </Card>
        </Col>
      </Row>

      <Card
        title={<span style={{ fontSize: 15, fontWeight: 600 }}>素材列表</span>}
        extra={
        <Space>
          <Button icon={<EditOutlined />} onClick={() => setCreateDrawerOpen(true)}>手动创建</Button>
          <Button type="primary" icon={<UploadOutlined />} onClick={() => setUploadModalOpen(true)}>上传素材</Button>
        </Space>
      }
      >
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
          <Input.Search
            placeholder="搜索名称、标签、场景、逐字稿..."
            allowClear
            value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
            onSearch={v => setSearchKeyword(v)}
            style={{ flex: 1, maxWidth: 400 }}
          />
          <Select
            value={typeFilter}
            onChange={setTypeFilter}
            style={{ width: 110 }}
            options={[
              { value: 'all', label: '全部类型' },
              { value: 'image', label: '🖼️ 图片' },
              { value: 'video', label: '🎬 视频' },
              { value: 'audio', label: '🎵 音频' },
            ]}
          />
          {(searchKeyword || typeFilter !== 'all') && (
            <span style={{ color: '#888', fontSize: 13, flexShrink: 0 }}>
              找到 <span style={{ color: '#1890ff', fontWeight: 500 }}>{filteredList.length}</span> 条
            </span>
          )}
        </div>
        <Table
          columns={columns}
          dataSource={filteredList}
          loading={isLoading}
          rowKey="id"
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条`, showSizeChanger: true }}
          size="middle"
        />
      </Card>

      {/* 批量上传弹窗 */}
      <Modal
        title="批量上传素材"
        open={uploadModalOpen}
        onCancel={() => { setUploadModalOpen(false); setPendingFiles([]); }}
        onOk={handleBatchUpload}
        okText={`开始上传${pendingFiles.length > 0 ? `（${pendingFiles.length} 个）` : ''}`}
        confirmLoading={batchUploading}
        okButtonProps={{ disabled: pendingFiles.length === 0 }}
        width={520}
      >
        <Upload.Dragger
          multiple
          beforeUpload={(_, fileList) => {
            setPendingFiles(prev => {
              const existingNames = new Set(prev.map(f => f.name));
              const newFiles = fileList.filter(f => !existingNames.has(f.name));
              return [...prev, ...newFiles];
            });
            return false;
          }}
          showUploadList={false}
          accept="image/*,video/*,audio/*"
          style={{ marginBottom: 12 }}
        >
          <p className="ant-upload-drag-icon">
            <UploadOutlined style={{ fontSize: 36, color: '#1890ff' }} />
          </p>
          <p className="ant-upload-text">点击或将文件拖到此处上传</p>
          <p className="ant-upload-hint">支持图片、视频、音频，可同时选择多个文件</p>
        </Upload.Dragger>
        {pendingFiles.length > 0 && (
          <List
            size="small"
            style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: 6 }}
            dataSource={pendingFiles}
            renderItem={(file, index) => (
              <List.Item
                style={{ padding: '6px 12px' }}
                actions={[
                  <Button
                    key="remove"
                    type="text"
                    size="small"
                    icon={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                    onClick={() => setPendingFiles(prev => prev.filter((_, i) => i !== index))}
                  />,
                ]}
              >
                <span style={{ fontSize: 12, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 340 }}>
                  {file.name}
                  <span style={{ color: '#aaa', marginLeft: 8 }}>{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                </span>
              </List.Item>
            )}
          />
        )}
      </Modal>

      {/* 编辑侧边栏 */}
      <Drawer
        title="编辑素材"
        placement="right"
        width={780}
        open={!!editMat}
        onClose={() => setEditMat(null)}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setEditMat(null)}>取消</Button>
              <Button type="primary" loading={updateMutation.isPending}
                onClick={() => editForm.validateFields().then(v => updateMutation.mutate({ id: editMat.id, data: v }))}>
                保存
              </Button>
            </Space>
          </div>
        }
      >
        {editMat && (
          <>
            {(editMat.ossUrl || editMat.thumbnail) && (
              <div style={{ background: '#000', borderRadius: 8, overflow: 'hidden', marginBottom: 16, textAlign: 'center' }}>
                {editMat.fileType === 'video' && (
                  <video src={editMat.ossUrl || editMat.thumbnail} controls style={{ maxHeight: 220, width: '100%', objectFit: 'contain', display: 'block' }} />
                )}
                {editMat.fileType === 'image' && (
                  <img src={editMat.ossUrl || editMat.thumbnail} alt={editMat.name} style={{ maxHeight: 220, maxWidth: '100%', objectFit: 'contain', display: 'block', margin: '0 auto' }} />
                )}
                {editMat.fileType === 'audio' && (
                  <div style={{ padding: '16px 20px', background: '#111' }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>🎵</div>
                    <audio src={editMat.ossUrl || editMat.thumbnail} controls style={{ width: '100%' }} />
                  </div>
                )}
              </div>
            )}
            <Form form={editForm} layout="vertical">
              <Form.Item name="name" label="名称" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="tags" label="标签">
                <TagSelector />
              </Form.Item>
              <Form.Item name="scene" label="场景描述">
                <Input.TextArea rows={2} />
              </Form.Item>
              <Form.Item name="note" label="逐字稿">
                <Input.TextArea rows={8} />
              </Form.Item>
            </Form>
          </>
        )}
      </Drawer>

      {/* 手动创建侧边栏 */}
      <Drawer
        title="手动创建素材"
        placement="right"
        width={780}
        open={createDrawerOpen}
        onClose={() => { setCreateDrawerOpen(false); setCreateAttachment(null); createForm.resetFields(); }}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => { setCreateDrawerOpen(false); setCreateAttachment(null); createForm.resetFields(); }}>取消</Button>
              <Button type="primary" loading={createMutation.isPending} onClick={() => createMutation.mutate()}>创建</Button>
            </Space>
          </div>
        }
      >
        <Form form={createForm} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="素材名称" />
          </Form.Item>
          <Form.Item name="fileType" label="文件类型" rules={[{ required: true, message: '请选择类型' }]} initialValue="text">
            <Select options={[
              { value: 'video', label: '🎬 视频' },
              { value: 'image', label: '🖼️ 图片' },
              { value: 'audio', label: '🎵 音频' },
              { value: 'text', label: '📄 文本' },
            ]} />
          </Form.Item>
          <Form.Item label="附件">
            <Upload
              maxCount={1}
              beforeUpload={(file) => { setCreateAttachment(file); return false; }}
              onRemove={() => setCreateAttachment(null)}
              fileList={createAttachment ? [{ uid: '-1', name: createAttachment.name, status: 'done' }] : []}
              accept="image/*,video/*,audio/*"
            >
              <Button icon={<UploadOutlined />}>选择文件</Button>
            </Upload>
          </Form.Item>
          <Form.Item name="tags" label="标签">
            <TagSelector />
          </Form.Item>
          <Form.Item name="scene" label="场景描述">
            <Input.TextArea rows={2} placeholder="一句话描述使用场景" />
          </Form.Item>
          <Form.Item name="note" label="逐字稿">
            <Input.TextArea rows={8} placeholder="视频文字内容" />
          </Form.Item>
        </Form>
      </Drawer>

      {/* 预览弹窗 */}
      <PreviewModal mat={previewMat} open={!!previewMat} onClose={() => setPreviewMat(null)} />
    </div>
  );
}
