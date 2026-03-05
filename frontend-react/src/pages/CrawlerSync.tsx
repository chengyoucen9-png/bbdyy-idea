import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button, Card, Table, Input, message, Space, Tag, Popconfirm, Modal } from 'antd';
import {
  SearchOutlined, ReloadOutlined, DeleteOutlined, PlayCircleOutlined,
  SyncOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, MinusCircleOutlined, DownloadOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { materialsAPI } from '../api/client';
import api from '../api/client';

type DownloadStatus = 'pending' | 'downloading' | 'completed' | 'failed' | 'no_url';

const DOWNLOAD_STATUS_CONFIG: Record<DownloadStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending:     { label: '待下载', color: 'orange',  icon: <ClockCircleOutlined /> },
  downloading: { label: '下载中', color: 'blue',    icon: <SyncOutlined spin /> },
  completed:   { label: '已完成', color: 'success', icon: <CheckCircleOutlined /> },
  failed:      { label: '失败',   color: 'error',   icon: <CloseCircleOutlined /> },
  no_url:      { label: '无链接', color: 'default', icon: <MinusCircleOutlined /> },
};

// 直接用原始 axios，避免拦截器丢失 total 等分页字段
const fetchImportedData = async (params: any): Promise<{ data: any[]; total: number; page: number; limit: number }> => {
  const token = localStorage.getItem('access_token');
  const response = await axios.get('/api/crawler/sync/imported-data', {
    params,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    timeout: 120000,
  });
  // 后端全局包装：{ code, message, data: { data: [...], total } }
  return response.data.data ?? response.data;
};

const syncAPI = {
  deleteMaterial: (id: number) => materialsAPI.delete(id),
};

