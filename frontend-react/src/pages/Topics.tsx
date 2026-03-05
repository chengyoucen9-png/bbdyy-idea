import { useState, useRef, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Button, Form, Input, Select, Tag, message,
  Space, Card, Statistic, Row, Col, Drawer, Spin, Modal, Steps, Progress,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  VideoCameraOutlined, AudioOutlined, FileImageOutlined,
  ReloadOutlined, CheckCircleOutlined, DownOutlined, UpOutlined,
  PlayCircleOutlined, EyeOutlined,
  ThunderboltOutlined, FileTextOutlined, BulbOutlined,
  CheckOutlined, SaveOutlined, ArrowLeftOutlined,
} from '@ant-design/icons';
import { topicsAPI, materialsAPI } from '../api/client';

const { TextArea } = Input;

const PROMPT_STORAGE_KEY = 'xingshu_ai_prompts';

interface StoredPrompt {
  id: string;
  name: string;
  category: string;
  content: string;
}

const PROMPT_CATEGORY_COLOR: Record<string, string> = {
  '文稿生成': 'blue',
  '标题生成': 'orange',
  '开场白优化': 'purple',
  '通用': 'green',
  '其他': 'default',
};

const WIZARD_STEPS = [
  { title: '填写想法' },
  { title: '选择素材' },
  { title: 'AI 创作' },
  { title: '最终定稿' },
];

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

// ─── 素材卡片 ──────────────────────────────────────────────────────────────────
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

