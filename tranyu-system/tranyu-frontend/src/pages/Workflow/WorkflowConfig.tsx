/**
 * 工作流配置页：模板列表、增删改查、启用/禁用、节点配置
 */
import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Button, Table, Tag, Space, Modal, Form, Input, Select, Switch, message, Card } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { request } from '@/utils/request';

type WorkflowConfigType = {
  id: number;
  name: string;
  bizModule: string;
  enabled: number;
  remark?: string;
  nodes?: WorkflowNodeType[];
};

type WorkflowNodeType = {
  id?: number;
  nodeName: string;
  nodeOrder: number;
  approverType: 'PERSON' | 'ROLE' | 'CUSTOM';
  approverIds: number[]; // 对应后端的逗号分隔 ID 串
  approvalMode: 'OR' | 'SIGN_ALL';
  allowAddSign?: number;
  allowRemoveSign?: number;
  rejectStrategy?: 'END' | 'BACK_TO_SUBMITTER' | 'BACK_TO_NODE';
  rejectNodeId?: number;
  formSchema?: string;
};

type Res<T> = { code: number; message: string; data: T };

const BIZ_MODULES = [
  { label: '销售项目管理', value: 'sales_project' },
  { label: '交付项目管理', value: 'delivery_project' },
];
const APPROVER_TYPES = [
  { label: '人员', value: 'PERSON' },
  { label: '角色', value: 'ROLE' },
  { label: '自定义', value: 'CUSTOM' },
];
const APPROVAL_MODES = [
  { label: '或签', value: 'OR' },
  { label: '会签', value: 'SIGN_ALL' },
];
const REJECT_STRATEGIES = [
  { label: '结束流程', value: 'END' },
  { label: '驳回到提交人', value: 'BACK_TO_SUBMITTER' },
  { label: '驳回到任意节点', value: 'BACK_TO_NODE' },
];

