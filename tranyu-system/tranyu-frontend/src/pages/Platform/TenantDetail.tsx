import React, { useEffect, useState } from 'react';
import { PageContainer, ProDescriptions } from '@ant-design/pro-components';
import { Button, Space, Tabs, message } from 'antd';
import { history, useParams } from 'umi';
import {
  disableTenant,
  enableTenant,
  getTenant,
  type TenantItem,
} from '@/services/tenant';

const TenantDetail: React.FC = () => {
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TenantItem | undefined>();

  const fetchData = async () => {
    if (!params.id) return;
    setLoading(true);
    try {
      const resp = await getTenant(Number(params.id));
      setData(resp.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [params.id]);

  return (
    <PageContainer
      onBack={() => history.push('/platform/tenants')}
      extra={
        <Space>
          <Button
            onClick={async () => {
              if (!data?.id) return;
              if (data.status === 1) {
                await disableTenant(data.id);
                message.success('已禁用');
              } else {
                await enableTenant(data.id);
                message.success('已启用');
              }
              fetchData();
            }}
          >
            {data?.status === 1 ? '禁用租户' : '启用租户'}
          </Button>
        </Space>
      }
    >
      <Tabs
        items={[
          {
            key: 'basic',
            label: '基础信息',
            children: (
              <ProDescriptions<TenantItem>
                loading={loading}
                column={2}
                dataSource={data}
                columns={[
                  { title: '租户标识', dataIndex: 'tenantId' },
                  { title: '租户名称', dataIndex: 'tenantName' },
                  { title: '状态', dataIndex: 'status', valueEnum: { 1: '启用', 0: '禁用' } },
                  { title: '备注', dataIndex: 'remark' },
                  { title: '账号数上限', dataIndex: 'accountLimit', render: (_, record) => record.accountLimit ?? '-' },
                  { title: '管理到期时间', dataIndex: 'adminExpireAt' },
                  { title: '创建时间', dataIndex: 'createTime' },
                  { title: '更新时间', dataIndex: 'updateTime' },
                ]}
              />
            ),
          },
          {
            key: 'permissions',
            label: '权限配置入口',
            children: (
              <Space direction="vertical">
                <Button
                  type="primary"
                  onClick={() =>
                    history.push(`/platform/permissions/tenant-templates?tenantId=${data?.tenantId || ''}`)
                  }
                >
                  默认模板
                </Button>
                <Button
                  onClick={() =>
                    history.push(`/platform/permissions/tenant-features?tenantId=${data?.tenantId || ''}`)
                  }
                >
                  功能开关
                </Button>
              </Space>
            ),
          },
        ]}
      />
    </PageContainer>
  );
};

export default TenantDetail;
