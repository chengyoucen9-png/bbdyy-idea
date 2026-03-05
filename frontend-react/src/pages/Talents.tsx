import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Button, Modal, Form, Input, Select, Tag, message,
  Space, Card, Statistic, Row, Col, Tooltip, Popconfirm,
} from 'antd';
import {
  EditOutlined, DeleteOutlined, EyeOutlined,
  VideoCameraOutlined, PictureOutlined, FileTextOutlined,
  SyncOutlined, PlayCircleOutlined,
} from '@ant-design/icons';
import { talentAPI, materialsAPI } from '../api/client';

// 数字格式化
const fmtNum = (n: number) => {
  if (!n) return '—';
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
};

// 素材类型图标
const getMaterialTypeIcon = (type: string) => {
  if (type === 'video') return <VideoCameraOutlined style={{ color: '#1890ff' }} />;
  if (type === 'image') return <PictureOutlined style={{ color: '#52c41a' }} />;
  if (type === 'text') return <FileTextOutlined style={{ color: '#fa8c16' }} />;
  return null;
};

// 预览弹窗
function PreviewModal({ mat, open, onClose }: { mat: any; open: boolean; onClose: () => void }) {
  if (!mat) return null;
  const fileUrl = mat.ossUrl || mat.thumbnail;
  return (
    <Modal title={mat.title || mat.name} open={open} onCancel={onClose} footer={null} width={700} centered destroyOnClose>
      <div>
        {fileUrl && (mat.type === 'video' || mat.fileType === 'video') && (
          <video controls autoPlay style={{ width: '100%', borderRadius: 8, maxHeight: 400, background: '#000' }} src={fileUrl} />
        )}
        {fileUrl && (mat.type === 'audio' || mat.fileType === 'audio') && (
          <div style={{ padding: '20px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎵</div>
            <audio controls style={{ width: '100%' }} src={fileUrl} />
          </div>
        )}
        {fileUrl && (mat.type === 'image' || mat.fileType === 'image') && (
          <img src={fileUrl} alt={mat.title || mat.name} style={{ width: '100%', borderRadius: 8, objectFit: 'contain', maxHeight: 400 }} />
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

// 素材管理组件
function TalentMaterials() {
  const queryClient = useQueryClient();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [talentFilter, setTalentFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [previewMat, setPreviewMat] = useState<any>(null);
  const [editMat, setEditMat] = useState<any>(null);
  const [editForm] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const { data: materials, isLoading: materialsLoading } = useQuery({
    queryKey: ['talent-materials', talentFilter, typeFilter, searchKeyword],
    queryFn: () => talentAPI.getMaterials({
      talentId: talentFilter === 'all' ? undefined : Number(talentFilter),
      type: typeFilter === 'all' ? undefined : typeFilter,
      keywords: searchKeyword,
    }),
  });

  const { data: stats } = useQuery({
    queryKey: ['talent-stats'],
    queryFn: () => talentAPI.getStats(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => talentAPI.deleteMaterial(id),
    onSuccess: () => {
      message.success('素材删除成功！');
      queryClient.invalidateQueries({ queryKey: ['talent-materials'] });
      queryClient.invalidateQueries({ queryKey: ['talent-stats'] });
    },
  });

  const transcribeMutation = useMutation({
    mutationFn: (id: number) => talentAPI.transcribeMaterial(id),
    onSuccess: () => {
      message.success('转写成功！');
      queryClient.invalidateQueries({ queryKey: ['talent-materials'] });
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
      queryClient.invalidateQueries({ queryKey: ['talent-materials'] });
      setEditMat(null);
    },
  });

  const batchDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => Promise.all(ids.map(id => talentAPI.deleteMaterial(id))),
    onSuccess: () => {
      message.success('批量删除成功！');
      queryClient.invalidateQueries({ queryKey: ['talent-materials'] });
      queryClient.invalidateQueries({ queryKey: ['talent-stats'] });
      setSelectedRowKeys([]);
    },
    onError: () => {
      message.error('批量删除失败！');
    },
  });

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) return;
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个素材吗？`,
      onOk: () => batchDeleteMutation.mutate(selectedRowKeys.map(key => Number(key))),
      okText: '删除',
      cancelText: '取消',
      okType: 'danger',
    });
  };

  const matList = (materials as any)?.materials || [];

  const filteredList = matList.filter((item: any) => {
    const matchType = typeFilter === 'all' || item.type === typeFilter;
    if (!searchKeyword) return matchType;
    const kw = searchKeyword.toLowerCase();
    return matchType && (
      (item.title || '').toLowerCase().includes(kw) ||
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
      title: '类型', key: 'type', width: 60,
      render: (record: any) => getMaterialTypeIcon(record.type),
    },
    {
      title: '达人名称', key: 'talentName', width: 120,
      render: (record: any) => (
        <span style={{ fontWeight: 500 }}>{record.authorName || record.talentName || '未知'}</span>
      ),
    },
    {
      title: '名称', key: 'title', width: 180,
      render: (record: any) => (
        <span style={{ fontWeight: 500 }}>{record.title}</span>
      ),
    },
    {
      title: '逐字稿', key: 'note',
      render: (record: any) => record.note
        ? <span style={{ color: '#555', fontSize: 13 }}>{record.note.length > 40 ? record.note.slice(0, 40) + '...' : record.note}</span>
        : <span style={{ color: '#ccc', fontSize: 13 }}>暂无</span>,
    },
    {
      title: '标签', key: 'tags', width: 220,
      render: (record: any) => Array.isArray(record.tags) && record.tags.length
        ? record.tags.slice(0, 4).map((tag: string) => <Tag key={tag} color="blue" style={{ marginBottom: 2 }}>{tag}</Tag>)
        : <span style={{ color: '#ccc' }}>—</span>,
    },
    {
      title: '点赞', key: 'likeCount', width: 70,
      render: (record: any) => <span style={{ color: '#ff4d4f', fontSize: 13 }}>❤ {fmtNum(record.likeCount)}</span>,
    },
    {
      title: '评论', key: 'commentCount', width: 70,
      render: (record: any) => <span style={{ color: '#1890ff', fontSize: 13 }}>💬 {fmtNum(record.commentCount)}</span>,
    },
    {
      title: '转发', key: 'shareCount', width: 70,
      render: (record: any) => <span style={{ color: '#52c41a', fontSize: 13 }}>↗ {fmtNum(record.shareCount)}</span>,
    },
    {
      title: '收藏', key: 'collectCount', width: 70,
      render: (record: any) => <span style={{ color: '#faad14', fontSize: 13 }}>★ {fmtNum(record.collectCount)}</span>,
    },
    {
      title: '爬取时间', key: 'crawlTime', width: 110,
      render: (record: any) => <span style={{ color: '#888', fontSize: 13 }}>{record.crawlTime ? new Date(record.crawlTime).toLocaleDateString('zh-CN') : '—'}</span>,
    },
    {
      title: '使用次数', key: 'usageCount', width: 80,
      render: (record: any) => <span style={{ color: (record.usageCount || 0) > 0 ? '#52c41a' : '#aaa', fontWeight: (record.usageCount || 0) > 0 ? 500 : 400 }}>{record.usageCount || 0}</span>,
    },
    {
      title: '操作', key: 'action', width: 180, fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space size={4}>
          {(record.type === 'video' || record.type === 'audio') && (
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
              icon={record.type === 'image' ? <EyeOutlined /> : <PlayCircleOutlined />}
              onClick={() => setPreviewMat(record)}
              style={{ color: '#52c41a' }}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              size="small" type="text"
              icon={<EditOutlined />}
              onClick={() => { setEditMat(record); editForm.setFieldsValue({ name: record.title || record.name, scene: record.scene, note: record.note, tags: record.tags || [] }); }}
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
            <Statistic title="总素材数" value={(stats as any)?.totalMaterials || 0} prefix={<VideoCameraOutlined />} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card style={{ borderTop: '3px solid #52c41a' }}>
            <Statistic title="图片素材" value={(stats as any)?.imageMaterials || 0} prefix={<PictureOutlined />} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card style={{ borderTop: '3px solid #722ed1' }}>
            <Statistic title="视频素材" value={(stats as any)?.videoMaterials || 0} prefix={<VideoCameraOutlined />} valueStyle={{ color: '#722ed1' }} />
          </Card>
        </Col>
      </Row>

      <Card
        title={<span style={{ fontSize: 15, fontWeight: 600 }}>达人素材列表</span>}
      >
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <Input.Search
            placeholder="搜索名称、标签、场景、逐字稿..."
            allowClear
            value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
            onSearch={v => setSearchKeyword(v)}
            style={{ flex: 1, maxWidth: 400 }}
          />
          <Select
            value={talentFilter}
            onChange={setTalentFilter}
            style={{ width: 120 }}
            options={[
              { value: 'all', label: '全部达人' },
            ]}
          />
          <Select
            value={typeFilter}
            onChange={setTypeFilter}
            style={{ width: 110 }}
            options={[
              { value: 'all', label: '全部类型' },
              { value: 'image', label: '🖼️ 图片' },
              { value: 'video', label: '🎬 视频' },
              { value: 'text', label: '📝 文本' },
            ]}
          />
          {selectedRowKeys.length > 0 && (
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={handleBatchDelete}
              loading={batchDeleteMutation.isPending}
            >
              批量删除 ({selectedRowKeys.length})
            </Button>
          )}
          {(searchKeyword || typeFilter !== 'all' || talentFilter !== 'all') && (
            <span style={{ color: '#888', fontSize: 13, flexShrink: 0 }}>
              找到 <span style={{ color: '#1890ff', fontWeight: 500 }}>{filteredList.length}</span> 条
            </span>
          )}
        </div>
        <Table
          columns={columns}
          dataSource={filteredList}
          loading={materialsLoading}
          rowKey="id"
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条`, showSizeChanger: true }}
          size="middle"
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            selections: [
              Table.SELECTION_ALL,
              Table.SELECTION_INVERT,
            ],
          }}
        />
      </Card>

      {/* 预览弹窗 */}
      <PreviewModal mat={previewMat} open={!!previewMat} onClose={() => setPreviewMat(null)} />

      {/* 编辑素材弹窗 */}
      <Modal title="编辑素材" open={!!editMat} onCancel={() => setEditMat(null)}
        onOk={() => editForm.validateFields().then(values => updateMutation.mutate({ id: editMat.id, data: values }))}
        okText="保存" confirmLoading={updateMutation.isPending} width={640}
      >
        {editMat && (
          <>
            {/* 媒体预览 */}
            {(editMat.ossUrl || editMat.thumbnail) && (
              <div style={{ background: '#000', borderRadius: 8, overflow: 'hidden', marginBottom: 16, textAlign: 'center' }}>
                {(editMat.type === 'video' || editMat.fileType === 'video') && (
                  <video src={editMat.ossUrl || editMat.thumbnail} controls style={{ maxHeight: 220, width: '100%', objectFit: 'contain', display: 'block' }} />
                )}
                {(editMat.type === 'image' || editMat.fileType === 'image') && (
                  <img src={editMat.ossUrl || editMat.thumbnail} alt={editMat.title || editMat.name} style={{ maxHeight: 220, maxWidth: '100%', objectFit: 'contain', display: 'block', margin: '0 auto' }} />
                )}
                {(editMat.type === 'audio' || editMat.fileType === 'audio') && (
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
    </div>
  );
}

export default function TalentsPage() {
  return (
    <div>
      <TalentMaterials />
    </div>
  );
}
