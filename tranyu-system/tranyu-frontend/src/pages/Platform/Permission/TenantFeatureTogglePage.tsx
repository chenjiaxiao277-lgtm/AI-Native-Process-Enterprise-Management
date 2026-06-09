import React, { useEffect, useRef, useState } from 'react';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ModalForm, PageContainer, ProFormSelect, ProFormText, ProTable } from '@ant-design/pro-components';
import { Button, Input, message, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import {
  listTenantFeatureToggles,
  updateTenantFeatureToggle,
  type TenantFeatureToggleItem,
} from '@/services/permission';
import { useLocation } from 'umi';
import { getCurrentTenantId } from '@/utils/auth';

const statusOptions = [
  { label: '启用', value: 1 },
  { label: '禁用', value: 0 },
];

const TenantFeatureTogglePage: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [tenantId, setTenantId] = useState('');
  const location = useLocation();
  const isEnterprise = location.pathname.startsWith('/enterprise');

  useEffect(() => {
    const fromContext = getCurrentTenantId();
    if (!tenantId && fromContext) {
      setTenantId(fromContext);
    }
  }, []);

  const columns: ProColumns<TenantFeatureToggleItem>[] = [
    { title: 'ID', dataIndex: 'id', width: 80, search: false },
    { title: '功能键', dataIndex: 'featureKey' },
    { title: '状态', dataIndex: 'enabled', valueEnum: { 1: '启用', 0: '禁用' } },
    { title: '备注', dataIndex: 'remark', search: false },
    {
      title: '操作',
      valueType: 'option',
      render: (_, record) => [
          <ModalForm<TenantFeatureToggleItem>
            key="edit"
            title="编辑功能开关"
            trigger={<a>编辑</a>}
            initialValues={record}
            onFinish={async (values) => {
              if (!tenantId) return true;
              try {
                await updateTenantFeatureToggle(tenantId, values);
                message.success('保存成功');
                actionRef.current?.reload();
              } catch (error: any) {
                message.error(error?.message || '保存失败');
              }
              return true;
            }}
          >
            <ProFormText name="featureKey" label="功能键" rules={[{ required: true }]} />
            <ProFormSelect name="enabled" label="状态" options={statusOptions} />
            <ProFormText name="remark" label="备注" />
          </ModalForm>,
      ],
    },
  ];

  return (
    <PageContainer
      title="租户功能开关"
      breadcrumb={{
        items: [
          { path: isEnterprise ? '/enterprise/permissions/space' : '/platform/permissions/space', title: isEnterprise ? '企业管理' : '平台管理' },
          { title: '权限管理' },
          { title: '功能开关' },
        ],
      }}
    >
      <Space style={{ marginBottom: 16 }}>
        <Input
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
          placeholder="请输入租户标识"
          style={{ width: 240 }}
        />
        <Button
          type="primary"
          onClick={() => {
            if (!tenantId) {
              message.warning('请先选择/输入租户ID');
              return;
            }
            actionRef.current?.reload();
          }}
        >
          查询
        </Button>
      </Space>
      <ProTable<TenantFeatureToggleItem>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        search={false}
        request={async () => {
          if (!tenantId) return { data: [], success: true };
          try {
            const resp = await listTenantFeatureToggles(tenantId);
            return { data: resp.data || [], success: resp.code === 0 };
          } catch (error: any) {
            message.error(error?.message || '加载功能开关失败');
            return { data: [], success: false };
          }
        }}
        toolBarRender={() => [
          <ModalForm<TenantFeatureToggleItem>
            key="new"
            title="新建功能开关"
            trigger={
              <Button type="primary" icon={<PlusOutlined />}>
                新建
              </Button>
            }
            initialValues={{ enabled: 1 }}
            onFinish={async (values) => {
              if (!tenantId) {
                message.warning('请先选择/输入租户ID');
                return false;
              }
              try {
                await updateTenantFeatureToggle(tenantId, values);
                message.success('新建成功');
                actionRef.current?.reload();
              } catch (error: any) {
                message.error(error?.message || '新建失败');
              }
              return true;
            }}
          >
            <ProFormText name="featureKey" label="功能键" rules={[{ required: true }]} />
            <ProFormSelect name="enabled" label="状态" options={statusOptions} />
            <ProFormText name="remark" label="备注" />
          </ModalForm>,
        ]}
      />
    </PageContainer>
  );
};

export default TenantFeatureTogglePage;
