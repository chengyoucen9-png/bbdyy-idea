import { useState, useRef, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Button, Form, Input, Select, Tag, message,
  Space, Card, Statistic, Row, Col, Drawer, Spin, Modal,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, RobotOutlined,
  VideoCameraOutlined, AudioOutlined, FileImageOutlined,
  ReloadOutlined, CheckCircleOutlined, DownOutlined, UpOutlined,
  PlayCircleOutlined, EyeOutlined, SearchOutlined,
  CopyOutlined, ThunderboltOutlined, FileTextOutlined, BulbOutlined,
  CheckOutlined, SaveOutlined,
} from '@ant-design/icons';
import { topicsAPI, materialsAPI } from '../api/client';

const { TextArea } = Input;

// ─── 预览弹窗 ──────────────────────────────────────────────────────────────────
function PreviewModal({ mat, open, onClose }: { mat: any; open: boolean; onClose: () => void }) {
  if (!mat) return null;
  const fileUrl = mat.ossUrl || mat.thumbnail;
  const isVideo = mat.fileType === 'video';
  const isAudio = mat.fileType === 'audio';
  return (
    <Modal
      title={<Space>{isVideo ? <VideoCameraOutlined style={{ color: '#1890ff' }} /> : isAudio ? <AudioOutlined style={{ color: '#52c41a' }} /> : <FileImageOutlined style={{ color: '#fa8c16' }} />}<span style={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>{mat.name}</span></Space>}
      open={open} onCancel={onClose} footer={null} width={720} centered destroyOnHidden
    >
      <div style={{ minHeight: 200 }}>
        {!fileUrl ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}><div style={{ fontSize: 32, marginBottom: 8 }}>📁</div><div>文件链接不可用</div></div>
        ) : isVideo ? (
          <video controls autoPlay style={{ width: '100%', borderRadius: 8, maxHeight: 420, background: '#000' }} src={fileUrl}>不支持视频播放</video>
        ) : isAudio ? (
          <div style={{ padding: '32px 20px', textAlign: 'center' }}><div style={{ fontSize: 64, marginBottom: 20 }}>🎵</div><audio controls autoPlay style={{ width: '100%' }} src={fileUrl} /></div>
        ) : (
          <img src={fileUrl} alt={mat.name} style={{ width: '100%', borderRadius: 8, maxHeight: 500, objectFit: 'contain' }} />
        )}
        <div style={{ marginTop: 16, padding: '12px 16px', background: '#f7f8fa', borderRadius: 8 }}>
          <Row gutter={16}>
            {mat.tags?.length > 0 && <Col span={24} style={{ marginBottom: 6 }}>{mat.tags.map((t: string) => <Tag key={t} color="blue">{t}</Tag>)}</Col>}
            {mat.duration && <Col span={8}><span style={{ fontSize: 13, color: '#888' }}>时长：</span><span style={{ fontSize: 13 }}>{mat.duration}</span></Col>}
            {mat.fileSize && <Col span={8}><span style={{ fontSize: 13, color: '#888' }}>大小：</span><span style={{ fontSize: 13 }}>{(mat.fileSize / 1024 / 1024).toFixed(1)} MB</span></Col>}
          </Row>
        </div>
      </div>
    </Modal>
  );
}