export default function WorkflowConfigPage() {
  const [list, setList] = useState<WorkflowConfigType[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<WorkflowConfigType | null>(null);
  const [form] = Form.useForm();

  const loadList = async (bizModule?: string) => {
    setLoading(true);
    try {
      const res = await request<Res<WorkflowConfigType[]>>('/api/workflow/config/list', { params: { bizModule } });
      setList(res.code === 0 ? res.data || [] : []);
    } catch (e) {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
  }, []);

  const [nodeList, setNodeList] = useState<WorkflowNodeType[]>([]);
  const [roleOptions, setRoleOptions] = useState<{ label: string; value: number }[]>([]);
  const [userOptions, setUserOptions] = useState<{ label: string; value: number }[]>([]);

  // 加载角色和用户，用于审批人选择
  useEffect(() => {
    request<Res<any[]>>('/api/system/roles/all')
      .then((res) => {
        if (res.code === 0 && Array.isArray(res.data)) {
          setRoleOptions(res.data.map((r: any) => ({ label: r.roleName, value: r.id })));
        }
      })
      .catch(() => {});

    request<Res<{ records: any[] }>>('/api/system/users/page', {
      params: { current: 1, pageSize: 200 },
    })
      .then((res) => {
        const records = (res.data as any)?.records;
        if (res.code === 0 && Array.isArray(records)) {
          setUserOptions(
            records.map((u: any) => ({
              label: u.realName || u.username,
              value: u.id,
            })),
          );
        }
      })
      .catch(() => {});
  }, []);

  const openAdd = () => {
    setEditing(null);
    setNodeList([]);
    form.setFieldsValue({ name: '', bizModule: 'sales_project', enabled: true, remark: '' });
    setModalVisible(true);
  };

  const openEdit = async (record: WorkflowConfigType) => {
    try {
      const res = await request<Res<WorkflowConfigType>>(`/api/workflow/config/${record.id}`);
      if (res.code !== 0 || !res.data) return;
      setEditing(res.data);
      setNodeList(
        (res.data.nodes || []).map((n) => ({
          id: n.id,
          nodeName: n.nodeName,
          nodeOrder: n.nodeOrder,
          approverType: (n.approverType as any) || 'PERSON',
          approverIds: typeof n.approverIds === 'string'
            ? (n.approverIds || '')
                .split(/[;,]/)
                .map((s: string) => s.trim())
                .filter((s: string) => s)
                .map((s: string) => Number(s))
            : [],
          approvalMode: ((n.approvalMode as any) || 'OR') as 'OR' | 'SIGN_ALL',
          allowAddSign: n.allowAddSign ?? 0,
          allowRemoveSign: n.allowRemoveSign ?? 0,
          rejectStrategy: (n.rejectStrategy as any) || 'END',
          rejectNodeId: n.rejectNodeId,
        })),
      );
      form.setFieldsValue({
        name: res.data.name,
        bizModule: res.data.bizModule,
        enabled: res.data.enabled === 1,
        remark: res.data.remark,
      });
      setModalVisible(true);
    } catch {
      message.error('加载详情失败');
    }
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    const nodes: WorkflowNodeType[] = nodeList.map((n, i) => ({
      id: n.id,
      nodeName: n.nodeName,
      nodeOrder: i + 1,
      approverType: n.approverType || 'PERSON',
      approverIds: (n.approverIds || []).join(','),
      approvalMode: n.approvalMode || 'OR',
      allowAddSign: n.allowAddSign ?? 0,
      allowRemoveSign: n.allowRemoveSign ?? 0,
      rejectStrategy: n.rejectStrategy || 'END',
      rejectNodeId: n.rejectStrategy === 'BACK_TO_NODE' ? n.rejectNodeId : undefined,
    }));
    try {
      await request<Res<WorkflowConfigType>>('/api/workflow/config/save', {
        method: 'POST',
        body: JSON.stringify({
          id: editing?.id,
          name: values.name,
          bizModule: values.bizModule,
          enabled: values.enabled ? 1 : 0,
          remark: values.remark,
          nodes: nodes.length ? nodes : undefined,
        }),
      });
      message.success('保存成功');
      setModalVisible(false);
      loadList();
    } catch {
      message.error('保存失败');
    }
  };

  const setEnabled = async (id: number, enabled: number) => {
    try {
      await request<Res<null>>(`/api/workflow/config/${id}/enabled`, {
        method: 'POST',
        body: JSON.stringify({ enabled }),
      });
      message.success(enabled ? '已启用' : '已禁用');
      loadList();
    } catch {
      message.error('操作失败');
    }
  };

  const handleDelete = (record: WorkflowConfigType) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定删除工作流「${record.name}」吗？`,
      onOk: async () => {
        try {
          await request<Res<null>>(`/api/workflow/config/${record.id}`, { method: 'DELETE' });
          message.success('已删除');
          loadList();
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 72 },
    { title: '名称', dataIndex: 'name' },
    {
      title: '关联业务',
      dataIndex: 'bizModule',
      render: (v: string) => BIZ_MODULES.find((b) => b.value === v)?.label || v,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      render: (v: number, r: WorkflowConfigType) => (
        <Tag color={v === 1 ? 'green' : 'default'}>{v === 1 ? '启用' : '禁用'}</Tag>
      ),
    },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
    {
      title: '操作',
      width: 220,
      render: (_: unknown, r: WorkflowConfigType) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => setEnabled(r.id, r.enabled === 1 ? 0 : 1)}
          >
            {r.enabled === 1 ? '禁用' : '启用'}
          </Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer title="工作流配置">
      <Button type="primary" icon={<PlusOutlined />} onClick={openAdd} style={{ marginBottom: 16 }}>
        新建工作流
      </Button>
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={list}
        pagination={false}
      />

      <Modal
        title={editing ? '编辑工作流' : '新建工作流'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSave}
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="工作流名称" rules={[{ required: true }]}>
            <Input placeholder="如：销售项目立项审批" />
          </Form.Item>
          <Form.Item name="bizModule" label="关联业务模块" rules={[{ required: true }]}>
            <Select options={BIZ_MODULES} />
          </Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>节点配置（按顺序执行）</div>
          {nodeList.map((n, i) => (
            <Card size="small" key={i} style={{ marginBottom: 8 }}>
              <Space wrap align="start">
                <Input
                  placeholder="节点名称"
                  value={n.nodeName}
                  onChange={(e) => {
                    const next = [...nodeList];
                    next[i] = { ...next[i], nodeName: e.target.value };
                    setNodeList(next);
                  }}
                  style={{ width: 140 }}
                />
                <Select
                  placeholder="审批人类型"
                  value={n.approverType}
                  onChange={(v) => {
                    const next = [...nodeList];
                    next[i] = {
                      ...next[i],
                      approverType: v as WorkflowNodeType['approverType'],
                      // 切换类型时清空已选审批人
                      approverIds: [],
                    };
                    setNodeList(next);
                  }}
                  options={APPROVER_TYPES}
                  style={{ width: 120 }}
                />
                <Select
                  placeholder="或签/会签"
                  value={n.approvalMode}
                  onChange={(v) => {
                    const next = [...nodeList];
                    next[i] = { ...next[i], approvalMode: v as WorkflowNodeType['approvalMode'] };
                    setNodeList(next);
                  }}
                  options={APPROVAL_MODES}
                  style={{ width: 110 }}
                />
                <Space direction="vertical" size={4}>
                  <Space>
                    <span>允许加签</span>
                    <Switch
                      checked={n.allowAddSign === 1}
                      onChange={(checked) => {
                        const next = [...nodeList];
                        next[i] = { ...next[i], allowAddSign: checked ? 1 : 0 };
                        setNodeList(next);
                      }}
                    />
                  </Space>
                  <Space>
                    <span>允许减签</span>
                    <Switch
                      checked={n.allowRemoveSign === 1}
                      onChange={(checked) => {
                        const next = [...nodeList];
                        next[i] = { ...next[i], allowRemoveSign: checked ? 1 : 0 };
                        setNodeList(next);
                      }}
                    />
                  </Space>
                </Space>
                {n.approverType === 'ROLE' && (
                  <Select
                    mode="multiple"
                    placeholder="选择角色"
                    value={n.approverIds}
                    onChange={(vals) => {
                      const next = [...nodeList];
                      next[i] = { ...next[i], approverIds: vals as number[] };
                      setNodeList(next);
                    }}
                    options={roleOptions}
                    style={{ minWidth: 200 }}
                    allowClear
                  />
                )}
                {n.approverType === 'PERSON' && (
                  <Select
                    mode="multiple"
                    placeholder="选择人员"
                    value={n.approverIds}
                    onChange={(vals) => {
                      const next = [...nodeList];
                      next[i] = { ...next[i], approverIds: vals as number[] };
                      setNodeList(next);
                    }}
                    options={userOptions}
                    style={{ minWidth: 220 }}
                    allowClear
                    showSearch
                    optionFilterProp="label"
                  />
                )}
                {n.approverType === 'CUSTOM' && (
                  <span style={{ color: '#999' }}>由发起人自定义审批人</span>
                )}
                <Select
                  placeholder="驳回策略"
                  value={n.rejectStrategy}
                  onChange={(v) => {
                    const next = [...nodeList];
                    next[i] = {
                      ...next[i],
                      rejectStrategy: v as WorkflowNodeType['rejectStrategy'],
                    };
                    setNodeList(next);
                  }}
                  options={REJECT_STRATEGIES}
                  style={{ width: 160 }}
                />
                {n.rejectStrategy === 'BACK_TO_NODE' && (
                  <Select
                    placeholder="驳回到节点"
                    value={n.rejectNodeId}
                    onChange={(v) => {
                      const next = [...nodeList];
                      next[i] = { ...next[i], rejectNodeId: v as number };
                      setNodeList(next);
                    }}
                    style={{ width: 160 }}
                    options={nodeList.map((node, idx) => ({
                      label: node.nodeName || `节点${idx + 1}`,
                      value: node.id ?? idx + 1,
                    }))}
                  />
                )}
                <Button
                  type="text"
                  danger
                  icon={<MinusCircleOutlined />}
                  onClick={() => setNodeList(nodeList.filter((_, j) => j !== i))}
                />
              </Space>
            </Card>
          ))}
          <Button
            type="dashed"
            block
            icon={<PlusOutlined />}
            onClick={() =>
              setNodeList([
                ...nodeList,
                {
                  nodeName: '',
                  nodeOrder: nodeList.length + 1,
                  approverType: 'PERSON',
                  approverIds: [],
                  approvalMode: 'OR',
                  allowAddSign: 0,
                  allowRemoveSign: 0,
                  rejectStrategy: 'END',
                },
              ])
            }
          >
            添加节点
          </Button>
        </div>
      </Modal>
    </PageContainer>
  );
}
