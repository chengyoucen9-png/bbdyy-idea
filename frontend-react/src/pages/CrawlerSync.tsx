import { useState } from 'react';
import { Button, Card, Table, Input, message, Space, Tag, Popconfirm, Modal } from 'antd';
import { SearchOutlined, ReloadOutlined, DeleteOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { materialsAPI } from '../api/client';
import api from '../api/client';

const syncAPI = {
  getImportedData: async (params: any) => {
    const response = await api.get('/crawler/sync/imported-data', { params });
    return response; // api实例已经处理了响应数据
  },
  importData: (data: any) => api.post('/crawler/sync/import-data', data),
  deleteMaterial: (id: number) => materialsAPI.delete(id),
};

export default function CrawlerSyncPage() {
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['imported-data', pagination.current, pagination.pageSize, searchText],
    queryFn: async () => {
      const result = await syncAPI.getImportedData({
        page: pagination.current,
        limit: pagination.pageSize,
        search: searchText,
      });
      // 调试：打印数据结构
      console.log('Data received from API:', result);
      return result;
    },
  });

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

  const handleSearch = () => {
    setPagination({ ...pagination, current: 1 });
    refetch();
  };

  const handleTableChange = (newPagination: any) => {
    setPagination({
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

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

  const handleClearAll = () => {
    if (window.confirm('确定要清空所有数据吗？此操作不可恢复！')) {
      clearAllMutation.mutate();
    }
  };

  const handleVideoPreview = (url: string) => {
    setCurrentVideoUrl(url);
    setVideoModalVisible(true);
  };

  const handleVideoModalClose = () => {
    setVideoModalVisible(false);
    setCurrentVideoUrl('');
  };

  const formatTimestamp = (timestamp: number | string) => {
    if (!timestamp) return '-';
    const ts = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;
    const date = new Date(ts);
    return date.toLocaleString('zh-CN');
  };

  const formatNumber = (num: number) => {
    if (num === null || num === undefined) return '-';
    return num.toLocaleString();
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 50,
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
      title: '附件',
      dataIndex: 'ossUrl',
      key: 'ossUrl',
      width: 100,
      render: (text: string, record: any) => {
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
      width: 70,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space>
          <Popconfirm
            title="确定要删除这条数据吗？"
            onConfirm={() => handleDelete(record.id)}
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
            <Button type="danger" onClick={handleClearAll}>
              清空数据
            </Button>
          </Space>
          <Space>
            <Tag color="blue">共 {data?.total || 0} 条数据</Tag>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={Array.isArray(data?.data) ? data.data : []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: data?.total || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条数据`,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
          size="small"
        />
      </Card>

      <Modal
        title="视频预览"
        open={videoModalVisible}
        onCancel={handleVideoModalClose}
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