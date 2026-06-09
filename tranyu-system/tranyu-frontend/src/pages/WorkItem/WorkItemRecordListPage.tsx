import React, { useEffect, useMemo, useState } from 'react';
import { history, useParams } from 'umi';
import { PageContainer } from '@ant-design/pro-components';
import { Button, Card, Input, Popconfirm, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined } from '@ant-design/icons';
import {
  deleteWorkItemRecord,
  fetchWorkItemFields,
  fetchWorkItemRecordPage,
  fetchWorkItemSettings,
  type WorkItemField,
  type WorkItemRecord,
  type WorkItemType,
} from '@/services/workItem';
import { withSpaceId } from '@/utils/space';

const WorkItemRecordListPage: React.FC = () => {
  const params = useParams<{ workItemTypeId?: string }>();
  const workItemTypeId = Number(params.workItemTypeId);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<WorkItemRecord[]>([]);
  const [workItem, setWorkItem] = useState<WorkItemType | null>(null);
  const [fields, setFields] = useState<WorkItemField[]>([]);

  const enabledFields = useMemo(
    () => (fields || []).filter((f) => f.isEnabled !== 0).sort((a, b) => (a.sort || 0) - (b.sort || 0)).slice(0, 6),
    [fields],
  );

  const columns = useMemo<ColumnsType<WorkItemRecord>>(() => {
    const dynamicCols: ColumnsType<WorkItemRecord> = enabledFields.map((f) => ({
      title: f.fieldName,
      dataIndex: f.fieldKey,
      render: (v: any) => (v == null || v === '' ? '-' : String(v)),
    }));
    return [
      {
        title: '标题',
        dataIndex: 'title',
        render: (v: string, record) => (
          <Button type="link" onClick={() => history.push(withSpaceId(`/space/work-items/${workItemTypeId}/${record.id}`))}>
            {v || '-'}
          </Button>
        ),
      },
      ...dynamicCols,
      {
        title: '状态',
        dataIndex: 'status',
        render: (v: number) => (v === 1 ? <Tag color="green">打开</Tag> : <Tag>关闭</Tag>),
      },
      {
        title: '更新时间',
        dataIndex: 'updateTime',
        width: 180,
      },
      {
        title: '操作',
        dataIndex: 'action',
        width: 180,
        render: (_: any, record) => (
          <Space>
            <Button type="link" onClick={() => history.push(withSpaceId(`/space/work-items/${workItemTypeId}/${record.id}`))}>
              详情
            </Button>
            <Button type="link" onClick={() => history.push(withSpaceId(`/space/work-items/${workItemTypeId}/${record.id}/edit`))}>
              编辑
            </Button>
            <Popconfirm
              title="确认删除该记录？"
              onConfirm={async () => {
                if (!record.id) return;
                const res = await deleteWorkItemRecord(workItemTypeId, record.id);
                if (res.code !== 0) {
                  message.error(res.message || '删除失败');
                  return;
                }
                message.success('删除成功');
                loadRecords(current, pageSize, keyword);
              }}
            >
              <Button type="link" danger>
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ];
  }, [enabledFields, workItemTypeId, current, pageSize, keyword]);

  const loadRecords = async (c = current, s = pageSize, k = keyword) => {
    if (!workItemTypeId) return;
    setLoading(true);
    try {
      const res = await fetchWorkItemRecordPage(workItemTypeId, { current: c, pageSize: s, keyword: k });
      if (res.code !== 0) {
        message.error(res.message || '加载记录失败');
        return;
      }
      setRows(res.data.records || []);
      setTotal(res.data.total || 0);
      setCurrent(res.data.current || c);
      setPageSize(res.data.size || s);
    } catch (e: any) {
      message.error(e?.message || '加载记录失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!workItemTypeId) return;
    Promise.all([fetchWorkItemSettings(workItemTypeId), fetchWorkItemFields(workItemTypeId)])
      .then(([settingsRes, fieldRes]) => {
        if (settingsRes.code === 0) {
          setWorkItem(settingsRes.data);
        }
        if (fieldRes.code === 0) {
          setFields(fieldRes.data || []);
        }
      })
      .catch(() => {});
    loadRecords(1, pageSize, '');
  }, [workItemTypeId]);

  return (
    <PageContainer
      title={workItem?.typeName || '工作项列表'}
      subTitle="一级模块列表"
      extra={[
        <Button key="back" onClick={() => history.push(withSpaceId('/space/config'))}>
          返回空间配置
        </Button>,
        <Button
          key="new"
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => history.push(withSpaceId(`/space/work-items/${workItemTypeId}/new`))}
        >
          新建{workItem?.typeName || '工作项'}
        </Button>,
      ]}
    >
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Input.Search
            allowClear
            placeholder="按标题搜索"
            enterButton
            onSearch={(v) => {
              const k = v || '';
              setKeyword(k);
              loadRecords(1, pageSize, k);
            }}
            style={{ width: 320 }}
          />
          <Typography.Text type="secondary">共 {total} 条</Typography.Text>
        </Space>
        <Table<WorkItemRecord>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={{
            current,
            pageSize,
            total,
            onChange: (c, s) => loadRecords(c, s, keyword),
            showSizeChanger: true,
          }}
        />
      </Card>
    </PageContainer>
  );
};

export default WorkItemRecordListPage;
