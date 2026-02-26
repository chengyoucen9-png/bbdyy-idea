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
} from '@ant-design/icons';
import { settingsAPI } from '../api/client';

const { Text, Title } = Typography;

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

  const loading = <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>加载中...</div>;

  const tabItems = [
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
          <Text type="secondary">管理大模型密钥、模型参数及系统环境配置，保存后写入 .env 文件</Text>
        </div>
        <Tooltip title="重新加载配置">
          <Button icon={<ReloadOutlined />} loading={loadingSettings} onClick={loadSettings} />
        </Tooltip>
      </div>
      <Tabs items={tabItems} type="card" />
    </div>
  );
}