export default function CrawlerSyncPage() {
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 100 });
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState('');
  const [downloadingIds, setDownloadingIds] = useState<Set<number>>(new Set());

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['imported-data', pagination.current, pagination.pageSize, searchText],
    queryFn: () => fetchImportedData({
      page: pagination.current,
      limit: pagination.pageSize,
      search: searchText,
    }),
  });

  // 有 pending/downloading 时每 5 秒自动刷新
  const rows: any[] = Array.isArray(data?.data) ? data.data : [];
  const hasActiveDownloads = rows.some(
    (item: any) => item.downloadStatus === 'pending' || item.downloadStatus === 'downloading'
  );
  useEffect(() => {
    if (!hasActiveDownloads) return;
    const timer = setInterval(() => refetch(), 5000);
    return () => clearInterval(timer);
  }, [hasActiveDownloads, refetch]);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => syncAPI.deleteMaterial(id),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['imported-data'] });
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || '删除失败');
    },
  });

  const retryDownloadMutation = useMutation({
    mutationFn: (id: number) => {
      setDownloadingIds(prev => new Set(prev).add(id));
      return api.post(`/crawler/sync/retry-download/${id}`);
    },
    onSuccess: (_, id) => {
      setDownloadingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      message.success('已开始下载');
      queryClient.invalidateQueries({ queryKey: ['imported-data'] });
    },
    onError: (err: any, id) => {
      setDownloadingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      message.error(err.response?.data?.message || '下载失败');
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: () => api.delete('/crawler/sync/clear-data'),
    onSuccess: () => {
      message.success('数据清空成功');
      queryClient.invalidateQueries({ queryKey: ['imported-data'] });
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || '清空数据失败');
    },
  });

  const handleSearch = () => {
    setPagination({ ...pagination, current: 1 });
    refetch();
  };

  const handleTableChange = (newPagination: any) => {
    setPagination({ current: newPagination.current, pageSize: newPagination.pageSize });
  };

  const handleClearAll = () => {
    if (window.confirm('确定要清空所有数据吗？此操作不可恢复！')) {
      clearAllMutation.mutate();
    }
  };

  const handleVideoPreview = (url: string) => {
    setCurrentVideoUrl(url);
    setVideoModalVisible(true);
  };

  const formatTimestamp = (timestamp: number | string) => {
    if (!timestamp) return '-';
    const ts = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;
    return new Date(ts).toLocaleString('zh-CN');
  };

  const formatNumber = (num: number) => {
    if (num === null || num === undefined) return '-';
    return num.toLocaleString();
  };

  const total = data?.total ?? 0;

  const columns = [
    {
      title: '序号',
      key: 'index',
      width: 50,
      render: (_: any, __: any, index: number) => (rows.length - index),
    },
    {
      title: '详情',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: '博主名称',
      dataIndex: 'authorName',
      key: 'authorName',
      width: 90,
      render: (text: string) => text || '-',
    },
    {
      title: '下载状态',
      dataIndex: 'downloadStatus',
      key: 'downloadStatus',
      width: 100,
      render: (status: DownloadStatus) => {
        const cfg = DOWNLOAD_STATUS_CONFIG[status] ?? DOWNLOAD_STATUS_CONFIG.no_url;
        return (
          <Tag icon={cfg.icon} color={cfg.color}>
            {cfg.label}
          </Tag>
        );
      },
    },
    {
      title: '附件',
      dataIndex: 'ossUrl',
      key: 'ossUrl',
      width: 100,
      render: (text: string) => {
        if (!text) return '-';
        return (
          <Button
            type="link"
            icon={<PlayCircleOutlined />}
            size="small"
            onClick={() => handleVideoPreview(text)}
            style={{ padding: 0 }}
          >
            预览
          </Button>
        );
      },
    },
    {
      title: '下载地址',
      dataIndex: 'downloadUrl',
      key: 'downloadUrl',
      width: 120,
      ellipsis: true,
      render: (text: string) => {
        if (!text) return '-';
        return (
          <a href={text} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12 }}>
            {text.length > 20 ? `${text.substring(0, 20)}...` : text}
          </a>
        );
      },
    },
    {
      title: '发布时间',
      dataIndex: 'publishTime',
      key: 'publishTime',
      width: 130,
      render: (timestamp: number) => formatTimestamp(timestamp),
    },
    {
      title: '点赞',
      dataIndex: 'likeCount',
      key: 'likeCount',
      width: 70,
      render: (num: number) => formatNumber(num),
    },
    {
      title: '评论',
      dataIndex: 'commentCount',
      key: 'commentCount',
      width: 70,
      render: (num: number) => formatNumber(num),
    },
    {
      title: '转发',
      dataIndex: 'shareCount',
      key: 'shareCount',
      width: 70,
      render: (num: number) => formatNumber(num),
    },
    {
      title: '收藏',
      dataIndex: 'collectCount',
      key: 'collectCount',
      width: 70,
      render: (num: number) => formatNumber(num),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 130,
      render: (text: string) => {
        if (!text) return '-';
        return new Date(text).toLocaleString('zh-CN');
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space>
          {record.downloadStatus === 'failed' && (
            <Button
              type="link"
              icon={<DownloadOutlined />}
              size="small"
              loading={downloadingIds.has(record.id)}
              onClick={() => retryDownloadMutation.mutate(record.id)}
            >
              下载
            </Button>
          )}
          <Popconfirm
            title="确定要删除这条数据吗？"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />} size="small">
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: '#f0f2f5' }}>
      <Card title="多维表格同步数据" style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Input
              placeholder="搜索名称、博主名称或详情"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
              style={{ width: 300 }}
              prefix={<SearchOutlined />}
            />
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
              搜索
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
              刷新
            </Button>
            <Button danger onClick={handleClearAll}>
              清空数据
            </Button>
          </Space>
          <Space>
            {hasActiveDownloads && (
              <Tag icon={<SyncOutlined spin />} color="blue">视频下载中，自动刷新</Tag>
            )}
            <Tag color="blue">共 {total} 条数据</Tag>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={rows}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `共 ${t} 条数据`,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          onChange={handleTableChange}
          scroll={{ x: 'max-content' }}
          size="small"
        />
      </Card>

      <Modal
        title="视频预览"
        open={videoModalVisible}
        onCancel={() => { setVideoModalVisible(false); setCurrentVideoUrl(''); }}
        footer={null}
        width={800}
        centered
      >
        <video
          src={currentVideoUrl}
          controls
          autoPlay
          style={{ width: '100%', maxHeight: '70vh' }}
        />
      </Modal>
    </div>
  );
}
