import React, { useEffect, useState } from 'react';
import { PageContainer, ProForm, ProFormText, ProFormTextArea } from '@ant-design/pro-components';
import { Button, message, Space } from 'antd';
import { getTenantDefaultTemplate, updateTenantDefaultTemplate } from '@/services/permission';
import { useLocation } from 'umi';
import { getCurrentTenantId } from '@/utils/auth';

const TenantDefaultTemplatePage: React.FC = () => {
  const [tenantId, setTenantId] = useState('');
  const [templateJson, setTemplateJson] = useState('');
  const location = useLocation();
  const isEnterprise = location.pathname.startsWith('/enterprise');

  useEffect(() => {
    const fromContext = getCurrentTenantId();
    if (!tenantId && fromContext) {
      setTenantId(fromContext);
    }
  }, []);

  const loadTemplate = async () => {
    if (!tenantId) {
      message.warning('请先选择/输入租户ID');
      return;
    }
    try {
      const resp = await getTenantDefaultTemplate(tenantId);
      setTemplateJson(resp.data?.templateJson || '');
      message.success('已加载');
    } catch (error: any) {
      message.error(error?.message || '加载失败');
    }
  };

  const saveTemplate = async () => {
    if (!tenantId) {
      message.warning('请先选择/输入租户ID');
      return;
    }
    try {
      await updateTenantDefaultTemplate(tenantId, { templateJson });
      message.success('保存成功');
    } catch (error: any) {
      message.error(error?.message || '保存失败');
    }
  };

  return (
    <PageContainer
      title="租户默认模板"
      breadcrumb={{
        items: [
          { path: isEnterprise ? '/enterprise/permissions/space' : '/platform/permissions/space', title: isEnterprise ? '企业管理' : '平台管理' },
          { title: '权限管理' },
          { title: '默认模板' },
        ],
      }}
    >
      <ProForm
        submitter={false}
        onValuesChange={(_, values) => {
          if (values.tenantId !== undefined) setTenantId(values.tenantId);
          if (values.templateJson !== undefined) setTemplateJson(values.templateJson);
        }}
        initialValues={{ tenantId: tenantId || getCurrentTenantId(), templateJson }}
      >
        <ProFormText name="tenantId" label="租户标识" placeholder="请输入租户标识" />
        <ProFormTextArea
          name="templateJson"
          label="默认模板配置"
          fieldProps={{ rows: 8 }}
          placeholder="JSON 或配置内容"
        />
        <Space>
          <Button type="primary" onClick={saveTemplate}>
            保存
          </Button>
          <Button onClick={loadTemplate}>加载</Button>
        </Space>
      </ProForm>
    </PageContainer>
  );
};

export default TenantDefaultTemplatePage;
