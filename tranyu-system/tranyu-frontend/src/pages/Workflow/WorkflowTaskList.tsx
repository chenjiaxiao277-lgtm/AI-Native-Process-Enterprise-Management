/**
 * 流程任务列表：待审批、已审批、全部流程，支持筛选、发起审批、跳转详情
 */
import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Tabs, Table, Tag, Button, Select, Modal, Form, Input, message } from 'antd';
import { EyeOutlined, PlusOutlined } from '@ant-design/icons';
import { history } from 'umi';
import { request } from '@/utils/request';

type Instance = {
  id: number;
  workflowId: number;
  bizType: string;
  bizId: number;
  bizTitle: string;
  status: string;
  initiatorId: string;
  initiatorName: string;
  createdAt: string;
};

type Res<T> = { code: number; message: string; data: T };

type WorkflowConfigType = { id: number; name: string; bizModule: string; enabled: number };

const STATUS_MAP: Record<string, { text: string; color: string }> = {
  running: { text: '审批中', color: 'processing' },
  completed: { text: '已通过', color: 'success' },
  rejected: { text: '已驳回', color: 'error' },
};

const BIZ_TYPE_MAP: Record<string, string> = {
  sales_project: '销售项目',
  delivery_project: '交付项目',
};

export default function WorkflowTaskListPage() {
  const [myTasks, setMyTasks] = useState<Instance[]>([]);
  const [allList, setAllList] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [approverId] = useState('1'); // 当前用户 ID，后续可从登录态取
  const [startModalVisible, setStartModalVisible] = useState(false);
  const [workflowList, setWorkflowList] = useState<WorkflowConfigType[]>([]);
  const [form] = Form.useForm();

  const loadMyTasks = async () => {
    setLoading(true);
    try {
      const res = await request<Res<Instance[]>>('/api/workflow/process/my-tasks', {
        params: { approverId },
      });
      setMyTasks(res.code === 0 ? res.data || [] : []);
    } catch {
      setMyTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const loadList = async () => {
    setLoading(true);
    try {
      const res = await request<Res<Instance[]>>('/api/workflow/process/list', {
        params: { status: statusFilter || undefined },
      });
      setAllList(res.code === 0 ? res.data || [] : []);
    } catch {
      setAllList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyTasks();
  }, []);

  useEffect(() => {
    loadList();
  }, [statusFilter]);

  const openStartModal = async () => {
    const res = await request<Res<WorkflowConfigType[]>>('/api/workflow/config/list', { params: {} });
    setWorkflowList(res.code === 0 ? res.data || [] : []);
    form.resetFields();
    setStartModalVisible(true);
  };

  const handleStartProcess = async () => {
    const values = await form.validateFields();
    try {
      await request<Res<Instance>>('/api/workflow/process/start', {
        method: 'POST',
        body: JSON.stringify({
          workflowId: values.workflowId,
          bizType: values.bizType,
          bizId: values.bizId,
          bizTitle: values.bizTitle,
          initiatorId: approverId,
          initiatorName: '发起人',
        }),
      });
      message.success('已发起审批');
      setStartModalVisible(false);
      loadMyTasks();
      loadList();
    } catch (e: any) {
      message.error(e?.message || '发起失败');
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 72 },
    { title: '业务标题', dataIndex: 'bizTitle', ellipsis: true },
    {
      title: '业务类型',
      dataIndex: 'bizType',
      render: (v: string) => BIZ_TYPE_MAP[v] || v,
    },
    { title: '业务ID', dataIndex: 'bizId', width: 80 },
    {
      title: '状态',
      dataIndex: 'status',
      render: (v: string) => {
        const s = STATUS_MAP[v] || { text: v, color: 'default' };
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    { title: '发起人', dataIndex: 'initiatorName' },
    {
      title: '发起时间',
      dataIndex: 'createdAt',
      render: (v: string) => (v ? new Date(v).toLocaleString() : '-'),
    },
    {
      title: '操作',
      width: 100,
      render: (_: unknown, r: Instance) => (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => history.push(`/workflow/instance/${r.id}`)}>
          查看
        </Button>
      ),
    },
  ];

  return (
    <PageContainer
      title="流程任务"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openStartModal}>
          发起审批
        </Button>
      }
    >
      <Modal
        title="发起审批"
        open={startModalVisible}
        onCancel={() => setStartModalVisible(false)}
        onOk={handleStartProcess}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="workflowId" label="工作流" rules={[{ required: true }]}>
            <Select
              placeholder="选择工作流"
              options={workflowList.filter((w) => w.enabled === 1).map((w) => ({ label: w.name, value: w.id }))}
            />
          </Form.Item>
          <Form.Item name="bizType" label="业务类型" rules={[{ required: true }]}>
            <Select
              options={[
                { label: '销售项目', value: 'sales_project' },
                { label: '交付项目', value: 'delivery_project' },
              ]}
            />
          </Form.Item>
          <Form.Item name="bizId" label="业务数据ID" rules={[{ required: true }]}>
            <Input type="number" placeholder="如 1" />
          </Form.Item>
          <Form.Item name="bizTitle" label="业务标题" rules={[{ required: true }]}>
            <Input placeholder="如项目名称" />
          </Form.Item>
        </Form>
      </Modal>
      <Tabs
        items={[
          {
            key: 'pending',
            label: `待我审批 (${myTasks.length})`,
            children: (
              <Table
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={myTasks}
                pagination={false}
              />
            ),
          },
          {
            key: 'all',
            label: '全部流程',
            children: (
              <>
                <div style={{ marginBottom: 16 }}>
                  <Select
                    placeholder="按状态筛选"
                    allowClear
                    style={{ width: 160 }}
                    value={statusFilter || undefined}
                    onChange={setStatusFilter}
                    options={[
                      { label: '全部', value: '' },
                      { label: '审批中', value: 'running' },
                      { label: '已通过', value: 'completed' },
                      { label: '已驳回', value: 'rejected' },
                    ]}
                  />
                </div>
                <Table
                  rowKey="id"
                  loading={loading}
                  columns={columns}
                  dataSource={allList}
                  pagination={{ pageSize: 10 }}
                />
              </>
            ),
          },
        ]}
      />
    </PageContainer>
  );
}
