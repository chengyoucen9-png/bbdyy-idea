import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Row, Col, Tag, Empty, Spin, Typography, Space, Drawer, Button } from 'antd';
import {
  SearchOutlined,
  VideoCameraOutlined,
  AudioOutlined,
  FileImageOutlined,
  PlayCircleOutlined,
  ClockCircleOutlined,
  EditOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { materialsAPI } from '../api/client';

const { Title, Text } = Typography;
const { Search } = Input;

const fetchMaterials = async (keyword: string) => {
  const params: any = { page: 1, limit: 50 };
  if (keyword) params.search = keyword;
  return materialsAPI.getList(params);
};

const getFileIcon = (fileType: string) => {
  switch (fileType) {
    case 'video': return <VideoCameraOutlined style={{ color: '#1890ff', fontSize: 40 }} />;
    case 'audio': return <AudioOutlined style={{ color: '#52c41a', fontSize: 40 }} />;
    case 'image': return <FileImageOutlined style={{ color: '#fa8c16', fontSize: 40 }} />;
    default: return <PlayCircleOutlined style={{ fontSize: 40, color: '#999' }} />;
  }
};

const getFileTypeColor = (fileType: string) => {
  switch (fileType) {
    case 'video': return 'blue';
    case 'audio': return 'green';
    case 'image': return 'orange';
    default: return 'default';
  }
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function HomePage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [previewMaterial, setPreviewMaterial] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['materials-search', searchKeyword],
    queryFn: () => fetchMaterials(searchKeyword),
  });

  const dataAny = data as any;
  const materials = Array.isArray(dataAny?.items) ? dataAny.items : (Array.isArray(data) ? data : []);

  const handleSearch = (value: string) => {
    setSearchKeyword(value.trim());
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 搜索区域 - 固定不动 */}
      <div style={{
        flexShrink: 0,
        background: '#fff',
        padding: '20px 24px 16px',
        borderBottom: '1px solid #f0f0f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <Title level={2} style={{ marginBottom: 4, textAlign: 'center' }}>🎬 素材搜索</Title>
        <Text type="secondary" style={{ fontSize: 14, display: 'block', textAlign: 'center', marginBottom: 14 }}>
          输入关键词搜索素材库，支持名称、场景、标签、转写文本匹配
        </Text>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <Search
            placeholder="搜索素材名称、场景、标签、转写文本..."
            allowClear
            enterButton={<><SearchOutlined /> 搜索</>}
            size="large"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onSearch={handleSearch}
          />
        </div>
      </div>

      {/* 结果区域 - 独立滚动 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" />
        </div>
      ) : materials.length === 0 ? (
        <Empty
          description={searchKeyword ? `未找到与"${searchKeyword}"相关的素材` : '暂无素材，请先上传'}
          style={{ marginTop: 60 }}
        />
      ) : (
        <>
          {searchKeyword && (
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">
                找到 <Text strong>{materials.length}</Text> 个与「{searchKeyword}」相关的素材
              </Text>
            </div>
          )}
          <Row gutter={[16, 16]}>
            {materials.map((item: any) => (
              <Col key={item.id} xs={24} sm={12} md={8} lg={6}>
                <div
                  onClick={() => setPreviewMaterial(item)}
                  style={{
                    borderRadius: 8,
                    overflow: 'hidden',
                    background: '#fff',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    transition: 'box-shadow 0.2s, transform 0.2s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.18)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.1)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  }}
                >
                  {/* 封面 */}
                  <div style={{
                    height: 160,
                    background: '#1a1a2e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {item.thumbnail ? (
                      item.fileType === 'video' ? (
                        <>
                          <video
                            src={item.thumbnail}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            muted
                            preload="metadata"
                            onLoadedMetadata={(e) => {
                              const v = e.currentTarget;
                              v.currentTime = Math.min(1, v.duration * 0.1);
                            }}
                          />
                          <div style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(0,0,0,0.25)',
                          }}>
                            <PlayCircleOutlined style={{ fontSize: 38, color: 'rgba(255,255,255,0.9)' }} />
                          </div>
                        </>
                      ) : item.fileType === 'image' ? (
                        <img src={item.thumbnail} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        getFileIcon(item.fileType)
                      )
                    ) : (
                      getFileIcon(item.fileType)
                    )}
                    {/* 时长角标 */}
                    {item.duration && (
                      <div style={{
                        position: 'absolute', bottom: 6, right: 8,
                        background: 'rgba(0,0,0,0.6)', color: '#fff',
                        fontSize: 11, padding: '1px 6px', borderRadius: 4,
                      }}>
                        {Math.floor(item.duration / 60)}:{String(Math.round(item.duration % 60)).padStart(2, '0')}
                      </div>
                    )}
                  </div>

                  {/* 信息区 */}
                  <div style={{ padding: '10px 12px 12px' }}>
                    {/* 标题 */}
                    <div style={{
                      fontWeight: 600, fontSize: 14, marginBottom: 6,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      color: '#1a1a1a',
                    }}>
                      {item.name}
                    </div>

                    {/* 类型 + 场景标签 */}
                    <div style={{ marginBottom: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {item.tags?.filter(Boolean).slice(0, 3).map((tag: string) => (
                        <Tag key={tag} color="purple" style={{ margin: 0, maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tag}</Tag>
                      ))}
                      {(item.tags?.filter(Boolean).length || 0) > 3 && (
                        <Tag style={{ margin: 0 }}>+{item.tags.filter(Boolean).length - 3}</Tag>
                      )}
                    </div>

                    {/* 转写摘要 */}
                    {item.note && (
                      <div style={{
                        fontSize: 12, color: '#888', marginBottom: 6,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {item.note}
                      </div>
                    )}

                    {/* 发布时间 */}
                    <div style={{ fontSize: 11, color: '#bbb', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ClockCircleOutlined />
                      {formatDate(item.createdAt || item.created_at)}
                    </div>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </>
      )}

      </div>

      {/* 右侧抽屉预览 */}
      <Drawer
        open={!!previewMaterial}
        onClose={() => setPreviewMaterial(null)}
        placement="right"
        width={600}
        title={
          <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>
            {previewMaterial?.name}
          </div>
        }
        styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' } }}
        footer={
          <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button
              icon={<EditOutlined />}
              onClick={() => {
                const id = previewMaterial?.id;
                setPreviewMaterial(null);
                navigate('/materials', { state: { editId: id } });
              }}
            >
              编辑素材
            </Button>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={() => {
                const mat = previewMaterial;
                setPreviewMaterial(null);
                navigate('/topics', { state: { prefill: { title: mat?.name, description: mat?.note } } });
              }}
            >
              一键二创
            </Button>
          </Space>
        }
        destroyOnHidden
      >
        {previewMaterial && (
          <>
            {/* 视频/图片/音频播放区 */}
            <div style={{
              flexShrink: 0,
              background: '#000',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {previewMaterial.fileType === 'video' && previewMaterial.thumbnail && (
                <video
                  key={previewMaterial.id}
                  src={previewMaterial.thumbnail}
                  controls
                  autoPlay
                  style={{ width: '100%', maxHeight: 320, objectFit: 'contain', display: 'block' }}
                />
              )}
              {previewMaterial.fileType === 'image' && previewMaterial.thumbnail && (
                <img
                  src={previewMaterial.thumbnail}
                  alt={previewMaterial.name}
                  style={{ width: '100%', maxHeight: 320, objectFit: 'contain', display: 'block' }}
                />
              )}
              {previewMaterial.fileType === 'audio' && previewMaterial.thumbnail && (
                <div style={{ padding: '28px 24px', textAlign: 'center', background: '#111', width: '100%' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🎵</div>
                  <audio src={previewMaterial.thumbnail} controls style={{ width: '100%' }} />
                </div>
              )}
            </div>

            {/* 信息区：可滚动 */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>

              {/* 标签 */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#aaa', fontWeight: 600, letterSpacing: 0.8, marginBottom: 8 }}>标签</div>
                <Space wrap size={[6, 6]}>
                  <Tag color={getFileTypeColor(previewMaterial.fileType)} style={{ margin: 0 }}>{previewMaterial.fileType}</Tag>
                  {previewMaterial.tags?.filter(Boolean).map((tag: string) => (
                    <Tag key={tag} color="purple" style={{ margin: 0 }}>{tag}</Tag>
                  ))}
                </Space>
              </div>

              {/* 场景 */}
              {previewMaterial.scene && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: '#aaa', fontWeight: 600, letterSpacing: 0.8, marginBottom: 8 }}>场景</div>
                  <div style={{ fontSize: 13, color: '#555', lineHeight: 1.7, background: '#f7f8fa', borderRadius: 6, padding: '9px 12px' }}>
                    {previewMaterial.scene}
                  </div>
                </div>
              )}

              {/* 上传时间 */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#aaa', fontWeight: 600, letterSpacing: 0.8, marginBottom: 8 }}>上传时间</div>
                <div style={{ fontSize: 13, color: '#888', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <ClockCircleOutlined />
                  {formatDate(previewMaterial.createdAt || previewMaterial.created_at)}
                </div>
              </div>

              {/* 逐字稿 */}
              {previewMaterial.note && (
                <div>
                  <div style={{ fontSize: 11, color: '#aaa', fontWeight: 600, letterSpacing: 0.8, marginBottom: 8 }}>逐字稿</div>
                  <div style={{
                    fontSize: 13, color: '#444', lineHeight: 2,
                    background: '#f7f8fa', borderRadius: 6, padding: '12px 14px',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                  }}>
                    {previewMaterial.note}
                  </div>
                </div>
              )}

            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}