// ─── 素材卡片（紧凑 + 可勾选）──────────────────────────────────────────────────
function MaterialCard({ mat, selected, onToggle }: { mat: any; selected: boolean; onToggle: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const noteText = mat.note || mat.scene || '';
  const isLong = noteText.length > 80;

  const typeIcon = mat.fileType === 'video'
    ? <VideoCameraOutlined style={{ color: '#1890ff', fontSize: 14 }} />
    : mat.fileType === 'audio'
    ? <AudioOutlined style={{ color: '#52c41a', fontSize: 14 }} />
    : <FileImageOutlined style={{ color: '#fa8c16', fontSize: 14 }} />;

  return (
    <>
      <div
        onClick={() => onToggle(mat.id)}
        style={{
          background: selected ? '#f0f5ff' : '#fff',
          borderRadius: 8,
          padding: '10px 12px',
          marginBottom: 7,
          border: `1px solid ${selected ? '#91caff' : '#e8e8e8'}`,
          cursor: 'pointer',
          transition: 'all 0.15s',
          boxShadow: selected ? '0 0 0 2px rgba(24,144,255,0.08)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
          {/* Checkbox */}
          <div style={{
            width: 16, height: 16, borderRadius: 3, marginTop: 2, flexShrink: 0,
            border: `2px solid ${selected ? '#1890ff' : '#d9d9d9'}`,
            background: selected ? '#1890ff' : '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}>
            {selected && <CheckOutlined style={{ color: '#fff', fontSize: 9 }} />}
          </div>
          <div style={{ marginTop: 3, flexShrink: 0 }}>{typeIcon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
              <span style={{ fontWeight: 500, fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {mat.name}
              </span>
              <Button
                type="text" size="small"
                icon={mat.fileType === 'image' ? <EyeOutlined /> : <PlayCircleOutlined />}
                style={{ flexShrink: 0, padding: '0 3px', height: 18, fontSize: 11, color: '#bbb' }}
                onClick={e => { e.stopPropagation(); setPreviewOpen(true); }}
              />
            </div>
            {mat.tags?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 4 }}>
                {mat.tags.slice(0, 4).map((tag: string) => (
                  <Tag key={tag} color="blue" style={{ margin: 0, fontSize: 10, padding: '0 4px', lineHeight: '16px' }}>{tag}</Tag>
                ))}
              </div>
            )}
            {noteText && (
              <div>
                <div style={{
                  fontSize: 11, color: '#777', lineHeight: 1.6,
                  ...(isLong && !expanded
                    ? { overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }
                    : { whiteSpace: 'pre-wrap', wordBreak: 'break-all' }),
                }}>
                  {noteText}
                </div>
                {isLong && (
                  <div
                    style={{ fontSize: 11, color: '#1890ff', marginTop: 2, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 2 }}
                    onClick={e => { e.stopPropagation(); setExpanded(!expanded); }}
                  >
                    {expanded ? <><UpOutlined />收起</> : <><DownOutlined />展开（{noteText.length}字）</>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <PreviewModal mat={mat} open={previewOpen} onClose={() => setPreviewOpen(false)} />
    </>
  );
}

// ─── 区块标题栏 ────────────────────────────────────────────────────────────────
function SectionHeader({ label, icon, extra, sub }: { label: string; icon?: React.ReactNode; extra?: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div style={{ padding: '11px 18px 10px', background: '#fff', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          {icon}{label}
        </span>
        {extra}
      </div>
      {sub && <div style={{ marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

// ─── 主页面 ────────────────────────────────────────────────────────────────────
export default function TopicsPage() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<any>(null);
  const [form] = Form.useForm();

  // 素材推荐
  const [relatedMaterials, setRelatedMaterials] = useState<any[]>([]);
  const [searchingMaterials, setSearchingMaterials] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [matchedKeywords, setMatchedKeywords] = useState<string[]>([]);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<number>>(new Set());
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AI 创作
  const [aiScript, setAiScript] = useState('');
  const [aiTitles, setAiTitles] = useState<string[]>([]);
  const [aiOpenings, setAiOpenings] = useState<{ style: string; content: string }[]>([]);
  const [generatingScript, setGeneratingScript] = useState(false);
  const [generatingTitles, setGeneratingTitles] = useState(false);
  const [generatingOpening, setGeneratingOpening] = useState(false);
  const [aiPlatform, setAiPlatform] = useState('小红书');

  // 定稿保存
  const [savingDraft, setSavingDraft] = useState(false);

  const { data: topics, isLoading } = useQuery({ queryKey: ['topics'], queryFn: () => topicsAPI.getList() });
  const { data: stats } = useQuery({ queryKey: ['topics-stats'], queryFn: () => topicsAPI.getStats() });

  const createMutation = useMutation({
    mutationFn: (data: any) => topicsAPI.create(data),
    onSuccess: (newTopic: any) => {
      message.success('创建成功！');
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      queryClient.invalidateQueries({ queryKey: ['topics-stats'] });
      if (newTopic?.id) setEditingTopic(newTopic);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => topicsAPI.update(id, data),
    onSuccess: () => {
      message.success('保存成功！');
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      queryClient.invalidateQueries({ queryKey: ['topics-stats'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => topicsAPI.delete(id),
    onSuccess: () => {
      message.success('删除成功！');
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      queryClient.invalidateQueries({ queryKey: ['topics-stats'] });
    },
  });

  const searchByText = useCallback(async (text: string) => {
    const trimmed = (text || '').trim();
    if (trimmed.length < 2) {
      setRelatedMaterials([]);
      setHasSearched(false);
      setMatchedKeywords([]);
      return;
    }
    setSearchingMaterials(true);
    setHasSearched(false);
    try {
      const res = await materialsAPI.searchByKeywords(trimmed) as any;
      setRelatedMaterials(res.materials || []);
      setMatchedKeywords(res.keywords || []);
      setHasSearched(true);
    } catch {
      setHasSearched(true);
    } finally {
      setSearchingMaterials(false);
    }
  }, []);

  // 只按描述（想法）匹配素材
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => searchByText(val), 1200);
  };

  const triggerSearchNow = () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    searchByText(form.getFieldValue('description') || '');
  };

  const toggleMaterial = (id: number) => {
    setSelectedMaterialIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // AI：生成文稿（未保存时自动先保存）
  const handleGenerateScript = async () => {
    let topicId = editingTopic?.id;
    if (!topicId) {
      let values: any;
      try { values = await form.validateFields(); }
      catch { message.warning('请先填写选题标题'); return; }
      try {
        const newTopic = await topicsAPI.create(values) as any;
        topicId = newTopic.id;
        setEditingTopic(newTopic);
        queryClient.invalidateQueries({ queryKey: ['topics'] });
        queryClient.invalidateQueries({ queryKey: ['topics-stats'] });
      } catch (err: any) {
        message.error(err.response?.data?.message || '保存失败，请重试');
        return;
      }
    }
    setGeneratingScript(true);
    setAiScript('');
    try {
      const res = await topicsAPI.generateScript(topicId, Array.from(selectedMaterialIds)) as any;
      setAiScript(res.script || '');
      message.success('文稿生成成功！');
    } catch (err: any) {
      message.error(err.response?.data?.message || '生成失败，请检查 AI 配置');
    } finally {
      setGeneratingScript(false);
    }
  };

  // AI：生成标题
  const handleGenerateTitles = async () => {
    if (!editingTopic?.id) return;
    setGeneratingTitles(true);
    try {
      const res = await topicsAPI.generateTitles(editingTopic.id, aiPlatform) as any;
      setAiTitles(res.titles || []);
    } catch (err: any) {
      message.error(err.response?.data?.message || '生成失败');
    } finally { setGeneratingTitles(false); }
  };

  // AI：优化开场白
  const handleOptimizeOpening = async () => {
    if (!editingTopic?.id || !aiScript) return;
    setGeneratingOpening(true);
    try {
      const res = await topicsAPI.optimizeOpening(editingTopic.id) as any;
      setAiOpenings(res.openings || []);
    } catch (err: any) {
      message.error(err.response?.data?.message || '优化失败');
    } finally { setGeneratingOpening(false); }
  };

  // 保存定稿
  const handleSaveDraft = async () => {
    if (!editingTopic?.id) { message.warning('请先保存选题'); return; }
    const finalDraft = form.getFieldValue('finalDraft');
    setSavingDraft(true);
    try {
      await topicsAPI.update(editingTopic.id, { finalDraft });
      message.success('定稿已保存');
      queryClient.invalidateQueries({ queryKey: ['topics'] });
    } catch {
      message.error('保存失败');
    } finally { setSavingDraft(false); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => message.success('已复制')).catch(() => message.error('复制失败'));
  };

  const resetPanel = () => {
    setRelatedMaterials([]);
    setHasSearched(false);
    setMatchedKeywords([]);
    setSelectedMaterialIds(new Set());
    setAiScript('');
    setAiTitles([]);
    setAiOpenings([]);
  };

  const openCreate = () => {
    setEditingTopic(null);
    resetPanel();
    form.resetFields();
    setDrawerOpen(true);
  };

  // 从首页"一键二创"按钮跳转过来时，自动打开创建抽屉并预填逐字稿
  useEffect(() => {
    const prefill = (location.state as any)?.prefill;
    if (!prefill) return;
    setEditingTopic(null);
    resetPanel();
    form.resetFields();
    if (prefill.title) form.setFieldValue('title', prefill.title);
    if (prefill.description) {
      form.setFieldValue('description', prefill.description);
      searchByText(prefill.description);
    }
    setDrawerOpen(true);
  }, [location.state]);

  const openEdit = (topic: any) => {
    setEditingTopic(topic);
    resetPanel();
    setAiScript(topic.script || '');
    setAiTitles(topic.titles || []);
    form.setFieldsValue({
      title: topic.title, description: topic.description,
      finalDraft: topic.finalDraft, status: topic.status,
      priority: topic.priority, difficulty: topic.difficulty,
    });
    setDrawerOpen(true);
    searchByText(`${topic.title} ${topic.description || ''}`);
  };

  const handleClose = () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setDrawerOpen(false);
    setEditingTopic(null);
    resetPanel();
    form.resetFields();
  };

  const handleSave = () => {
    form.validateFields().then(values => {
      if (editingTopic) updateMutation.mutate({ id: editingTopic.id, data: values });
      else createMutation.mutate(values);
    });
  };

  const getStatusTag = (status: string) => {
    const map: any = { pending: { color: 'gold', label: '💡 想法' }, inProgress: { color: 'processing', label: '✍️ 创作中' }, completed: { color: 'success', label: '✅ 已完成' } };
    const s = map[status] || { color: 'default', label: status };
    return <Tag color={s.color}>{s.label}</Tag>;
  };

  const getPriorityTag = (p: string) => {
    const m: any = { low: ['green', '低'], medium: ['orange', '中'], high: ['red', '高'] };
    const [c, l] = m[p] || ['default', p];
    return <Tag color={c}>{l}</Tag>;
  };

  const topicList = Array.isArray(topics) ? topics : (topics as any)?.items || [];
  const statData = stats as any;
  const selCount = selectedMaterialIds.size;

  const columns = [
    {
      title: '选题', dataIndex: 'title', key: 'title',
      render: (title: string, record: any) => (
        <div>
          <div style={{ fontWeight: 500, marginBottom: 2 }}>{title}</div>
          {record.description && <div style={{ fontSize: 13, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>{record.description}</div>}
        </div>
      ),
    },
    { title: '状态', dataIndex: 'status', key: 'status', width: 110, render: (s: string) => getStatusTag(s) },
    { title: '优先级', dataIndex: 'priority', key: 'priority', width: 80, render: (p: string) => getPriorityTag(p) },
    { title: '难度', dataIndex: 'difficulty', key: 'difficulty', width: 80, render: (d: number) => '⭐'.repeat(d || 1) },
    {
      title: '操作', key: 'action', width: 230,
      render: (_: any, record: any) => (
        <Space size={4}>
          <Button size="small" type="primary" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
          {record.status !== 'completed' && (
            <Button size="small" icon={<CheckCircleOutlined />} style={{ background: '#52c41a', borderColor: '#52c41a', color: '#fff' }}
              onClick={() => Modal.confirm({ title: '确认标记为已完成？', onOk: () => updateMutation.mutate({ id: record.id, data: { status: 'completed' } }) })}>
              完成
            </Button>
          )}
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => Modal.confirm({ title: '确认删除？', onOk: () => deleteMutation.mutate(record.id) })}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {[
          { title: '总选题', value: statData?.total || 0, color: '#1890ff' },
          { title: '💡 想法', value: statData?.pending || 0, color: '#faad14' },
          { title: '✍️ 创作中', value: statData?.inProgress || 0, color: '#52c41a' },
          { title: '✅ 已完成', value: statData?.completed || 0, color: '#13c2c2' },
        ].map(item => (
          <Col span={6} key={item.title}>
            <Card style={{ borderTop: `3px solid ${item.color}` }}>
              <Statistic title={item.title} value={item.value} valueStyle={{ color: item.color }} />
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        title={<span style={{ fontSize: 15, fontWeight: 600 }}>选题列表</span>}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>记录想法</Button>}
      >
        <Table columns={columns} dataSource={topicList} loading={isLoading} rowKey="id"
          rowClassName={(r) => r.status === 'completed' ? 'completed-row' : ''}
          pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }} />
      </Card>

      {/* ════════════════ 抽屉 ════════════════ */}
      <Drawer
        title={
          <Space>
            {editingTopic ? <EditOutlined /> : <PlusOutlined />}
            <span>{editingTopic ? '编辑选题' : '记录想法'}</span>
            {editingTopic && getStatusTag(editingTopic.status)}
          </Space>
        }
        open={drawerOpen} onClose={handleClose} width="90vw"
        styles={{
          body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' },
          header: { borderBottom: '1px solid #f0f0f0', padding: '12px 20px' },
        }}
        extra={
          <Space>
            <Button onClick={handleClose}>取消</Button>
            <Button type="primary" loading={createMutation.isPending || updateMutation.isPending} onClick={handleSave}>
              {editingTopic ? '保存修改' : '创建选题'}
            </Button>
          </Space>
        }
      >
        {/* Form 跨列使用 component={false} */}
        <Form form={form} layout="vertical" component={false}>
          <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden' }}>

            {/* ══════════ 左列 ══════════ */}
            <div style={{ width: 380, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid #eee', overflow: 'hidden' }}>

              {/* 左上：填写想法 */}
              <div style={{ flex: '0 0 52%', minHeight: 0, overflowY: 'auto', padding: '18px 18px 12px', background: '#fff' }}>
                <div style={{ fontSize: 12, color: '#aaa', marginBottom: 12, fontWeight: 500, letterSpacing: 0.5 }}>① 填写想法</div>

                <Form.Item name="title" label={<span style={{ fontWeight: 600, fontSize: 13 }}>选题标题</span>} rules={[{ required: true, message: '请输入标题' }]} style={{ marginBottom: 14 }}>
                  <Input placeholder="一句话描述你的想法" />
                </Form.Item>

                <Form.Item
                  name="description"
                  label={<span style={{ fontWeight: 600, fontSize: 13 }}>想法描述</span>}
                  style={{ marginBottom: 14 }}
                >
                  <TextArea rows={6} placeholder={`描述内容方向、目标人群、核心观点...\n停止输入后自动匹配左下方素材`} onChange={handleDescriptionChange} />
                </Form.Item>

                <Row gutter={10}>
                  <Col span={8}>
                    <Form.Item name="status" label={<span style={{ fontSize: 13 }}>状态</span>} initialValue="pending" style={{ marginBottom: 0 }}>
                      <Select>
                        <Select.Option value="pending">💡 想法</Select.Option>
                        <Select.Option value="inProgress">✍️ 创作中</Select.Option>
                        <Select.Option value="completed">✅ 已完成</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="priority" label={<span style={{ fontSize: 13 }}>优先级</span>} initialValue="medium" style={{ marginBottom: 0 }}>
                      <Select>
                        <Select.Option value="low">🟢 低</Select.Option>
                        <Select.Option value="medium">🟡 中</Select.Option>
                        <Select.Option value="high">🔴 高</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="difficulty" label={<span style={{ fontSize: 13 }}>难度</span>} initialValue={2} style={{ marginBottom: 0 }}>
                      <Select>
                        <Select.Option value={1}>⭐ 简单</Select.Option>
                        <Select.Option value={2}>⭐⭐ 中等</Select.Option>
                        <Select.Option value={3}>⭐⭐⭐ 复杂</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
              </div>

              {/* 左下：推荐素材 */}
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderTop: '2px solid #f0f0f0' }}>
                <SectionHeader
                  label="② 推荐素材"
                  icon={<SearchOutlined style={{ color: '#1890ff' }} />}
                  extra={
                    <Space size={6}>
                      {selCount > 0 && (
                        <Button type="text" size="small" style={{ fontSize: 11, color: '#aaa', padding: '0 4px' }} onClick={() => setSelectedMaterialIds(new Set())}>清空</Button>
                      )}
                      <Button size="small" icon={<ReloadOutlined />} loading={searchingMaterials} onClick={triggerSearchNow}>刷新</Button>
                    </Space>
                  }
                  sub={hasSearched ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {selCount > 0 && <Tag color="blue" style={{ margin: 0 }}>已选 {selCount} 个</Tag>}
                      {relatedMaterials.length > 0
                        ? <Tag style={{ margin: 0, fontSize: 11 }}>共 {relatedMaterials.length} 个匹配</Tag>
                        : <Tag style={{ margin: 0, fontSize: 11 }}>未找到匹配</Tag>}
                      {matchedKeywords.slice(0, 3).map(kw => <Tag key={kw} style={{ margin: 0, fontSize: 10, color: '#999' }}>{kw}</Tag>)}
                    </div>
                  ) : undefined}
                />
                <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
                  {searchingMaterials ? (
                    <div style={{ textAlign: 'center', paddingTop: '8vh' }}><Spin /><div style={{ marginTop: 10, color: '#aaa', fontSize: 12 }}>匹配中...</div></div>
                  ) : !hasSearched ? (
                    <div style={{ textAlign: 'center', paddingTop: '8vh' }}>
                      <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
                      <div style={{ fontSize: 12, color: '#bbb', lineHeight: 2 }}>在上方输入描述<br />自动匹配相关素材</div>
                    </div>
                  ) : relatedMaterials.length === 0 ? (
                    <div style={{ textAlign: 'center', paddingTop: '8vh' }}>
                      <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
                      <div style={{ fontSize: 12, color: '#bbb', lineHeight: 2, marginBottom: 12 }}>未找到相关素材</div>
                      <Button size="small" icon={<ReloadOutlined />} onClick={triggerSearchNow}>重新匹配</Button>
                    </div>
                  ) : (
                    relatedMaterials.map((mat: any) => (
                      <MaterialCard key={mat.id} mat={mat} selected={selectedMaterialIds.has(mat.id)} onToggle={toggleMaterial} />
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* ══════════ 右列 ══════════ */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

              {/* 右上：AI 创作 */}
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f7f8fa' }}>
                <SectionHeader
                  label="③ AI 创作"
                  icon={<RobotOutlined style={{ color: '#722ed1' }} />}
                  extra={
                    <Space size={8}>
                      {selCount > 0 && <Tag color="purple" style={{ margin: 0 }}>基于 {selCount} 个素材</Tag>}
                      <Button
                        type="primary" icon={<ThunderboltOutlined />}
                        loading={generatingScript}
                        onClick={handleGenerateScript}
                      >
                        {generatingScript ? '生成中...' : selCount > 0 ? '基于选中素材生成' : '直接生成文稿'}
                      </Button>
                    </Space>
                  }
                />

                <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
                  {generatingScript ? (
                    <div style={{ textAlign: 'center', paddingTop: '14vh' }}>
                      <Spin size="large" />
                      <div style={{ marginTop: 18, color: '#888', fontSize: 13, lineHeight: 2 }}>
                        AI 正在结合你的想法{selCount > 0 ? `和 ${selCount} 个素材的逐字稿` : ''}生成文稿<br />
                        通常需要 10–30 秒...
                      </div>
                    </div>
                  ) : !aiScript ? (
                    <div style={{ textAlign: 'center', paddingTop: '14vh' }}>
                      <div style={{ fontSize: 40, marginBottom: 14 }}>🤖</div>
                      <div style={{ fontSize: 13, color: '#888', marginBottom: 6 }}>
                        {selCount > 0 ? `已选 ${selCount} 个素材，点击右上角按钮生成` : '点击右上角按钮生成文稿'}
                      </div>
                      <div style={{ fontSize: 12, color: '#bbb', lineHeight: 2 }}>
                        AI 将结合选题想法{selCount > 0 ? '和所选素材逐字稿' : ''}<br />创作适合发布的视频文稿
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* 生成的文稿 */}
                      <div style={{ background: '#fff', borderRadius: 10, padding: '16px 18px', marginBottom: 12, border: '1px solid #e8e8e8' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>
                            <FileTextOutlined style={{ color: '#1890ff', marginRight: 7 }} />生成的文稿
                          </span>
                          <Space size={6}>
                            <Button size="small" icon={<CopyOutlined />} onClick={() => copyToClipboard(aiScript)}>复制</Button>
                            <Button size="small" type="primary" ghost
                              onClick={() => { form.setFieldValue('finalDraft', aiScript); message.success('已填入右下角定稿区'); }}>
                              填入定稿
                            </Button>
                            <Button size="small" type="text" icon={<ReloadOutlined />} style={{ color: '#bbb' }} onClick={handleGenerateScript}>重新生成</Button>
                          </Space>
                        </div>
                        <TextArea value={aiScript} onChange={e => setAiScript(e.target.value)} autoSize={{ minRows: 6, maxRows: 12 }} style={{ fontSize: 13, lineHeight: 1.9, border: '1px solid #f0f0f0', background: '#fafafa', borderRadius: 6 }} />
                      </div>

                      {/* 爆款标题 */}
                      <div style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', marginBottom: 12, border: '1px solid #e8e8e8' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: aiTitles.length ? 10 : 0 }}>
                          <span style={{ fontWeight: 600, fontSize: 13 }}><BulbOutlined style={{ color: '#fa8c16', marginRight: 7 }} />爆款标题</span>
                          <Space size={7}>
                            <Select size="small" value={aiPlatform} onChange={setAiPlatform} style={{ width: 80 }}
                              options={[{ value: '小红书' }, { value: '抖音' }, { value: '视频号' }, { value: 'B站' }]} />
                            <Button size="small" type="primary" ghost icon={<ThunderboltOutlined />} loading={generatingTitles} onClick={handleGenerateTitles}>
                              {aiTitles.length ? '重新生成' : '生成标题'}
                            </Button>
                          </Space>
                        </div>
                        {aiTitles.length > 0 ? (
                          aiTitles.map((title, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px', background: '#f7f8fa', borderRadius: 7, marginBottom: 6, border: '1px solid #f0f0f0' }}>
                              <span style={{ color: '#ccc', fontSize: 11, width: 14, flexShrink: 0 }}>{i + 1}.</span>
                              <span style={{ flex: 1, fontSize: 13, lineHeight: 1.6 }}>{title}</span>
                              <Button type="text" size="small" icon={<CopyOutlined />} style={{ color: '#bbb', flexShrink: 0 }} onClick={() => copyToClipboard(title)} />
                            </div>
                          ))
                        ) : (
                          <div style={{ fontSize: 12, color: '#ccc', marginTop: 8 }}>选择平台，生成 5 个爆款标题</div>
                        )}
                      </div>

                      {/* 开场白优化 */}
                      <div style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', border: '1px solid #e8e8e8' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: aiOpenings.length ? 10 : 0 }}>
                          <span style={{ fontWeight: 600, fontSize: 13 }}><ThunderboltOutlined style={{ color: '#722ed1', marginRight: 7 }} />开场白优化</span>
                          <Button size="small" type="primary" ghost icon={<ThunderboltOutlined />} loading={generatingOpening} onClick={handleOptimizeOpening}>
                            {aiOpenings.length ? '重新优化' : '优化开场'}
                          </Button>
                        </div>
                        {aiOpenings.length > 0 ? (
                          aiOpenings.map((o, i) => (
                            <div key={i} style={{ padding: '10px 12px', background: '#f7f8fa', borderRadius: 8, marginBottom: 8, border: '1px solid #f0f0f0' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <Tag color="purple" style={{ margin: 0 }}>{o.style}</Tag>
                                <Button type="text" size="small" icon={<CopyOutlined />} style={{ color: '#bbb' }} onClick={() => copyToClipboard(o.content)} />
                              </div>
                              <div style={{ fontSize: 13, color: '#333', lineHeight: 1.8 }}>{o.content}</div>
                            </div>
                          ))
                        ) : (
                          <div style={{ fontSize: 12, color: '#ccc', marginTop: 8 }}>基于文稿，生成 3 种风格的开场白方案</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 右下：最终定稿 */}
              <div style={{ flex: '0 0 260px', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff', borderTop: '2px solid #e8e8e8' }}>
                <SectionHeader
                  label="④ 最终定稿"
                  icon={<SaveOutlined style={{ color: '#52c41a' }} />}
                  extra={
                    <Button
                      size="small" type="primary"
                      icon={<SaveOutlined />}
                      loading={savingDraft}
                      onClick={handleSaveDraft}
                    >
                      保存定稿
                    </Button>
                  }
                  sub={<span style={{ fontSize: 11, color: '#bbb' }}>在此记录最终版本，或点击上方「填入定稿」自动填充</span>}
                />
                <div style={{ flex: 1, padding: '10px 18px 12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <Form.Item name="finalDraft" className="draft-full-height" style={{ flex: 1, marginBottom: 0 }}>
                    <TextArea
                      placeholder="在这里记录最终定稿的文案或脚本..."
                      style={{ resize: 'none', fontFamily: 'inherit', fontSize: 13, lineHeight: 1.9, border: '1px solid #f0f0f0', borderRadius: 8, height: '100%' }}
                    />
                  </Form.Item>
                </div>
              </div>

            </div>
          </div>
        </Form>
      </Drawer>

      <style>{`
        .completed-row td { background: #f6ffed !important; }
        .completed-row:hover td { background: #edfde4 !important; }
        .draft-full-height { height: 100%; display: flex !important; flex-direction: column; }
        .draft-full-height .ant-form-item-row { flex: 1; height: 100%; }
        .draft-full-height .ant-form-item-control { flex: 1; }
        .draft-full-height .ant-form-item-control-input { flex: 1; height: 100% !important; min-height: 0 !important; align-items: stretch; }
        .draft-full-height .ant-form-item-control-input-content { height: 100%; display: flex; flex-direction: column; }
        .draft-full-height textarea { flex: 1 !important; height: 100% !important; min-height: 0 !important; }
      `}</style>
    </div>
  );
}
