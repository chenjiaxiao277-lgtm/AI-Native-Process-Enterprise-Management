import React, { useRef } from 'react';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable, ModalForm, ProFormText, ProFormSelect } from '@ant-design/pro-components';
import { Button, Tag, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { request } from '@/utils/request';

type SysRole = {
  id?: number;
  roleName: string;
  roleCode: string;
  status?: number;
  description?: string;
  sort?: number;
  createTime?: string;
};

type SysUser = {
  id: number;
  username: string;
  realName?: string;
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

const RoleList: React.FC = () => {
  const actionRef = useRef<ActionType>();

  const saveRole = async (values: SysRole) => {
    const isEdit = !!values.id;
    const url = isEdit ? `/api/system/roles/${values.id}` : '/api/system/roles';
    const method = isEdit ? 'PUT' : 'POST';
    await request<SimpleResult<null>>(url, {
      method,
      body: JSON.stringify(values),
    });
    message.success(isEdit ? '保存成功' : '新建成功');
    actionRef.current?.reload();
  };

  const columns: ProColumns<SysRole>[] = [
    { title: 'ID', dataIndex: 'id', width: 60, search: false },
    { title: '角色名称', dataIndex: 'roleName' },
    { title: '角色编码', dataIndex: 'roleCode' },
    {
      title: '状态',
      dataIndex: 'status',
      valueEnum: {
        1: { text: '启用', status: 'Success' },
        0: { text: '禁用', status: 'Default' },
      },
      render: (_, r) => <Tag color={r.status === 1 ? 'green' : 'default'}>{r.status === 1 ? '启用' : '禁用'}</Tag>,
    },
    { title: '描述', dataIndex: 'description', search: false },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      search: false,
      render: (_, r) => (r.createTime ? new Date(r.createTime).toLocaleString() : '-'),
    },
    {
      title: '操作',
      valueType: 'option',
      width: 200,
      render: (_, record) => [
        <ModalForm<SysRole>
          key="edit"
          title="编辑角色"
          trigger={<a>编辑</a>}
          initialValues={record}
          onFinish={async (values) => {
            await saveRole({ ...record, ...values });
            return true;
          }}
        >
          <RoleFormFields isEdit />
        </ModalForm>,
        <a
          key="toggle"
          onClick={async () => {
            const newStatus = record.status === 1 ? 0 : 1;
            await request<SimpleResult<null>>(`/api/system/roles/${record.id}/status`, {
              method: 'POST',
              body: JSON.stringify({ status: newStatus }),
            });
            message.success('状态已更新');
            actionRef.current?.reload();
          }}
        >
          {record.status === 1 ? '禁用' : '启用'}
        </a>,
        <ModalForm
          key="users"
          title="关联用户"
          trigger={<a>查看用户</a>}
          submitter={false}
          modalProps={{ footer: null }}
        >
          <RoleUsers roleId={record.id!} />
        </ModalForm>,
      ],
    },
  ];

  return (
    <PageContainer>
      <ProTable<SysRole>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        search={{ labelWidth: 'auto' }}
        pagination={{ pageSize: 10 }}
        request={async (params) => {
          const resp = await request<PageResult<SysRole>>('/api/system/roles/page', {
            method: 'GET',
            params: {
              current: params.current,
              pageSize: params.pageSize,
              roleName: params.roleName,
              roleCode: params.roleCode,
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
          <ModalForm<SysRole>
            key="new"
            title="新建角色"
            trigger={
              <Button type="primary" icon={<PlusOutlined />}>
                新建
              </Button>
            }
            onFinish={async (values) => {
              await saveRole(values);
              return true;
            }}
          >
            <RoleFormFields />
          </ModalForm>,
        ]}
      />
    </PageContainer>
  );
};

const RoleFormFields: React.FC<{ isEdit?: boolean }> = ({ isEdit }) => (
  <>
    <ProFormText
      name="roleName"
      label="角色名称"
      rules={[{ required: true, message: '请输入角色名称' }]}
    />
    <ProFormText
      name="roleCode"
      label="角色编码"
      disabled={isEdit}
      rules={[{ required: true, message: '请输入角色编码' }]}
    />
    <ProFormSelect
      name="status"
      label="状态"
      options={[
        { label: '启用', value: 1 },
        { label: '禁用', value: 0 },
      ]}
      initialValue={1}
    />
    <ProFormText name="description" label="描述" />
  </>
);

const RoleUsers: React.FC<{ roleId: number }> = ({ roleId }) => {
  const [users, setUsers] = React.useState<SysUser[]>([]);

  React.useEffect(() => {
    request<SimpleResult<SysUser[]>>(`/api/system/roles/${roleId}/users`).then((res) => {
      if (res.code === 0 && res.data) setUsers(res.data);
    });
  }, [roleId]);

  return (
    <div>
      {users.length === 0 ? (
        <div>暂无关联用户</div>
      ) : (
        users.map((u) => (
          <div key={u.id}>
            {u.username}（{u.realName || '-'}）
          </div>
        ))
      )}
    </div>
  );
};

export default RoleList;

