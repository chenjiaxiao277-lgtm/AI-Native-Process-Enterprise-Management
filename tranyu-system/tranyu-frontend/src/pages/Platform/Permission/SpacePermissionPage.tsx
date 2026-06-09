import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Button, Space, Tabs, Typography, message } from 'antd';
import { getSpacePermission, updateSpacePermission } from '@/services/permission';
import { ProForm, ProFormText, ProFormTextArea } from '@ant-design/pro-components';
import { useLocation } from 'umi';
import { getCurrentTenantId } from '@/utils/auth';

const PermissionTab: React.FC<{
  label: string;
  type: string;
  tenantId: string;
  spaceId: string;
}> = ({ type, tenantId, spaceId }) => {
  const [summary, setSummary] = useState('');

  const loadData = async () => {
    if (!tenantId || !spaceId) {
      message.warning('请先输入租户ID与空间ID');
      return;
    }
    try {
      const resp = await getSpacePermission(spaceId, tenantId, type);
      setSummary(resp.data?.summary || '');
      message.success('已加载');
    } catch (error: any) {
      message.error(error?.message || '加载失败');
    }
  };

  const saveData = async () => {
    if (!tenantId || !spaceId) {
      message.warning('请先输入租户ID与空间ID');
      return;
    }
    try {
      await updateSpacePermission(spaceId, tenantId, type, { summary });
      message.success('保存成功');
    } catch (error: any) {
      message.error(error?.message || '保存失败');
    }
  };

  return (
    <ProForm submitter={false}>
      <ProFormTextArea
        name={`${type}-summary`}
        label="配置摘要"
        fieldProps={{
          rows: 8,
          value: summary,
          onChange: (e) => setSummary(e.target.value),
        }}
        placeholder="先保存最小摘要，后续再接权限结构"
      />
      <Space>
        <Button type="primary" onClick={saveData}>
          保存
        </Button>
        <Button onClick={loadData}>加载</Button>
      </Space>
    </ProForm>
  );
};

const SpacePermissionPage: React.FC = () => {
  const [tenantId, setTenantId] = useState('');
  const [spaceId, setSpaceId] = useState('');
  const location = useLocation();
  const isEnterprise = location.pathname.startsWith('/enterprise');

  useEffect(() => {
    const fromContext = getCurrentTenantId();
    if (!tenantId && fromContext) {
      setTenantId(fromContext);
    }
  }, []);

  return (
    <PageContainer
      title="空间权限配置"
      breadcrumb={{
        items: [
          { path: isEnterprise ? '/enterprise/permissions/space' : '/platform/permissions/space', title: isEnterprise ? '企业管理' : '平台管理' },
          { title: '权限管理' },
          { title: '空间权限' },
        ],
      }}
    >
      <Typography.Text type="secondary">
        当前仅做配置读写，不做权限裁决与生效。
      </Typography.Text>
      <ProForm submitter={false} style={{ marginTop: 16 }}>
        <ProFormText
          name="tenantId"
          label="租户标识"
          fieldProps={{ value: tenantId, onChange: (e) => setTenantId(e.target.value) }}
        />
        <ProFormText
          name="spaceId"
          label="空间标识"
          fieldProps={{ value: spaceId, onChange: (e) => setSpaceId(e.target.value) }}
        />
      </ProForm>
      <Tabs
        defaultActiveKey="basic"
        items={[
          {
            key: 'basic',
            label: '基础权限',
            children: <PermissionTab type="basic" label="基础权限" tenantId={tenantId} spaceId={spaceId} />,
          },
          {
            key: 'data',
            label: '数据权限',
            children: <PermissionTab type="data" label="数据权限" tenantId={tenantId} spaceId={spaceId} />,
          },
          {
            key: 'action',
            label: '操作权限',
            children: <PermissionTab type="action" label="操作权限" tenantId={tenantId} spaceId={spaceId} />,
          },
          {
            key: 'feature',
            label: '功能权限',
            children: <PermissionTab type="feature" label="功能权限" tenantId={tenantId} spaceId={spaceId} />,
          },
        ]}
      />
    </PageContainer>
  );
};

export default SpacePermissionPage;
