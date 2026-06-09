import React, { useRef } from 'react';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ModalForm, PageContainer, ProFormSelect, ProFormText, ProTable } from '@ant-design/pro-components';
import { Button, message, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { history, useLocation } from 'umi';
import { getCurrentTenantId, getUserInfo } from '@/utils/auth';
import {
  createUser,
  disableUser,
  enableUser,
  listUsers,
  type UserCreateRequest,
  type UserItem,
  updateUser,
} from '@/services/user';

const statusOptions = [
  { label: '启用', value: 1 },
  { label: '禁用', value: 0 },
];

const spaceRoleOptions = [
  { label: '空间管理员', value: 'SPACE_OWNER' },
  { label: '空间普通用户', value: 'SPACE_USER' },
];

const UserList: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const location = useLocation();
  const isEnterprise = location.pathname.startsWith('/enterprise');
  const currentUser = getUserInfo();
  const currentTenantId = currentUser?.tenantId || getCurrentTenantId();

  const columns: ProColumns<UserItem>[] = [
    { title: 'ID', dataIndex: 'id', width: 80, search: false },
    { title: '租户标识', dataIndex: 'tenantId', search: !isEnterprise },
    { title: '用户名', dataIndex: 'username' },
    { title: '姓名', dataIndex: 'realName' },
    {
      title: '状态',
      dataIndex: 'status',
      valueEnum: {
        1: { text: '启用', status: 'Success' },
        0: { text: '禁用', status: 'Default' },
      },
      render: (_, record) => (
        <Tag color={record.status === 1 ? 'green' : 'default'}>{record.status === 1 ? '启用' : '禁用'}</Tag>
      ),
    },
    { title: '手机号', dataIndex: 'phone', search: false },
    { title: '邮箱', dataIndex: 'email', search: false },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      search: false,
      render: (_, record) => (record.createTime ? new Date(record.createTime).toLocaleString() : '-'),
    },
    {
      title: '操作',
      valueType: 'option',
      render: (_, record) => [
        <a
          key="detail"
          onClick={() => {
            if (record.id) history.push(`/platform/users/${record.id}`);
          }}
        >
          详情
        </a>,
        <ModalForm<UserCreateRequest>
          key="edit"
          title="编辑用户"
          trigger={<a>编辑</a>}
          initialValues={record}
          onFinish={async (values) => {
            if (!record.id) return true;
            if (!record.tenantId && !values.tenantId) {
              message.warning(tenantIdPlaceholder);
              return false;
            }
            try {
              await updateUser(record.id, values);
              message.success('保存成功');
              actionRef.current?.reload();
            } catch (error: any) {
              message.error(error?.message || '保存失败');
            }
            return true;
          }}
        >
          <ProFormText name="realName" label="姓名" />
          <ProFormSelect name="status" label="状态" options={statusOptions} />
          <ProFormText name="phone" label="手机号" />
          <ProFormText name="email" label="邮箱" />
        </ModalForm>,
        <a
          key="toggle"
          onClick={async () => {
            if (!record.id) return;
            try {
              if (record.status === 1) {
                await disableUser(record.id);
                message.success('已禁用');
              } else {
                await enableUser(record.id);
                message.success('已启用');
              }
              actionRef.current?.reload();
            } catch (error: any) {
              message.error(error?.message || '状态更新失败');
            }
          }}
        >
          {record.status === 1 ? '禁用' : '启用'}
        </a>,
      ],
    },
  ];

  const tenantIdPlaceholder = '请先选择/输入租户ID';

  return (
    <PageContainer
      title="用户管理"
      breadcrumb={{
        items: [
          { path: isEnterprise ? '/enterprise/users' : '/platform/users', title: isEnterprise ? '企业管理' : '平台管理' },
          { title: '用户管理' },
        ],
      }}
    >
      <ProTable<UserItem>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        search={{ labelWidth: 'auto' }}
        locale={{ emptyText: '暂无用户数据，可先点击“新建”创建' }}
        form={{ initialValues: { tenantId: currentTenantId } }}
        request={async (params) => {
          const tenantId = isEnterprise ? currentTenantId : (params.tenantId as string) || '';
          if (!tenantId) {
            return { data: [], success: true, total: 0 };
          }
          try {
            const resp = await listUsers({
              tenantId,
              username: params.username as string,
              realName: params.realName as string,
              status: params.status as number,
            });
            return {
              data: resp.data || [],
              success: resp.code === 0,
              total: resp.data?.length || 0,
            };
          } catch (error: any) {
            message.error(error?.message || '加载用户列表失败');
            return { data: [], success: false, total: 0 };
          }
        }}
        toolBarRender={() => [
          <ModalForm<UserCreateRequest>
            key="new"
            title="新建用户"
            trigger={
              <Button type="primary" icon={<PlusOutlined />}>
                新建
              </Button>
            }
            initialValues={{ tenantId: currentTenantId, status: 1 }}
            onFinish={async (values) => {
              const payload = isEnterprise ? { ...values, tenantId: currentTenantId } : values;
              if (!payload.tenantId) {
                message.warning(tenantIdPlaceholder);
                return false;
              }
              try {
                await createUser(payload);
                message.success('新建成功（默认密码 123456）');
                actionRef.current?.reload();
              } catch (error: any) {
                message.error(error?.message || '新建失败');
              }
              return true;
            }}
          >
            {!isEnterprise && (
              <ProFormText name="tenantId" label="租户标识" rules={[{ required: true }]} />
            )}
            <ProFormText name="username" label="用户名" rules={[{ required: true }]} />
            <ProFormText name="realName" label="姓名" />
            <ProFormSelect name="roleCode" label="空间角色类型" options={spaceRoleOptions} />
            <ProFormSelect name="status" label="状态" options={statusOptions} />
            <ProFormText name="phone" label="手机号" />
            <ProFormText name="email" label="邮箱" />
          </ModalForm>,
        ]}
      />
    </PageContainer>
  );
};

export default UserList;
