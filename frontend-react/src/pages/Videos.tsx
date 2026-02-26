import { useState, useRef, useEffect } from 'react';
import { Input, Button, Select, Space, Spin, Typography } from 'antd';
import { SendOutlined, ClearOutlined, UserOutlined } from '@ant-design/icons';
import { chatAPI } from '../api/client';

const { TextArea } = Input;
const { Text } = Typography;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const MODEL_PROVIDERS = [
  {
    key: 'deepseek',
    name: 'DeepSeek',
    icon: '🧠',
    color: '#4f46e5',
    models: [
      { label: 'DeepSeek V3', value: 'deepseek-chat' },
      { label: 'DeepSeek R1 (推理)', value: 'deepseek-reasoner' },
    ],
  },
  {
    key: 'qwen',
    name: '通义千问',
    icon: '🌙',
    color: '#0ea5e9',
    models: [
      { label: 'Qwen Turbo（快速）', value: 'qwen-turbo' },
      { label: 'Qwen Plus（均衡）', value: 'qwen-plus' },
      { label: 'Qwen Max（最强）', value: 'qwen-max' },
    ],
  },
  {
    key: 'kimi',
    name: 'Kimi',
    icon: '🌊',
    color: '#10b981',
    models: [
      { label: 'Kimi 8K', value: 'moonshot-v1-8k' },
      { label: 'Kimi 32K', value: 'moonshot-v1-32k' },
      { label: 'Kimi 128K（长文本）', value: 'moonshot-v1-128k' },
    ],
  },
];

export default function ChatPage() {
  const [providerKey, setProviderKey] = useState('deepseek');
  const [model, setModel] = useState('deepseek-chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const provider = MODEL_PROVIDERS.find((p) => p.key === providerKey)!;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleProviderChange = (key: string) => {
    setProviderKey(key);
    const p = MODEL_PROVIDERS.find((p) => p.key === key)!;
    setModel(p.models[0].value);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const result = await chatAPI.send(model, newMessages) as any;
      setMessages([...newMessages, { role: 'assistant', content: result.content || '（无内容）' }]);
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.message || '请求失败，请检查 API Key 配置';
      setMessages([...newMessages, { role: 'assistant', content: `⚠️ ${errMsg}` }]);
    } finally {
      setLoading(false);
    }
  };

  const currentModelLabel = provider.models.find((m) => m.value === model)?.label || model;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 顶部工具栏 */}
      <div style={{
        flexShrink: 0,
        background: '#fff',
        padding: '10px 24px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        {/* 模型厂商选择 */}
        <Space size={6}>
          {MODEL_PROVIDERS.map((p) => (
            <div
              key={p.key}
              onClick={() => handleProviderChange(p.key)}
              style={{
                padding: '5px 16px',
                borderRadius: 20,
                cursor: 'pointer',
                background: providerKey === p.key ? p.color : '#f5f5f5',
                color: providerKey === p.key ? '#fff' : '#555',
                fontSize: 13,
                fontWeight: providerKey === p.key ? 600 : 400,
                transition: 'all 0.2s',
                userSelect: 'none',
              }}
            >
              {p.icon} {p.name}
            </div>
          ))}
        </Space>

        {/* 具体模型选择 */}
        <Select
          value={model}
          onChange={setModel}
          options={provider.models}
          style={{ width: 200 }}
          size="small"
        />

        {/* 清空按钮 */}
        <Button
          size="small"
          icon={<ClearOutlined />}
          onClick={() => setMessages([])}
          disabled={messages.length === 0}
          style={{ marginLeft: 'auto' }}
        >
          清空对话
        </Button>
      </div>

      {/* 消息区域 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: '#fafafa' }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: 80 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>{provider.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>
              开始与 {provider.name} 对话
            </div>
            <Text type="secondary" style={{ fontSize: 13 }}>
              当前模型：{currentModelLabel}
            </Text>
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
              {['帮我写一个短视频脚本', '分析热门视频选题方向', '给我一些创作灵感'].map((hint) => (
                <div
                  key={hint}
                  onClick={() => setInput(hint)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 20,
                    border: '1px solid #e8e8e8',
                    cursor: 'pointer',
                    fontSize: 13,
                    color: '#555',
                    background: '#fff',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = provider.color)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e8e8e8')}
                >
                  {hint}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: 16,
                  gap: 10,
                  alignItems: 'flex-start',
                }}
              >
                {msg.role === 'assistant' && (
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: provider.color + '20',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, fontSize: 18,
                  }}>
                    {provider.icon}
                  </div>
                )}
                <div style={{
                  maxWidth: '72%',
                  padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: msg.role === 'user' ? provider.color : '#fff',
                  color: msg.role === 'user' ? '#fff' : '#1a1a1a',
                  fontSize: 14,
                  lineHeight: 1.75,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                }}>
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: provider.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <UserOutlined style={{ color: '#fff', fontSize: 15 }} />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: provider.color + '20',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18,
                }}>
                  {provider.icon}
                </div>
                <div style={{
                  padding: '10px 16px',
                  borderRadius: '18px 18px 18px 4px',
                  background: '#fff',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <Spin size="small" />
                  <span style={{ color: '#999', fontSize: 13 }}>正在思考...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* 输入区域 */}
      <div style={{
        flexShrink: 0,
        background: '#fff',
        padding: '12px 24px 16px',
        borderTop: '1px solid #f0f0f0',
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="输入消息，按 Enter 发送，Shift+Enter 换行..."
            autoSize={{ minRows: 2, maxRows: 6 }}
            style={{ flex: 1, borderRadius: 8, resize: 'none' }}
            disabled={loading}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={sendMessage}
            loading={loading}
            disabled={!input.trim()}
            style={{
              height: 'auto',
              minHeight: 60,
              padding: '0 20px',
              borderRadius: 8,
              background: provider.color,
              borderColor: provider.color,
            }}
          >
            发送
          </Button>
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: '#ccc' }}>
          Enter 发送 · Shift+Enter 换行
        </div>
      </div>
    </div>
  );
}
