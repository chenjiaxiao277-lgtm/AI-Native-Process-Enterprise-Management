import React, { useRef } from 'react';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable, ModalForm, ProFormText, ProFormSelect, ProFormTreeSelect } from '@ant-design/pro-components';
import { Button, message, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { request } from '@/utils/request';

type SysUser = {
  id?: number;
  username: string;
  realName?: string;
  deptId?: number;
  deptName?: string;
  status?: number;
  phone?: string;
  email?: string;
  gender?: number;
  roleIds?: number[];
  roleNames?: string[];
  createTime?: string;
};

type SysDept = {
  id: number;
  deptName: string;
  parentId: number;
  children?: SysDept[];
};

type SysRole = {
  id: number;
  roleName: string;
};

type PageResult<T> = {
  code: number;
  message: string;
  data: {
    records: T[];
    total: number;
    size: number;
    current: number;
    pages: number;
  };
};

type SimpleResult<T> = { code: number; message: string; data: T };

const statusOptions = [
  { label: '启用', value: 1 },
  { label: '禁用', value: 0 },
];

const UserList: React.FC = () => {
  const actionRef = useRef<ActionType>();

  const columns: ProColumns<SysUser>[] = [
    { title: 'ID', dataIndex: 'id', width: 60, search: false },
    { title: '登录名', dataIndex: 'username' },
    { title: '姓名', dataIndex: 'realName' },
    {
      title: '部门',
      dataIndex: 'deptName',
      search: false,
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueEnum: {
        1: { text: '启用', status: 'Success' },
        0: { text: '禁用', status: 'Default' },
      },
      render: (_, r) => <Tag color={r.status === 1 ? 'green' : 'default'}>{r.status === 1 ? '启用' : '禁用'}</Tag>,
    },
    {
      title: '角色',
      dataIndex: 'roleNames',
      search: false,
      render: (_, r) => (r.roleNames && r.roleNames.length ? r.roleNames.join('，') : '-'),
    },
    { title: '手机号', dataIndex: 'phone', search: false },
    { title: '邮箱', dataIndex: 'email', search: false },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      search: false,
      render: (_, r) => (r.createTime ? new Date(r.createTime).toLocaleString() : '-'),
    },
    {
      title: '操作',
      valueType: 'option',
      width: 180,
      render: (_, record) => [
        <ModalForm<SysUser>
          key="edit"
          title="编辑用户"
          trigger={<a>编辑</a>}
          initialValues={record}
          onFinish={async (values) => {
            await saveUser({ ...values, id: record.id });
            return true;
          }}
        >
          <UserFormFields isEdit />
        </ModalForm>,
        <a
          key="toggle"
          onClick={async () => {
            const newStatus = record.status === 1 ? 0 : 1;
            await request<SimpleResult<null>>(`/api/system/users/${record.id}/status`, {
              method: 'POST',
              body: JSON.stringify({ status: newStatus }),
            });
            message.success('状态已更新');
            actionRef.current?.reload();
          }}
        >
          {record.status === 1 ? '禁用' : '启用'}
        </a>,
        <a
          key="del"
          onClick={async () => {
            await request<SimpleResult<null>>(`/api/system/users/${record.id}`, { method: 'DELETE' });
            message.success('已删除');
            actionRef.current?.reload();
          }}
        >
          删除
        </a>,
      ],
    },
  ];

  const saveUser = async (values: any) => {
    const isEdit = !!values.id;
    const url = isEdit ? `/api/system/users/${values.id}` : '/api/system/users';
    const method = isEdit ? 'PUT' : 'POST';
    await request<SimpleResult<null>>(url, {
      method,
      body: JSON.stringify({
        username: values.username,
        realName: values.realName,
        deptId: values.deptId,
        status: values.status,
        phone: values.phone,
        email: values.email,
        gender: values.gender,
        roleIds: values.roleIds,
      }),
    });
    message.success(isEdit ? '保存成功' : '新建成功（默认密码 123456）');
    actionRef.current?.reload();
  };

  return (
    <PageContainer>
      <ProTable<SysUser>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        search={{ labelWidth: 'auto' }}
        pagination={{ pageSize: 10 }}
        request={async (params) => {
          const resp = await request<PageResult<SysUser>>('/api/system/users/page', {
            method: 'GET',
            params: {
              current: params.current,
              pageSize: params.pageSize,
              username: params.username,
              realName: params.realName,
              status: params.status,
            },
          });
          return {
            data: resp.data.records,
            total: resp.data.total,
            success: resp.code === 0,
          };
        }}
        toolBarRender={() => [
          <ModalForm<SysUser>
            key="new"
            title="新建用户"
            trigger={
              <Button type="primary" icon={<PlusOutlined />}>
                新建
              </Button>
            }
            onFinish={async (values) => {
              await saveUser(values);
              return true;
            }}
          >
            <UserFormFields />
          </ModalForm>,
        ]}
      />
    </PageContainer>
  );
};

const UserFormFields: React.FC<{ isEdit?: boolean }> = ({ isEdit }) => {
  const [depts, setDepts] = React.useState<SysDept[]>([]);
  const [roles, setRoles] = React.useState<SysRole[]>([]);

  React.useEffect(() => {
    request<SimpleResult<SysDept[]>>('/api/system/depts/tree').then((res) => {
      if (res.code === 0 && res.data) setDepts(res.data);
    });
    request<SimpleResult<SysRole[]>>('/api/system/roles/all').then((res) => {
      if (res.code === 0 && res.data) setRoles(res.data);
    });
  }, []);

  const buildDeptTree = (nodes: SysDept[]): any[] =>
    nodes.map((d) => ({
      title: d.deptName,
      value: d.id,
      key: d.id,
      children: d.children ? buildDeptTree(d.children) : undefined,
    }));

  return (
    <>
      <ProFormText
        name="username"
        label="登录名"
        disabled={isEdit}
        rules={[{ required: true, message: '请输入登录名' }]}
      />
      <ProFormText name="realName" label="姓名" rules={[{ required: true, message: '请输入姓名' }]} />
      <ProFormTreeSelect
        name="deptId"
        label="部门"
        fieldProps={{
          treeData: buildDeptTree(depts),
          allowClear: true,
          treeDefaultExpandAll: true,
        }}
      />
      <ProFormSelect
        name="status"
        label="状态"
        options={statusOptions}
        initialValue={1}
        rules={[{ required: true, message: '请选择状态' }]}
      />
      <ProFormText name="phone" label="手机号" />
      <ProFormText name="email" label="邮箱" />
      <ProFormSelect
        name="gender"
        label="性别"
        valueEnum={{
          1: '男',
          2: '女',
        }}
      />
      <ProFormSelect
        name="roleIds"
        label="角色"
        mode="multiple"
        options={roles.map((r) => ({ label: r.roleName, value: r.id }))}
      />
    </>
  );
};

export default UserList;

