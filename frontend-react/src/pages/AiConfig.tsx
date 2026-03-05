import { useState, useEffect } from 'react';
import {
  Tabs,
  Card,
  Form,
  Input,
  Button,
  Select,
  Tag,
  Space,
  message,
  Tooltip,
  Typography,
  Row,
  Col,
  InputNumber,
  Modal,
} from 'antd';
import {
  EyeInvisibleOutlined,
  EyeOutlined,
  SaveOutlined,
  ReloadOutlined,
  RobotOutlined,
  DatabaseOutlined,
  CloudOutlined,
  SettingOutlined,
  ApiOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { settingsAPI } from '../api/client';

const { Text, Title } = Typography;
const { TextArea } = Input;

// ─── 类型 ─────────────────────────────────────────────────────────────────────
interface SettingField {
  key: string;
  value: string;
  sensitive: boolean;
}

interface SettingsGroup {
  group: string;
  label: string;
  fields: SettingField[];
}

interface Prompt {
  id: string;
  name: string;
  category: string;
  content: string;
  updatedAt: string;
}

// ─── 密码输入组件 ──────────────────────────────────────────────────────────────
function SensitiveInput({ value, onChange }: { value?: string; onChange?: (v: string) => void }) {
  const [visible, setVisible] = useState(false);
  return (
    <Input
      type={visible ? 'text' : 'password'}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      suffix={
        <span style={{ cursor: 'pointer', color: '#999' }} onClick={() => setVisible((v) => !v)}>
          {visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
        </span>
      }
    />
  );
}

// ─── 通用系统参数 Tab ──────────────────────────────────────────────────────────
function SettingsGroupTab({ groups, targetGroups }: { groups: SettingsGroup[]; targetGroups: string[] }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const filtered = groups.filter((g) => targetGroups.includes(g.group));

  useEffect(() => {
    const init: Record<string, string> = {};
    filtered.forEach((g) => g.fields.forEach((f) => { init[f.key] = f.value; }));
    form.setFieldsValue(init);
    setDirty(false);
  }, [groups]);

  const handleSave = async () => {
    const values = form.getFieldsValue();
    const updates: Record<string, string> = {};
    filtered.forEach((g) =>
      g.fields.forEach((f) => {
        if (values[f.key] !== undefined) updates[f.key] = String(values[f.key]);
      })
    );
    setSaving(true);
    try {
      await settingsAPI.update(updates);
      message.success('配置已保存，部分配置需重启服务后生效');
      setDirty(false);
    } catch {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const init: Record<string, string> = {};
    filtered.forEach((g) => g.fields.forEach((f) => { init[f.key] = f.value; }));
    form.setFieldsValue(init);
    setDirty(false);
  };

  if (filtered.length === 0) {
    return <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>加载中...</div>;
  }

  return (
    <Form form={form} layout="vertical" onValuesChange={() => setDirty(true)}>
      {filtered.map((g) => (
        <Card key={g.group} title={g.label} style={{ marginBottom: 16 }} size="small">
          <Row gutter={[16, 0]}>
            {g.fields.map((f) => (
              <Col xs={24} sm={12} key={f.key}>
                <Form.Item
                  name={f.key}
                  label={
                    <Space size={4}>
                      <Text strong style={{ fontSize: 13 }}>{f.key}</Text>
                      {f.sensitive && <Tag color="orange" style={{ fontSize: 11 }}>敏感</Tag>}
                    </Space>
                  }
                >
                  {f.sensitive ? (
                    <SensitiveInput />
                  ) : f.key === 'NODE_ENV' ? (
                    <Select options={[
                      { label: 'development', value: 'development' },
                      { label: 'production', value: 'production' },
                    ]} />
                  ) : f.key === 'LOG_LEVEL' ? (
                    <Select options={['debug', 'info', 'warn', 'error'].map((v) => ({ label: v, value: v }))} />
                  ) : f.key === 'PORT' || f.key === 'DB_PORT' || f.key === 'MAX_FILE_SIZE' ? (
                    <InputNumber style={{ width: '100%' }} />
                  ) : (
                    <Input />
                  )}
                </Form.Item>
              </Col>
            ))}
          </Row>
        </Card>
      ))}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
        <Button icon={<ReloadOutlined />} onClick={handleReset} disabled={!dirty}>重置</Button>
        <Button type="primary" icon={<SaveOutlined />} loading={saving} disabled={!dirty} onClick={handleSave}>
          保存配置
        </Button>
      </div>
    </Form>
  );
}

// ─── 提示词配置 Tab ────────────────────────────────────────────────────────────
const PROMPT_STORAGE_KEY = 'xingshu_ai_prompts';

const PROMPT_CATEGORIES = ['文稿生成', '标题生成', '开场白优化', '通用', '其他'];

const CATEGORY_COLOR: Record<string, string> = {
  '文稿生成': 'blue',
  '标题生成': 'orange',
  '开场白优化': 'purple',
  '通用': 'green',
  '其他': 'default',
};

const DEFAULT_PROMPTS: Prompt[] = [
  {
    id: 'default-1',
    name: '视频文稿生成（通用）',
    category: '文稿生成',
    content: `你是一位专业的短视频文案创作者。请根据以下选题信息，创作一篇适合短视频的文稿。

要求：
1. 开场要有吸引力，前5秒要抓住观众注意力
2. 内容有逻辑，层次清晰
3. 结尾要有行动号召（点赞/关注/评论）
4. 字数控制在500-800字
5. 语言口语化，接地气

选题标题：{title}
内容描述：{description}
参考素材：{materials}`,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'default-2',
    name: '爆款标题生成',
    category: '标题生成',
    content: `你是一位专业的自媒体运营专家，擅长写出高点击率的标题。

请为以下内容生成5个爆款标题，要求：
1. 标题要有数字、悬念或强烈情绪
2. 控制在20字以内
3. 适合{platform}平台风格
4. 包含核心关键词

内容主题：{title}
内容摘要：{description}`,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'default-3',
    name: '开场白优化',
    category: '开场白优化',
    content: `你是一位视频开场白专家。请将以下文稿的开头部分优化为3种不同风格的开场白。

要求：
1. 每个开场白控制在50字以内
2. 分别提供：悬念式、共鸣式、干货式 三种风格
3. 要在前3秒就能抓住观众

原文稿：{script}`,
    updatedAt: new Date().toISOString(),
  },
];

function loadPrompts(): Prompt[] {
  try {
    const stored = localStorage.getItem(PROMPT_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  // 首次使用时写入默认提示词
  localStorage.setItem(PROMPT_STORAGE_KEY, JSON.stringify(DEFAULT_PROMPTS));
  return DEFAULT_PROMPTS;
}

function PromptConfigTab() {
  const [prompts, setPrompts] = useState<Prompt[]>(loadPrompts);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [form] = Form.useForm();
  const [filterCategory, setFilterCategory] = useState<string>('全部');

  const saveToStorage = (list: Prompt[]) => {
    localStorage.setItem(PROMPT_STORAGE_KEY, JSON.stringify(list));
    setPrompts(list);
  };

  const openAdd = () => {
    setEditingPrompt(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (p: Prompt) => {
    setEditingPrompt(p);
    form.setFieldsValue({ name: p.name, category: p.category, content: p.content });
    setModalOpen(true);
  };

  const handleSave = () => {
    form.validateFields().then(values => {
      const now = new Date().toISOString();
      if (editingPrompt) {
        saveToStorage(prompts.map(p =>
          p.id === editingPrompt.id ? { ...p, ...values, updatedAt: now } : p
        ));
        message.success('提示词已更新');
      } else {
        const newPrompt: Prompt = { id: `prompt-${Date.now()}`, ...values, updatedAt: now };
        saveToStorage([...prompts, newPrompt]);
        message.success('提示词已添加');
      }
      setModalOpen(false);
    });
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除此提示词？',
      content: '删除后无法恢复',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        saveToStorage(prompts.filter(p => p.id !== id));
        message.success('已删除');
      },
    });
  };

  const handleDuplicate = (p: Prompt) => {
    const copy: Prompt = {
      ...p,
      id: `prompt-${Date.now()}`,
      name: `${p.name}（副本）`,
      updatedAt: new Date().toISOString(),
    };
    saveToStorage([...prompts, copy]);
    message.success('已复制');
  };

  const copyContent = (text: string) => {
    navigator.clipboard.writeText(text).then(() => message.success('内容已复制到剪贴板')).catch(() => message.error('复制失败'));
  };

  const handleResetDefaults = () => {
    Modal.confirm({
      title: '恢复默认提示词？',
      content: '这将在现有列表末尾追加默认提示词（不会删除已有内容）',
      okText: '确认追加',
      cancelText: '取消',
      onOk: () => {
        const existingIds = new Set(prompts.map(p => p.id));
        const toAdd = DEFAULT_PROMPTS.filter(p => !existingIds.has(p.id));
        if (toAdd.length === 0) { message.info('默认提示词已全部存在'); return; }
        saveToStorage([...prompts, ...toAdd]);
        message.success(`已追加 ${toAdd.length} 个默认提示词`);
      },
    });
  };

  const allCategories = ['全部', ...PROMPT_CATEGORIES];
  const displayed = filterCategory === '全部' ? prompts : prompts.filter(p => p.category === filterCategory);

  return (
    <div>
      {/* 顶部操作栏 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <Space wrap>
          <Text type="secondary" style={{ fontSize: 13 }}>
            共 {prompts.length} 个提示词，支持在 AI 创作时引用
          </Text>
          <span style={{ color: '#e8e8e8' }}>|</span>
          {allCategories.map(cat => (
            <Tag
              key={cat}
              color={filterCategory === cat ? (CATEGORY_COLOR[cat] || 'blue') : 'default'}
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => setFilterCategory(cat)}
            >
              {cat}
              {cat !== '全部' && (
                <span style={{ marginLeft: 4, opacity: 0.7 }}>
                  ({prompts.filter(p => p.category === cat).length})
                </span>
              )}
            </Tag>
          ))}
        </Space>
        <Space>
          <Button size="small" onClick={handleResetDefaults}>恢复默认</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>添加提示词</Button>
        </Space>
      </div>

      {/* 提示词列表 */}
      {displayed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', background: '#fafafa', borderRadius: 8, border: '1px dashed #e0e0e0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
          <div style={{ fontSize: 13, color: '#bbb', marginBottom: 16 }}>
            {filterCategory === '全部' ? '暂无提示词，点击上方按钮添加' : `暂无「${filterCategory}」分类的提示词`}
          </div>
          <Button icon={<PlusOutlined />} onClick={openAdd}>添加提示词</Button>
        </div>
      ) : (
        <Row gutter={[12, 12]}>
          {displayed.map(p => (
            <Col xs={24} lg={12} key={p.id}>
              <Card
                size="small"
                style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                styles={{ body: { flex: 1 } }}
                title={
                  <Space size={6}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</span>
                    <Tag
                      color={CATEGORY_COLOR[p.category] || 'default'}
                      style={{ margin: 0, fontSize: 11 }}
                    >
                      {p.category}
                    </Tag>
                  </Space>
                }
                extra={
                  <Space size={0}>
                    <Tooltip title="复制内容">
                      <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => copyContent(p.content)} />
                    </Tooltip>
                    <Tooltip title="复制一份">
                      <Button type="text" size="small" icon={<FileTextOutlined />} onClick={() => handleDuplicate(p)} />
                    </Tooltip>
                    <Tooltip title="编辑">
                      <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(p)} />
                    </Tooltip>
                    <Tooltip title="删除">
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(p.id)} />
                    </Tooltip>
                  </Space>
                }
              >
                {/* 内容预览 */}
                <div style={{
                  fontSize: 12,
                  color: '#555',
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  background: '#f7f8fa',
                  borderRadius: 6,
                  padding: '8px 10px',
                  maxHeight: 120,
                  overflow: 'hidden',
                  position: 'relative',
                }}>
                  {p.content}
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, height: 32,
                    background: 'linear-gradient(transparent, #f7f8fa)',
                  }} />
                </div>

                {/* 变量提示 */}
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {['{title}', '{description}', '{materials}', '{script}', '{platform}']
                    .filter(v => p.content.includes(v))
                    .map(v => (
                      <Tag key={v} style={{ margin: 0, fontSize: 10, fontFamily: 'monospace', color: '#1890ff', background: '#e6f4ff', border: '1px solid #91caff' }}>
                        {v}
                      </Tag>
                    ))}
                </div>

                <div style={{ marginTop: 6, fontSize: 11, color: '#ccc' }}>
                  更新于 {new Date(p.updatedAt).toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' })}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* 编辑 Modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            {editingPrompt ? '编辑提示词' : '添加提示词'}
          </Space>
        }
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        okText="保存"
        cancelText="取消"
        width={680}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={12}>
            <Col span={16}>
              <Form.Item
                name="name"
                label="提示词名称"
                rules={[{ required: true, message: '请输入名称' }]}
              >
                <Input placeholder="如：视频文稿生成-美食类" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="category"
                label="分类"
                initialValue="通用"
                rules={[{ required: true }]}
              >
                <Select options={PROMPT_CATEGORIES.map(c => ({ label: c, value: c }))} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="content"
            label={
              <Space>
                <span>提示词内容</span>
                <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
                  可用变量：<code>{'{title}'}</code> <code>{'{description}'}</code> <code>{'{materials}'}</code> <code>{'{script}'}</code> <code>{'{platform}'}</code>
                </Text>
              </Space>
            }
            rules={[{ required: true, message: '请输入提示词内容' }]}
          >
            <TextArea
              rows={14}
              placeholder="输入提示词内容，使用 {title}、{description} 等变量引用上下文..."
              style={{ fontFamily: 'monospace', fontSize: 13, lineHeight: 1.7 }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ─── 主页面 ────────────────────────────────────────────────────────────────────
export default function AiConfigPage() {
  const [settingsGroups, setSettingsGroups] = useState<SettingsGroup[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(false);

  const loadSettings = async () => {
    setLoadingSettings(true);
    try {
      const data: any = await settingsAPI.getAll();
      setSettingsGroups(Array.isArray(data) ? data : data?.data || []);
    } catch {
      message.error('加载系统配置失败');
    } finally {
      setLoadingSettings(false);
    }
  };

  useEffect(() => { loadSettings(); }, []);

  const loading = (
    <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>加载中...</div>
  );

  const tabItems = [
    {
      key: 'prompts',
      label: <Space><FileTextOutlined />提示词配置</Space>,
      children: <PromptConfigTab />,
    },
    {
      key: 'ai',
      label: <Space><RobotOutlined />大模型配置</Space>,
      children: loadingSettings ? loading : (
        <SettingsGroupTab groups={settingsGroups} targetGroups={['ai']} />
      ),
    },
    {
      key: 'oss',
      label: <Space><CloudOutlined />阿里云 OSS</Space>,
      children: loadingSettings ? loading : (
        <SettingsGroupTab groups={settingsGroups} targetGroups={['oss']} />
      ),
    },
    {
      key: 'db',
      label: <Space><DatabaseOutlined />数据库</Space>,
      children: loadingSettings ? loading : (
        <SettingsGroupTab groups={settingsGroups} targetGroups={['db']} />
      ),
    },
    {
      key: 'feishu',
      label: <Space><ApiOutlined />飞书配置</Space>,
      children: loadingSettings ? loading : (
        <SettingsGroupTab groups={settingsGroups} targetGroups={['feishu']} />
      ),
    },
    {
      key: 'system',
      label: <Space><SettingOutlined />系统配置</Space>,
      children: loadingSettings ? loading : (
        <SettingsGroupTab groups={settingsGroups} targetGroups={['app', 'jwt', 'cors', 'upload', 'log']} />
      ),
    },
  ];

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>AI 与系统配置</Title>
          <Text type="secondary">管理提示词模板、AI 服务商及系统环境参数</Text>
        </div>
        <Tooltip title="重新加载配置">
          <Button icon={<ReloadOutlined />} loading={loadingSettings} onClick={loadSettings} />
        </Tooltip>
      </div>

      <Tabs items={tabItems} type="card" defaultActiveKey="prompts" />
    </div>
  );
}