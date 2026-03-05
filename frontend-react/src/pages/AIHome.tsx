import { useState } from 'react';
import { Card, Input, Button, Row, Col, Statistic, List, Tag, message } from 'antd';
import { RobotOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { materialsAPI, topicsAPI } from '../api/client';

const { TextArea } = Input;

export default function AIHomePage() {
  const [userInput, setUserInput] = useState('');
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const { data: materials } = useQuery({
    queryKey: ['materials'],
    queryFn: () => materialsAPI.getList(),
  });

  const { data: topics } = useQuery({
    queryKey: ['topics'],
    queryFn: () => topicsAPI.getList(),
  });

  const { data: stats } = useQuery({
    queryKey: ['materials-stats'],
    queryFn: () => materialsAPI.getStats(),
  });

  const handleAISearch = () => {
    if (!userInput.trim()) {
      message.warning('请输入你的创作想法！');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const keywords = userInput.toLowerCase().split(/\s+/).filter(k => k.length > 1);
      const matched = (materials as any)?.filter((m: any) => {
        const text = `${m.name} ${m.scene} ${m.note}`.toLowerCase();
        return keywords.some(k => text.includes(k));
      }) || [];
      setRecommendations(matched.slice(0, 5));
      setLoading(false);
      message.success(`🎯 找到 ${matched.length} 个相关素材！`);
    }, 1000);
  };

  return (
    <div>
      <Card style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none', borderRadius: 16, marginBottom: 32 }} bodyStyle={{ padding: 48 }}>
        <div style={{ color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <RobotOutlined style={{ fontSize: 40 }} />
            <h1 style={{ color: 'white', margin: 0, fontSize: 32 }}>AI 智能创作助手</h1>
          </div>
          <p style={{ fontSize: 18, opacity: 0.9, marginBottom: 32 }}>输入你的创作想法，让 AI 帮你找到最合适的素材和选题建议</p>
          <TextArea value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder="例如：想做一期关于咖啡拉花技巧的教学视频" rows={5} style={{ fontSize: 16, borderRadius: 8, marginBottom: 16 }} />
          <Button type="primary" size="large" icon={<ThunderboltOutlined />} onClick={handleAISearch} loading={loading} style={{ height: 56, fontSize: 18, background: 'rgba(255,255,255,0.2)', border: '2px solid white' }}>开始 AI 检索</Button>
        </div>
      </Card>
      <Row gutter={16} style={{ marginBottom: 32 }}>
        <Col span={8}><Card><Statistic title="素材总数" value={0} suffix="个" valueStyle={{ color: '#667eea' }} /></Card></Col>
        <Col span={8}><Card><Statistic title="选题数量" value={0} suffix="个" valueStyle={{ color: '#764ba2' }} /></Card></Col>
        <Col span={8}><Card><Statistic title="视频作品" value={0} suffix="个" valueStyle={{ color: '#52c41a' }} /></Card></Col>
      </Row>
      {recommendations.length > 0 && (
        <Card title="🎯 AI 推荐内容">
          <List dataSource={recommendations} renderItem={(item: any) => (
            <List.Item>
              <List.Item.Meta title={item.name} description={item.scene} />
            </List.Item>
          )} />
        </Card>
      )}
    </div>
  );
}
