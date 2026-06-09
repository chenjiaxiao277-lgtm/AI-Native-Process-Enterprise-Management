import React, { useEffect, useRef, useState } from 'react';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  ModalForm,
  PageContainer,
  ProFormDateTimePicker,
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProTable,
} from '@ant-design/pro-components';
import { Button, message, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { history } from 'umi';
import {
  createTenant,
  disableTenant,
  enableTenant,
  listTenants,
  resetTenantAdmin,
  type TenantCreateRequest,
  type TenantItem,
  updateTenant,
} from '@/services/tenant';

const statusOptions = [
  { label: '启用', value: 1 },
  { label: '禁用', value: 0 },
];

const TenantList: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [defaultAdmin, setDefaultAdmin] = useState({
    adminUsername: '',
    adminPassword: '',
    adminRealName: '',
  });
  const [defaultAdminKey, setDefaultAdminKey] = useState(0);

  useEffect(() => {
    const raw = window.localStorage.getItem('platform_default_admin');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      setDefaultAdmin({
        adminUsername: parsed?.adminUsername || '',
        adminPassword: parsed?.adminPassword || '',
        adminRealName: parsed?.adminRealName || '',
      });
    } catch {
      // ignore invalid cache
    }
  }, []);

  const columns: ProColumns<TenantItem>[] = [
    { title: 'ID', dataIndex: 'id', width: 80, search: false },
    { title: '租户标识', dataIndex: 'tenantId' },
    { title: '租户名称', dataIndex: 'tenantName' },
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
    { title: '备注', dataIndex: 'remark', search: false },
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
            if (record.id) history.push(`/platform/tenants/${record.id}`);
          }}
        >
          详情
        </a>,
        <ModalForm<TenantCreateRequest>
          key="edit"
          title="编辑租户"
          trigger={<a>编辑</a>}
          initialValues={record}
          onFinish={async (values) => {
            if (!record.id) return true;
            await updateTenant(record.id, values);
            message.success('保存成功');
            actionRef.current?.reload();
            return true;
          }}
        >
          <ProFormText name="tenantName" label="租户名称" rules={[{ required: true }]} />
          <ProFormSelect name="status" label="状态" options={statusOptions} />
          <ProFormText name="remark" label="备注" />
          <ProFormDigit
            name="accountLimit"
            label="账号数上限"
            min={1}
            fieldProps={{ precision: 0 }}
            placeholder="不填则不限制"
          />
          <ProFormDateTimePicker name="adminExpireAt" label="管理到期时间" placeholder="不填则不过期" />
        </ModalForm>,
        <ModalForm<TenantCreateRequest>
          key="admin"
          title="设置租户管理员"
          trigger={<a>设置租户信息</a>}
          initialValues={{
            tenantId: record.tenantId,
            adminUsername: '',
            adminPassword: '',
            accountLimit: record.accountLimit,
            adminExpireAt: record.adminExpireAt,
          }}
          onFinish={async (values) => {
            if (!record.id) return true;
            if (!values.adminUsername || !values.adminPassword) {
              message.warning('请填写管理员账号与密码');
              return false;
            }
            try {
              await resetTenantAdmin(record.id, {
                adminUsername: values.adminUsername,
                adminPassword: values.adminPassword,
                adminRealName: values.adminRealName,
                accountLimit: values.accountLimit,
                adminExpireAt: values.adminExpireAt,
              });
              message.success('已更新租户管理员');
            } catch (error: any) {
              message.error(error?.message || '设置失败');
            }
            return true;
          }}
        >
          <ProFormText name="tenantId" label="租户标识" disabled />
          <ProFormText name="adminUsername" label="管理员账号" rules={[{ required: true }]} />
          <ProFormText.Password name="adminPassword" label="管理员密码" rules={[{ required: true }]} />
          <ProFormText name="adminRealName" label="管理员姓名" />
          <ProFormDigit
            name="accountLimit"
            label="账号数上限"
            min={1}
            fieldProps={{ precision: 0 }}
            placeholder="不填则不限制"
          />
          <ProFormDateTimePicker name="adminExpireAt" label="管理到期时间" placeholder="不填则不过期" />
        </ModalForm>,
        <a
          key="toggle"
          onClick={async () => {
            if (!record.id) return;
            if (record.status === 1) {
              await disableTenant(record.id);
              message.success('已禁用');
            } else {
              await enableTenant(record.id);
              message.success('已启用');
            }
            actionRef.current?.reload();
          }}
        >
          {record.status === 1 ? '禁用' : '启用'}
        </a>,
      ],
    },
  ];

  return (
    <PageContainer>
      <ProTable<TenantItem>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        search={{ labelWidth: 'auto' }}
        locale={{ emptyText: '暂无租户数据，可先点击“新建”创建' }}
        request={async () => {
          try {
            const resp = await listTenants();
            return {
              data: resp.data || [],
              success: resp.code === 0,
              total: resp.data?.length || 0,
            };
          } catch (error: any) {
            message.error(error?.message || '加载租户列表失败');
            return { data: [], success: false, total: 0 };
          }
        }}
        toolBarRender={() => [
          <ModalForm
            key="default-admin"
            title="设置默认管理员账号"
            trigger={<Button>设置默认管理员账号</Button>}
            initialValues={defaultAdmin}
            onFinish={async (values) => {
              if (!values.adminUsername || !values.adminPassword) {
                message.warning('请填写默认管理员账号与密码');
                return false;
              }
              const next = {
                adminUsername: values.adminUsername,
                adminPassword: values.adminPassword,
                adminRealName: values.adminRealName || '',
              };
              window.localStorage.setItem('platform_default_admin', JSON.stringify(next));
              setDefaultAdmin(next);
              setDefaultAdminKey((prev) => prev + 1);
              message.success('已更新默认管理员账号');
              return true;
            }}
          >
            <ProFormText name="adminUsername" label="默认管理员账号" rules={[{ required: true }]} />
            <ProFormText.Password name="adminPassword" label="默认管理员密码" rules={[{ required: true }]} />
            <ProFormText name="adminRealName" label="默认管理员姓名" />
          </ModalForm>,
          <ModalForm<TenantCreateRequest>
            key={`new-${defaultAdminKey}`}
            title="新建租户"
            trigger={
              <Button type="primary" icon={<PlusOutlined />}>
                新建
              </Button>
            }
            initialValues={{
              status: 1,
              adminUsername: defaultAdmin.adminUsername || undefined,
              adminPassword: defaultAdmin.adminPassword || undefined,
              adminRealName: defaultAdmin.adminRealName || undefined,
              accountLimit: undefined,
              adminExpireAt: undefined,
            }}
            onFinish={async (values) => {
              try {
                await createTenant(values);
                message.success('新建成功');
                actionRef.current?.reload();
            } catch (error: any) {
              message.error(error?.message || '新建失败');
            }
            return true;
          }}
          >
            <ProFormText name="tenantId" label="租户标识" rules={[{ required: true }]} />
            <ProFormText name="tenantName" label="租户名称" rules={[{ required: true }]} />
            <ProFormText
              name="adminUsername"
              label="租户管理员账号"
              rules={[{ required: true, message: '请输入租户管理员账号' }]}
            />
            <ProFormText.Password
              name="adminPassword"
              label="租户管理员密码"
              rules={[{ required: true, message: '请输入租户管理员密码' }]}
            />
            <ProFormText name="adminRealName" label="租户管理员姓名" />
            <ProFormDigit
              name="accountLimit"
              label="账号数上限"
              min={1}
              fieldProps={{ precision: 0 }}
              placeholder="不填则不限制"
            />
            <ProFormDateTimePicker name="adminExpireAt" label="管理到期时间" placeholder="不填则不过期" />
            <ProFormSelect name="status" label="状态" options={statusOptions} />
            <ProFormText name="remark" label="备注" />
          </ModalForm>,
        ]}
      />
    </PageContainer>
  );
};

export default TenantList;
