import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Button, Upload, Modal, Form, Input, Select, Tag, message,
  Space, Card, Statistic, Row, Col, Tooltip, Popconfirm, List,
} from 'antd';
import {
  UploadOutlined, FileImageOutlined, VideoCameraOutlined,
  AudioOutlined, DeleteOutlined, EyeOutlined, EditOutlined,
  SyncOutlined, PlayCircleOutlined, CloseCircleOutlined,
} from '@ant-design/icons';
import { materialsAPI } from '../api/client';
import { useUploadContext } from '../context/UploadContext';

// 预览弹窗
function PreviewModal({ mat, open, onClose }: { mat: any; open: boolean; onClose: () => void }) {
  if (!mat) return null;
  const fileUrl = mat.ossUrl || mat.thumbnail;
  return (
    <Modal title={mat.name} open={open} onCancel={onClose} footer={null} width={700} centered destroyOnClose>
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
  const [previewMat, setPreviewMat] = useState<any>(null);
  const [editMat, setEditMat] = useState<any>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [batchUploading, setBatchUploading] = useState(false);
  const [editForm] = Form.useForm();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: materials, isLoading } = useQuery({
    queryKey: ['materials'],
    queryFn: () => materialsAPI.getList({ limit: 100, page: 1 }),
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
    queryKey: ['materials-stats'],
    queryFn: () => materialsAPI.getStats(),
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
        await materialsAPI.upload(pendingFiles[i], { name: pendingFiles[i].name });
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
    onError: () => message.error('转写失败'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => materialsAPI.update(id, data),
    onSuccess: () => {
      message.success('保存成功！');
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      setEditMat(null);
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
      render: (tags: string[]) => tags?.length
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
        extra={<Button type="primary" icon={<UploadOutlined />} onClick={() => setUploadModalOpen(true)}>上传素材</Button>}
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
          scroll={{ x: 900 }}
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

      {/* 编辑弹窗 */}
      <Modal title="编辑素材" open={!!editMat} onCancel={() => setEditMat(null)}
        onOk={() => editForm.validateFields().then(v => updateMutation.mutate({ id: editMat.id, data: v }))}
        okText="保存" confirmLoading={updateMutation.isPending} width={640}>
        {editMat && (
          <>
            {/* 媒体预览 */}
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
                <Select mode="tags" style={{ width: '100%' }} placeholder="输入标签后按 Enter 添加" tokenSeparators={[',']} />
              </Form.Item>
              <Form.Item name="scene" label="场景描述">
                <Input.TextArea rows={2} />
              </Form.Item>
              <Form.Item name="note" label="逐字稿">
                <Input.TextArea rows={5} />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>

      {/* 预览弹窗 */}
      <PreviewModal mat={previewMat} open={!!previewMat} onClose={() => setPreviewMat(null)} />
    </div>
  );
}
