import React, { useRef, useState } from 'react';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ModalForm, PageContainer, ProFormSelect, ProFormText, ProTable } from '@ant-design/pro-components';
import { Button, message, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { history, useLocation } from 'umi';
import { getCurrentTenantId, getUserInfo } from '@/utils/auth';
import {
  archiveSpace,
  createSpace,
  listSpaces,
  type SpaceCreateRequest,
  type SpaceItem,
  updateSpace,
} from '@/services/space';

const statusOptions = [
  { label: '启用', value: 1 },
  { label: '禁用', value: 0 },
];

const SpaceList: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [currentTenantId, setCurrentTenantId] = useState<string>(getCurrentTenantId());
  const location = useLocation();
  const isEnterprise = location.pathname.startsWith('/enterprise');
  const currentUser = getUserInfo();

  const columns: ProColumns<SpaceItem>[] = [
    { title: 'ID', dataIndex: 'id', width: 80, search: false },
    {
      title: '租户标识',
      dataIndex: 'tenantId',
      renderFormItem: () => (
        <ProFormText
          name="tenantId"
          placeholder="请输入租户标识"
          fieldProps={{
            onChange: (e) => setCurrentTenantId(e.target.value),
          }}
        />
      ),
    },
    { title: '空间标识', dataIndex: 'spaceId' },
    { title: '空间名称', dataIndex: 'spaceName' },
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
    { title: '归档', dataIndex: 'archived', search: false, render: (_, r) => (r.archived === 1 ? '是' : '否') },
    { title: '描述', dataIndex: 'description', search: false },
    {
      title: '操作',
      valueType: 'option',
      render: (_, record) => [
        <a
          key="detail"
          onClick={() => {
            if (record.spaceId) history.push(`/platform/spaces/${record.spaceId}?tenantId=${record.tenantId || ''}`);
          }}
        >
          详情
        </a>,
        <ModalForm<SpaceCreateRequest>
          key="edit"
          title="编辑空间"
          trigger={<a>编辑</a>}
          initialValues={record}
          onFinish={async (values) => {
            if (!record.spaceId || !record.tenantId) return true;
            if (!record.tenantId && !values.tenantId) {
              message.warning(tenantIdPlaceholder);
              return false;
            }
            try {
              await updateSpace(record.spaceId, record.tenantId, values);
              message.success('保存成功');
              actionRef.current?.reload();
            } catch (error: any) {
              message.error(error?.message || '保存失败');
            }
            return true;
          }}
        >
          <ProFormText name="spaceName" label="空间名称" rules={[{ required: true }]} />
          <ProFormSelect name="status" label="状态" options={statusOptions} />
          <ProFormText name="description" label="描述" />
        </ModalForm>,
        <a
          key="archive"
          onClick={async () => {
            if (!record.spaceId || !record.tenantId) return;
            try {
              await archiveSpace(record.spaceId, record.tenantId);
              message.success('已归档');
              actionRef.current?.reload();
            } catch (error: any) {
              message.error(error?.message || '归档失败');
            }
          }}
        >
          归档
        </a>,
      ],
    },
  ];

  const tenantIdPlaceholder = '请先选择/输入租户ID';

  return (
    <PageContainer
      title="空间管理"
      breadcrumb={{
        items: [
          { path: isEnterprise ? '/enterprise/spaces' : '/platform/spaces', title: isEnterprise ? '企业管理' : '平台管理' },
          { title: '空间管理' },
        ],
      }}
    >
      <ProTable<SpaceItem>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        search={{ labelWidth: 'auto' }}
        locale={{ emptyText: '暂无空间数据，可先点击“新建”创建' }}
        form={{ initialValues: { tenantId: getCurrentTenantId() } }}
        request={async (params) => {
          const tenantId = (params.tenantId as string) || currentTenantId;
          if (!tenantId) {
            return { data: [], success: true, total: 0 };
          }
          try {
            const resp = await listSpaces(tenantId);
            return {
              data: resp.data || [],
              success: resp.code === 0,
              total: resp.data?.length || 0,
            };
          } catch (error: any) {
            message.error(error?.message || '加载空间列表失败');
            return { data: [], success: false, total: 0 };
          }
        }}
        toolBarRender={() => [
          <ModalForm<SpaceCreateRequest>
            key="new"
            title="新建空间"
            trigger={
              <Button type="primary" icon={<PlusOutlined />}>
                新建
              </Button>
            }
            initialValues={{ tenantId: getCurrentTenantId(), status: 1, ownerUserId: currentUser?.id }}
            onFinish={async (values) => {
              if (!values.tenantId) {
                message.warning(tenantIdPlaceholder);
                return false;
              }
              try {
                await createSpace(values);
                message.success('新建成功');
                actionRef.current?.reload();
              } catch (error: any) {
                message.error(error?.message || '新建失败');
              }
              return true;
            }}
          >
            <ProFormText name="tenantId" label="租户标识" rules={[{ required: true }]} />
            <ProFormText name="spaceId" label="空间标识" rules={[{ required: true }]} />
            <ProFormText name="spaceName" label="空间名称" rules={[{ required: true }]} />
            <ProFormText name="ownerUserId" label="空间负责人用户ID" rules={[{ required: true }]} />
            <ProFormSelect name="status" label="状态" options={statusOptions} />
            <ProFormText name="description" label="描述" />
          </ModalForm>,
        ]}
      />
    </PageContainer>
  );
};

export default SpaceList;
