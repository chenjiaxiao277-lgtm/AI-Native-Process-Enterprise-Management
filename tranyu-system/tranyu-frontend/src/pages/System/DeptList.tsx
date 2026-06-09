import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Tree, Button, Modal, Form, Input, Select, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { request } from '@/utils/request';

type SysDept = {
  id: number;
  deptName: string;
  parentId: number;
  status?: number;
  sort?: number;
  children?: SysDept[];
};

type SimpleResult<T> = { code: number; message: string; data: T };

const DeptList: React.FC = () => {
  const [treeData, setTreeData] = useState<SysDept[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<SysDept | null>(null);
  const [form] = Form.useForm();

  const loadTree = async () => {
    setLoading(true);
    try {
      const res = await request<SimpleResult<SysDept[]>>('/api/system/depts/tree');
      setTreeData(res.code === 0 && res.data ? res.data : []);
    } catch {
      setTreeData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTree();
  }, []);

  const buildTreeNodes = (nodes: SysDept[]): any[] =>
    nodes.map((d) => ({
      title: `${d.deptName}${d.status === 0 ? '（禁用）' : ''}`,
      key: d.id,
      children: d.children ? buildTreeNodes(d.children) : undefined,
    }));

  const openAdd = (parentId: number) => {
    setEditing({ id: 0, deptName: '', parentId, status: 1, sort: 0 });
    form.setFieldsValue({ deptName: '', parentId, status: 1, sort: 0 });
    setModalVisible(true);
  };

  const openEdit = async (deptId: number) => {
    const res = await request<SimpleResult<SysDept>>(`/api/system/depts/${deptId}`);
    if (res.code !== 0 || !res.data) return;
    setEditing(res.data);
    form.setFieldsValue(res.data);
    setModalVisible(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    const isEdit = !!editing && editing.id !== 0;
    const url = isEdit ? `/api/system/depts/${editing!.id}` : '/api/system/depts';
    const method = isEdit ? 'PUT' : 'POST';
    await request<SimpleResult<null>>(url, {
      method,
      body: JSON.stringify(values),
    });
    message.success('保存成功');
    setModalVisible(false);
    loadTree();
  };

  const handleNodeClick = (deptId: number) => {
    Modal.confirm({
      title: '操作部门',
      content: '请选择操作：',
      okText: '编辑',
      cancelText: '新增子部门',
      onOk: () => openEdit(deptId),
      onCancel: () => openAdd(deptId),
    });
  };

  const handleDelete = (deptId: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后将逻辑标记为已删除，确定继续？',
      onOk: async () => {
        await request<SimpleResult<null>>(`/api/system/depts/${deptId}`, { method: 'DELETE' });
        message.success('已删除');
        loadTree();
      },
    });
  };

  return (
    <PageContainer>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openAdd(0)}>
          新建根部门
        </Button>
      </div>
      <Tree
        loading={loading as any}
        treeData={buildTreeNodes(treeData)}
        onSelect={(keys) => {
          const id = keys[0] as number | undefined;
          if (id) {
            Modal.confirm({
              title: '部门操作',
              content: '请选择操作：',
              okText: '编辑/新增子部门',
              cancelText: '删除',
              onOk: () => handleNodeClick(id),
              onCancel: () => handleDelete(id),
            });
          }
        }}
      />

      <Modal
        title={editing && editing.id !== 0 ? '编辑部门' : '新建部门'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSave}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="deptName" label="部门名称" rules={[{ required: true, message: '请输入部门名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="parentId" label="上级部门ID" rules={[{ required: true }]}>
            <Input type="number" />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue={1}>
            <Select
              options={[
                { label: '启用', value: 1 },
                { label: '禁用', value: 0 },
              ]}
            />
          </Form.Item>
          <Form.Item name="sort" label="排序" initialValue={0}>
            <Input type="number" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default DeptList;