// ─── 主页面 ────────────────────────────────────────────────────────────────────
export default function TopicsPage() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<any>(null);
  const [form] = Form.useForm();

  // 步骤
  const [currentStep, setCurrentStep] = useState(0);

  // 提示词
  const [availablePrompts, setAvailablePrompts] = useState<StoredPrompt[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);

  const loadAvailablePrompts = () => {
    try {
      const stored = localStorage.getItem(PROMPT_STORAGE_KEY);
      if (stored) setAvailablePrompts(JSON.parse(stored));
    } catch {
      setAvailablePrompts([]);
    }
  };

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
  const [selectedTitleIndex, setSelectedTitleIndex] = useState<number | null>(null);
  const [selectedOpeningIndex, setSelectedOpeningIndex] = useState<number | null>(null);

  // 定稿保存
  const [savingDraft, setSavingDraft] = useState(false);

  const { data: topics, isLoading } = useQuery({ queryKey: ['topics'], queryFn: () => topicsAPI.getList() });
  const { data: stats } = useQuery({ queryKey: ['topics-stats'], queryFn: () => topicsAPI.getStats() });

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

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => searchByText(val), 1200);
  };

  const triggerSearchNow = () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    const title = form.getFieldValue('title') || '';
    const desc = form.getFieldValue('description') || '';
    searchByText(`${title} ${desc}`.trim());
  };

  const toggleMaterial = (id: number) => {
    setSelectedMaterialIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // 一键全量生成：文稿 → 标题 + 开场白
  const autoGenerateAll = async () => {
    const formValues = form.getFieldsValue(['title', 'description', 'status', 'priority', 'difficulty']);

    let topicId = editingTopic?.id;
    if (!topicId) {
      if (!formValues.title) { message.warning('请先填写选题标题'); return; }
      try {
        const newTopic = await topicsAPI.create(formValues) as any;
        topicId = newTopic.id;
        setEditingTopic(newTopic);
        queryClient.invalidateQueries({ queryKey: ['topics'] });
        queryClient.invalidateQueries({ queryKey: ['topics-stats'] });
      } catch (err: any) {
        message.error(err.response?.data?.message || '保存失败');
        return;
      }
    }

    const selectedPrompt = availablePrompts.find(p => p.id === selectedPromptId);

    // 1. 生成文稿
    setGeneratingScript(true);
    setAiScript('');
    try {
      const res = await topicsAPI.generateScript(topicId, Array.from(selectedMaterialIds), selectedPrompt?.content) as any;
      setAiScript(res.script || '');
    } catch (err: any) {
      message.error(err.response?.data?.message || '生成文稿失败，请检查 AI 配置');
      return;
    } finally {
      setGeneratingScript(false);
    }

    // 2. 并行生成标题 + 开场白
    setGeneratingTitles(true);
    setGeneratingOpening(true);
    const [titlesResult, openingResult] = await Promise.allSettled([
      topicsAPI.generateTitles(topicId, aiPlatform) as Promise<any>,
      topicsAPI.optimizeOpening(topicId) as Promise<any>,
    ]);
    if (titlesResult.status === 'fulfilled') setAiTitles(titlesResult.value.titles || []);
    setGeneratingTitles(false);
    if (openingResult.status === 'fulfilled') setAiOpenings(openingResult.value.openings || []);
    setGeneratingOpening(false);
  };

  // 步骤导航
  const handleNext = async () => {
    if (currentStep === 0) {
      try {
        await form.validateFields(['title']);
      } catch {
        return;
      }
      if (availablePrompts.length > 0 && !selectedPromptId) {
        message.warning('请选择一个提示词模板');
        return;
      }
      // 进入素材步骤时触发搜索
      const title = form.getFieldValue('title') || '';
      const desc = form.getFieldValue('description') || '';
      searchByText(`${title} ${desc}`.trim());
    }
    if (currentStep === 1) {
      setCurrentStep(2);
      autoGenerateAll();
      return;
    }
    if (currentStep === 2) {
      // 自动将选中的开场白 + 文稿填入定稿
      const opening = selectedOpeningIndex !== null ? aiOpenings[selectedOpeningIndex] : null;
      const draft = opening ? `${opening.content}\n\n${aiScript}` : aiScript;
      if (draft) form.setFieldValue('finalDraft', draft);
    }
    setCurrentStep(s => Math.min(s + 1, 3));
  };

  const handleBack = () => setCurrentStep(s => Math.max(s - 1, 0));

  // AI：生成文稿
  const handleGenerateScript = async () => {
    let topicId = editingTopic?.id;
    if (!topicId) {
      // 同步读取表单值，避免 await 后字段卸载导致值丢失
      const values = form.getFieldsValue(['title', 'description', 'status', 'priority', 'difficulty']);
      if (!values.title) { message.warning('请先填写选题标题'); return; }
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
    const selectedPrompt = availablePrompts.find(p => p.id === selectedPromptId);
    const customPrompt = selectedPrompt?.content;

    setGeneratingScript(true);
    setAiScript('');
    try {
      const res = await topicsAPI.generateScript(topicId, Array.from(selectedMaterialIds), customPrompt) as any;
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
    let topicId = editingTopic?.id;
    if (!topicId) {
      const values = form.getFieldsValue(['title', 'description', 'status', 'priority', 'difficulty']);
      if (!values.title) { message.warning('请先填写选题标题'); return; }
      try {
        const newTopic = await topicsAPI.create(values) as any;
        topicId = newTopic.id;
        setEditingTopic(newTopic);
        queryClient.invalidateQueries({ queryKey: ['topics'] });
        queryClient.invalidateQueries({ queryKey: ['topics-stats'] });
      } catch (err: any) {
        message.error(err.response?.data?.message || '创建失败');
        return;
      }
    }
    const finalDraft = form.getFieldValue('finalDraft');
    setSavingDraft(true);
    try {
      await topicsAPI.update(topicId, { finalDraft });
      message.success('定稿已保存！');
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
    setSelectedPromptId(null);
    setAiScript('');
    setAiTitles([]);
    setAiOpenings([]);
    setSelectedTitleIndex(null);
    setSelectedOpeningIndex(null);
  };

  const openCreate = () => {
    setEditingTopic(null);
    resetPanel();
    form.resetFields();
    setCurrentStep(0);
    loadAvailablePrompts();
    setDrawerOpen(true);
  };

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
    setCurrentStep(0);
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
    setCurrentStep(0);
    loadAvailablePrompts();
    setDrawerOpen(true);
    searchByText(`${topic.title} ${topic.description || ''}`);
  };

  const handleClose = () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setDrawerOpen(false);
    setEditingTopic(null);
    resetPanel();
    form.resetFields();
    setCurrentStep(0);
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
    {
      title: '最终定稿', dataIndex: 'finalDraft', key: 'finalDraft',
      render: (finalDraft: string) => (
        <div style={{ fontSize: 13, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
          {finalDraft || '未填写'}
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

      {/* ════════════════ 分步向导抽屉 ════════════════ */}
      <Drawer
        title={
          <Space>
            {editingTopic ? <EditOutlined /> : <PlusOutlined />}
            <span>{editingTopic ? '编辑选题' : '记录想法'}</span>
            {editingTopic && getStatusTag(editingTopic.status)}
          </Space>
        }
        open={drawerOpen}
        onClose={handleClose}
        closable={false}
        extra={
          <Button type="text" icon={<span style={{ fontSize: 16, color: '#999' }}>×</span>} onClick={handleClose} />
        }
        width={860}
        styles={{
          body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' },
          header: { borderBottom: '1px solid #f0f0f0', padding: '12px 20px' },
        }}
      >
        <Form form={form} layout="vertical" component={false}>

          {/* ── 进度条 ── */}
          <div style={{ padding: '12px 24px', background: '#fff', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
            <Progress
              percent={Math.round(((currentStep + 1) / 4) * 100)}
              showInfo={false}
              strokeColor={{ '0%': '#1890ff', '100%': '#52c41a' }}
              style={{ marginBottom: 10 }}
              size={[undefined, 3]}
            />
            <Steps
              current={currentStep}
              size="small"
              items={WIZARD_STEPS}
              onChange={(step) => {
                if (step < currentStep) setCurrentStep(step);
              }}
            />
          </div>

          {/* ── 步骤内容区 ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>

            {/* Step 0：填写想法 */}
            {currentStep === 0 && (
              <div style={{ maxWidth: 520, margin: '0 auto' }}>
                <Form.Item
                  name="title"
                  label="选题标题"
                  rules={[{ required: true, message: '请输入标题' }]}
                >
                  <Input placeholder="一句话描述你的想法..." />
                </Form.Item>

                <Form.Item
                  name="description"
                  label="想法描述"
                >
                  <TextArea
                    rows={6}
                    placeholder={`描述内容方向、目标人群、核心观点...\n填写后系统会自动匹配相关素材`}
                    onChange={handleDescriptionChange}
                  />
                </Form.Item>

                {/* 提示词选择 */}
                {availablePrompts.length > 0 && (
                  <Form.Item
                    label="引用提示词"
                    required
                  >
                    <Select
                      placeholder="选择一个提示词模板（可不选）"
                      allowClear
                      value={selectedPromptId}
                      onChange={v => setSelectedPromptId(v ?? null)}
                      optionLabelProp="label"
                    >
                      {(() => {
                        const grouped = PROMPT_CATEGORY_COLOR;
                        const categories = [...new Set(availablePrompts.map(p => p.category))];
                        return categories.map(cat => (
                          <Select.OptGroup key={cat} label={cat}>
                            {availablePrompts.filter(p => p.category === cat).map(p => (
                              <Select.Option key={p.id} value={p.id} label={p.name}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ flex: 1 }}>{p.name}</span>
                                  <Tag color={grouped[p.category] || 'default'} style={{ margin: 0, fontSize: 10 }}>{p.category}</Tag>
                                </div>
                              </Select.Option>
                            ))}
                          </Select.OptGroup>
                        ));
                      })()}
                    </Select>
                  </Form.Item>
                )}

                <Row gutter={12}>
                  <Col span={8}>
                    <Form.Item name="status" label="状态" initialValue="pending" style={{ marginBottom: 0 }}>
                      <Select>
                        <Select.Option value="pending">💡 想法</Select.Option>
                        <Select.Option value="inProgress">✍️ 创作中</Select.Option>
                        <Select.Option value="completed">✅ 已完成</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="priority" label="优先级" initialValue="medium" style={{ marginBottom: 0 }}>
                      <Select>
                        <Select.Option value="low">🟢 低</Select.Option>
                        <Select.Option value="medium">🟡 中</Select.Option>
                        <Select.Option value="high">🔴 高</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="difficulty" label="难度" initialValue={2} style={{ marginBottom: 0 }}>
                      <Select>
                        <Select.Option value={1}>⭐ 简单</Select.Option>
                        <Select.Option value={2}>⭐⭐ 中等</Select.Option>
                        <Select.Option value={3}>⭐⭐⭐ 复杂</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

              </div>
            )}

            {/* Step 1：选择素材 */}
            {currentStep === 1 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {selCount > 0 && <Tag color="blue">已选 {selCount} 个</Tag>}
                    {hasSearched && (
                      relatedMaterials.length > 0
                        ? <Tag>共 {relatedMaterials.length} 个匹配</Tag>
                        : <Tag>未找到匹配</Tag>
                    )}
                    {matchedKeywords.slice(0, 3).map(kw => (
                      <Tag key={kw} style={{ fontSize: 11, color: '#999' }}>{kw}</Tag>
                    ))}
                  </div>
                  <Space>
                    {selCount > 0 && (
                      <Button type="text" size="small" style={{ color: '#aaa' }} onClick={() => setSelectedMaterialIds(new Set())}>
                        清空选择
                      </Button>
                    )}
                    <Button size="small" icon={<ReloadOutlined />} loading={searchingMaterials} onClick={triggerSearchNow}>
                      重新匹配
                    </Button>
                  </Space>
                </div>

                {searchingMaterials ? (
                  <div style={{ textAlign: 'center', paddingTop: 80 }}>
                    <Spin />
                    <div style={{ marginTop: 10, color: '#aaa', fontSize: 12 }}>匹配中...</div>
                  </div>
                ) : !hasSearched ? (
                  <div style={{ textAlign: 'center', paddingTop: 80 }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                    <div style={{ fontSize: 13, color: '#bbb', lineHeight: 2 }}>
                      未检测到相关描述<br />点击「重新匹配」手动触发，或跳过此步骤
                    </div>
                  </div>
                ) : relatedMaterials.length === 0 ? (
                  <div style={{ textAlign: 'center', paddingTop: 80 }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                    <div style={{ fontSize: 13, color: '#bbb', lineHeight: 2, marginBottom: 16 }}>
                      未找到相关素材<br />可直接跳过继续 AI 创作
                    </div>
                    <Button size="small" icon={<ReloadOutlined />} onClick={triggerSearchNow}>重新匹配</Button>
                  </div>
                ) : (
                  relatedMaterials.map((mat: any) => (
                    <MaterialCard key={mat.id} mat={mat} selected={selectedMaterialIds.has(mat.id)} onToggle={toggleMaterial} />
                  ))
                )}
              </div>
            )}

            {/* Step 2：AI 创作 */}
            {currentStep === 2 && (
              <div>
                {/* 信息栏 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
                  {selCount > 0 && <Tag color="blue">素材 {selCount} 个</Tag>}
                  {selectedPromptId && <Tag color="purple">{availablePrompts.find(p => p.id === selectedPromptId)?.name}</Tag>}
                </div>

                {generatingScript ? (
                  <div style={{ textAlign: 'center', paddingTop: 80 }}>
                    <Spin size="large" />
                    <div style={{ marginTop: 18, color: '#888', fontSize: 13, lineHeight: 2 }}>
                      AI 正在生成内容...<br />通常需要 10–30 秒
                    </div>
                  </div>
                ) : !aiScript ? (
                  <div style={{ textAlign: 'center', paddingTop: 80 }}>
                    <div style={{ fontSize: 48, marginBottom: 14 }}>🤖</div>
                    <div style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
                      AI 将基于你的想法生成视频文稿、爆款标题和开场白
                    </div>
                    <Button type="primary" icon={<ThunderboltOutlined />} onClick={autoGenerateAll}>开始生成</Button>
                  </div>
                ) : (
                  <>
                    {/* 生成的文稿 */}
                    <div style={{ background: '#fff', borderRadius: 10, padding: '16px 18px', marginBottom: 16, border: '1px solid #e8e8e8' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
                        <FileTextOutlined style={{ color: '#1890ff', marginRight: 7 }} />生成的文稿
                      </div>
                      <TextArea
                        value={aiScript}
                        onChange={e => setAiScript(e.target.value)}
                        autoSize={{ minRows: 6, maxRows: 14 }}
                        style={{ fontSize: 13, lineHeight: 1.9, border: '1px solid #f0f0f0', background: '#fafafa', borderRadius: 6 }}
                      />
                    </div>

                    {/* 爆款标题 */}
                    <div style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', marginBottom: 16, border: '1px solid #e8e8e8' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>
                          <BulbOutlined style={{ color: '#fa8c16', marginRight: 7 }} />爆款标题
                          {selectedTitleIndex !== null && (
                            <span style={{ fontSize: 11, color: '#1890ff', fontWeight: 400, marginLeft: 8 }}>已选第 {selectedTitleIndex + 1} 条</span>
                          )}
                        </span>
                        <Space size={7}>
                          <Select size="small" value={aiPlatform} onChange={v => { setAiPlatform(v); setSelectedTitleIndex(null); }} style={{ width: 80 }}
                            options={[{ value: '小红书' }, { value: '抖音' }, { value: '视频号' }, { value: 'B站' }]} />
                          <Button size="small" type="primary" ghost icon={<ThunderboltOutlined />} loading={generatingTitles} onClick={() => { setSelectedTitleIndex(null); handleGenerateTitles(); }}>
                            {aiTitles.length ? '重新生成' : '生成标题'}
                          </Button>
                        </Space>
                      </div>
                      {generatingTitles ? (
                        <div style={{ textAlign: 'center', padding: '12px 0', color: '#aaa', fontSize: 12 }}><Spin size="small" style={{ marginRight: 6 }} />生成中...</div>
                      ) : aiTitles.length > 0 ? (
                        aiTitles.map((title, i) => (
                          <div
                            key={i}
                            onClick={() => setSelectedTitleIndex(selectedTitleIndex === i ? null : i)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              padding: '10px 12px', borderRadius: 7, marginBottom: 6, cursor: 'pointer', transition: 'all 0.15s',
                              background: selectedTitleIndex === i ? '#e6f4ff' : '#f7f8fa',
                              border: `1px solid ${selectedTitleIndex === i ? '#91caff' : '#f0f0f0'}`,
                            }}
                          >
                            <span style={{ color: selectedTitleIndex === i ? '#1890ff' : '#ccc', fontSize: 11, width: 16, flexShrink: 0 }}>{i + 1}.</span>
                            <span style={{ flex: 1, fontSize: 13, lineHeight: 1.6 }}>{title}</span>
                            {selectedTitleIndex === i && <CheckOutlined style={{ color: '#1890ff', fontSize: 12, flexShrink: 0 }} />}
                          </div>
                        ))
                      ) : (
                        <div style={{ fontSize: 12, color: '#ccc', marginTop: 4 }}>选择平台，生成 5 个爆款标题</div>
                      )}
                    </div>

                    {/* 开场白优化 */}
                    <div style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', border: '1px solid #e8e8e8' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>
                          <ThunderboltOutlined style={{ color: '#722ed1', marginRight: 7 }} />开场白优化
                          {selectedOpeningIndex !== null && (
                            <span style={{ fontSize: 11, color: '#722ed1', fontWeight: 400, marginLeft: 8 }}>已选「{aiOpenings[selectedOpeningIndex]?.style}」</span>
                          )}
                        </span>
                        <Button size="small" type="primary" ghost icon={<ThunderboltOutlined />} loading={generatingOpening}
                          onClick={() => { setSelectedOpeningIndex(null); handleOptimizeOpening(); }}>
                          {aiOpenings.length ? '重新优化' : '优化开场'}
                        </Button>
                      </div>
                      {generatingOpening ? (
                        <div style={{ textAlign: 'center', padding: '12px 0', color: '#aaa', fontSize: 12 }}><Spin size="small" style={{ marginRight: 6 }} />优化中...</div>
                      ) : aiOpenings.length > 0 ? (
                        aiOpenings.map((o, i) => (
                          <div
                            key={i}
                            onClick={() => setSelectedOpeningIndex(selectedOpeningIndex === i ? null : i)}
                            style={{
                              padding: '10px 12px', borderRadius: 8, marginBottom: 8, cursor: 'pointer', transition: 'all 0.15s',
                              background: selectedOpeningIndex === i ? '#f9f0ff' : '#f7f8fa',
                              border: `1px solid ${selectedOpeningIndex === i ? '#d3adf7' : '#f0f0f0'}`,
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <Tag color={selectedOpeningIndex === i ? 'purple' : 'default'} style={{ margin: 0 }}>{o.style}</Tag>
                              {selectedOpeningIndex === i && <CheckOutlined style={{ color: '#722ed1', fontSize: 12 }} />}
                            </div>
                            <div style={{ fontSize: 13, color: '#333', lineHeight: 1.8 }}>{o.content}</div>
                          </div>
                        ))
                      ) : (
                        <div style={{ fontSize: 12, color: '#ccc', marginTop: 4 }}>基于文稿，生成 3 种风格的开场白方案</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 3：最终定稿 */}
            {currentStep === 3 && (
              <div style={{ maxWidth: 600, margin: '0 auto' }}>
                <div style={{ marginBottom: 16, fontSize: 13, color: '#888', lineHeight: 1.8 }}>
                  在此编辑并保存最终版本文案。{aiScript && '上一步已生成文稿，可点击下方按钮快速填入。'}
                </div>
                {aiScript && (
                  <Button
                    block
                    icon={<FileTextOutlined />}
                    style={{ marginBottom: 16 }}
                    onClick={() => { form.setFieldValue('finalDraft', aiScript); message.success('已填入'); }}
                  >
                    将 AI 生成文稿填入定稿
                  </Button>
                )}
                <Form.Item name="finalDraft" style={{ marginBottom: 0 }}>
                  <TextArea
                    placeholder="在这里记录最终定稿的文案或脚本..."
                    rows={18}
                    style={{ fontSize: 13, lineHeight: 1.9, fontFamily: 'inherit', resize: 'none' }}
                  />
                </Form.Item>
              </div>
            )}
          </div>

          {/* ── 底部导航栏 ── */}
          <div style={{
            padding: '14px 32px',
            borderTop: '1px solid #f0f0f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#fff',
            flexShrink: 0,
          }}>
            <Button
              icon={currentStep > 0 ? <ArrowLeftOutlined /> : undefined}
              onClick={currentStep === 0 ? handleClose : handleBack}
            >
              {currentStep === 0 ? '取消' : '上一步'}
            </Button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, color: '#bbb' }}>
                {currentStep + 1} / {WIZARD_STEPS.length}
              </span>
              {currentStep < 3 ? (
                <Button type="primary" onClick={handleNext}>
                  下一步
                </Button>
              ) : (
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={savingDraft}
                  onClick={handleSaveDraft}
                >
                  保存定稿
                </Button>
              )}
            </div>
          </div>

        </Form>
      </Drawer>

      <style>{`
        .completed-row td { background: #f6ffed !important; }
        .completed-row:hover td { background: #edfde4 !important; }
      `}</style>
    </div>
  );
}
