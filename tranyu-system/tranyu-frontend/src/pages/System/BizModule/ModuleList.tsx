import React, { useRef } from 'react';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable, ModalForm, ProFormText, ProFormSelect } from '@ant-design/pro-components';
import { Button, Tag, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { fetchBizModulePage, saveBizModule, changeBizModuleStatus, type BizModule } from '@/services/bizModule';

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

const bindTypeOptions = [
  { label: '绑定已有表', value: 'BIND_EXIST' },
  { label: '新建模块并自动建表', value: 'CREATE_NEW' },
];

const categoryOptions = [
  { label: '销售类(sales)', value: 'sales' },
  { label: '交付类(delivery)', value: 'delivery' },
  { label: '公共类(common)', value: 'common' },
];

const ModuleList: React.FC = () => {
  const actionRef = useRef<ActionType>();

  const columns: ProColumns<BizModule>[] = [
    { title: 'ID', dataIndex: 'id', width: 60, search: false },
    { title: '模块名称', dataIndex: 'moduleName' },
    { title: '模块编码', dataIndex: 'moduleCode' },
    {
      title: '分类',
      dataIndex: 'category',
      valueEnum: {
        sales: { text: '销售类' },
        delivery: { text: '交付类' },
        common: { text: '公共类' },
      },
    },
    { title: '表名', dataIndex: 'tableName' },
    {
      title: '绑定类型',
      dataIndex: 'bindType',
      valueEnum: {
        BIND_EXIST: { text: '绑定已有表' },
        CREATE_NEW: { text: '新建模块' },
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (_, r) => (
        <Tag color={r.status === 1 ? 'green' : 'default'}>{r.status === 1 ? '启用' : '禁用'}</Tag>
      ),
    },
    { title: '更新时间', dataIndex: 'updateTime', search: false },
    // 简化：当前版本先通过工具栏弹窗新建，不提供行内编辑按钮
  ];

  return (
    <PageContainer title="业务模块管理">
      <ProTable<BizModule>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        toolBarRender={() => [
          <ModalForm<BizModule>
            key="create"
            title="新建业务模块"
            trigger={
              <Button type="primary" icon={<PlusOutlined />}>
                新建
              </Button>
            }
            modalProps={{ destroyOnClose: true }}
            onFinish={async (values) => {
              await saveBizModule(values);
              message.success('保存成功');
              actionRef.current?.reload();
              return true;
            }}
          >
            <ProFormText name="moduleName" label="模块名称" rules={[{ required: true }]} />
            <ProFormText
              name="moduleCode"
              label="模块编码"
              rules={[{ required: true }]}
              extra="建议使用 path 形式，如 delivery/project"
            />
            <ProFormSelect
              name="category"
              label="模块分类"
              options={categoryOptions}
              rules={[{ required: true }]}
            />
            <ProFormText
              name="tableName"
              label="表名"
              rules={[{ required: true }]}
              extra="如 ltc_delivery_project"
            />
            <ProFormSelect
              name="bindType"
              label="绑定类型"
              options={bindTypeOptions}
              initialValue="BIND_EXIST"
              rules={[{ required: true }]}
            />
          </ModalForm>,
        ]}
        request={async (params) => {
          const res = await fetchBizModulePage({
            current: params.current || 1,
            pageSize: params.pageSize || 10,
            keyword: (params as any).moduleName,
          });
          const data = (res as PageResult<BizModule>).data;
          return {
            data: data.records,
            total: data.total,
            success: true,
          };
        }}
      />
    </PageContainer>
  );
};

export default ModuleList;

