/**
 * 模块详情/新增/编辑：标签页 + 扩展面板布局，便于后续字段扩展
 */
import React, { useEffect, useState } from 'react';
import { useParams, useLocation, history } from 'umi';
import { PageContainer } from '@ant-design/pro-components';
import { Tabs, Collapse, Descriptions, Form, Button, Spin, message } from 'antd';
import {
  ProFormText,
  ProFormDigit,
  ProFormDatePicker,
  ProFormSelect,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { ArrowLeftOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons';
import { getModuleConfig, getModuleKey } from '@/config/modules';
import type { ModuleMeta, FieldConfig } from '@/config/modules';
import { fetchBizModuleConfig, type BizField } from '@/services/bizModule';
import { request } from '@/utils/request';

type PageMode = 'new' | 'detail' | 'edit';

type SimpleResult<T> = { code: number; message: string; data: T };

function renderFormField(field: FieldConfig) {
  const { key, label, type = 'text', valueEnum, required } = field;
  const rules = required ? [{ required: true, message: '请输入' + label }] : undefined;
  const common = { name: key, label, ...(rules ? { rules } : {}) };
  switch (type) {
    case 'number':
      return <ProFormDigit key={key} {...common} fieldProps={{ precision: 2 }} />;
    case 'date':
      return <ProFormDatePicker key={key} {...common} />;
    case 'datetime':
      return <ProFormDatePicker key={key} {...common} showTime />;
    case 'select':
      return <ProFormSelect key={key} {...common} valueEnum={valueEnum || {}} />;
    case 'textarea':
      return <ProFormTextArea key={key} {...common} />;
    default:
      return <ProFormText key={key} {...common} />;
  }
}

function renderDetailItem(field: FieldConfig, value: any) {
  if (field.hideInDetail) return null;
  let display = value;
  if (field.valueEnum && value != null) display = field.valueEnum[String(value)] ?? value;
  if (field.type === 'date' || field.type === 'datetime') {
    try {
      if (value) display = new Date(value).toLocaleString();
    } catch (_) {}
  }
  return (
    <Descriptions.Item key={field.key} label={field.label}>
      {display ?? '-'}
    </Descriptions.Item>
  );
}

const ModuleFormPage: React.FC = () => {
  const location = useLocation();
  const params = useParams<{ id?: string }>();
  const pathname = location.pathname;

  const moduleKey = getModuleKey(pathname);
  const baseConfig = getModuleConfig(pathname);
  const [config, setConfig] = useState<ModuleMeta | null>(baseConfig);
  const isNew = pathname.endsWith('/new');
  const isEdit = pathname.endsWith('/edit');
  const id = params.id ? Number(params.id) : undefined;

  const mode: PageMode = isNew ? 'new' : isEdit ? 'edit' : id !== undefined ? 'detail' : 'new';

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Record<string, any> | null>(null);

  const listPath = `/${moduleKey}`;

  useEffect(() => {
    // 初始使用静态配置
    setConfig(baseConfig);
    // 动态覆盖表单字段（tabs/fields）
    fetchBizModuleConfig(moduleKey)
      .then((res) => {
        if (!baseConfig) return;
        if (res.code === 0 && res.data && res.data.fields && res.data.fields.length > 0) {
          const tabs = buildTabsFromFields(res.data.fields, baseConfig);
          setConfig({ ...baseConfig, tabs });
        }
      })
      .catch(() => {
        // 无配置时静默回退
      });
  }, [pathname, moduleKey]);

  function buildTabsFromFields(fields: BizField[], base: ModuleMeta): ModuleMeta['tabs'] {
    const visible = fields.filter((f) => f.showInForm === 1);
    if (!visible.length) return base.tabs;
    const mapped: FieldConfig[] = visible
      .sort((a, b) => (a.formSort || 0) - (b.formSort || 0))
      .map((f) => ({
        key: f.fieldCode,
        label: f.fieldName || f.fieldCode,
        type: widgetToFieldType(f.widgetType),
        required: f.isRequired === 1,
      }));
    return [
      {
        key: 'basic',
        label: '基本信息',
        panels: [
          {
            key: 'main',
            header: '主要信息',
            defaultExpand: true,
            fields: mapped,
          },
        ],
      },
    ];
  }

  function widgetToFieldType(widget?: string): FieldConfig['type'] {
    switch (widget) {
      case 'number':
        return 'number';
      case 'date':
        return 'date';
      case 'datetime':
        return 'datetime';
      case 'select':
        return 'select';
      case 'textarea':
        return 'textarea';
      default:
        return 'text';
    }
  }

  useEffect(() => {
    if (mode === 'detail' || mode === 'edit') {
      if (id == null) return;
      setLoading(true);
      request<SimpleResult<Record<string, any>>>(`${config!.apiBase}/${id}`)
        .then((res) => {
          setData(res.data);
          if (mode === 'edit') form.setFieldsValue(res.data);
        })
        .catch(() => message.error('加载失败'))
        .finally(() => setLoading(false));
    } else {
      setData({});
    }
  }, [config?.apiBase, id, mode]);

  const serializeValues = (raw: Record<string, any>): Record<string, any> => {
    const out = { ...raw };
    config!.tabs.forEach((tab) => {
      tab.panels.forEach((panel) => {
        panel.fields.forEach((f) => {
          const v = out[f.key];
          if (v == null) return;
          if (f.type === 'date' && v && typeof v.format === 'function') out[f.key] = v.format('YYYY-MM-DD');
          if (f.type === 'datetime' && v && typeof v.format === 'function') out[f.key] = v.format('YYYY-MM-DD HH:mm:ss');
        });
      });
    });
    return out;
  };

  const handleFinish = async (values: Record<string, any>) => {
    if (!config) return;
    const payload = serializeValues(values);
    setLoading(true);
    try {
      if (mode === 'edit' && id != null) {
        await request<SimpleResult<boolean>>(`${config.apiBase}/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        message.success('保存成功');
        history.replace(`/${moduleKey}/${id}`);
        setData({ ...data, ...payload });
      } else {
        const res = await request<SimpleResult<Record<string, any>>>(config.apiBase, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        message.success('新建成功');
        const newId = (res as any).data;
        history.replace(`/${moduleKey}/${typeof newId === 'number' ? newId : newId?.id ?? ''}`);
      }
    } catch (err: any) {
      const msg = err?.message || '保存失败';
      message.error(msg.length > 80 ? '保存失败：' + msg.slice(0, 80) + '…' : msg);
    } finally {
      setLoading(false);
    }
  };

  if (!config) {
    return (
      <PageContainer title="模块不存在">
        <Button onClick={() => history.push('/')}>返回首页</Button>
      </PageContainer>
    );
  }

  const title =
    mode === 'new'
      ? `新建${config.title}`
      : mode === 'edit'
        ? `编辑${config.title}`
        : (data && (data[config.nameField] as string)) || `详情 - ${config.title}`;

  const content = (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => history.push(listPath)}>
          返回列表
        </Button>
        {mode === 'detail' && data && (
          <Button
            type="primary"
            icon={<EditOutlined />}
            style={{ marginLeft: 8 }}
            onClick={() => history.push(`/${moduleKey}/${id}/edit`)}
          >
            编辑
          </Button>
        )}
      </div>

      {(mode === 'detail' || mode === 'edit') && !data ? (
        <Spin spinning tip="加载中…" />
      ) : mode === 'new' || mode === 'edit' ? (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          initialValues={mode === 'edit' ? data : undefined}
        >
          <Tabs
            defaultActiveKey={config.tabs[0]?.key}
            items={config.tabs.map((tab) => ({
              key: tab.key,
              label: tab.label,
              children: (
                <Collapse
                  defaultActiveKey={tab.panels.filter((p) => p.defaultExpand !== false).map((p) => p.key)}
                  items={tab.panels.map((panel) => ({
                    key: panel.key,
                    header: panel.header,
                    children: (
                      <div style={{ padding: '8px 0' }}>
                        {panel.fields.map((f) => renderFormField(f))}
                      </div>
                    ),
                  }))}
                />
              ),
            }))}
          />
          <div style={{ marginTop: 24 }}>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
              保存
            </Button>
            <Button style={{ marginLeft: 8 }} onClick={() => history.push(listPath)}>
              取消
            </Button>
          </div>
        </Form>
      ) : (
        <Tabs
          defaultActiveKey={config.tabs[0]?.key}
          items={config.tabs.map((tab) => ({
            key: tab.key,
            label: tab.label,
            children: (
              <Collapse
                defaultActiveKey={tab.panels.map((p) => p.key)}
                items={tab.panels.map((panel) => ({
                  key: panel.key,
                  header: panel.header,
                  children: (
                    <Descriptions column={1} bordered size="small">
                      {panel.fields.map((f) => renderDetailItem(f, data?.[f.key]))}
                    </Descriptions>
                  ),
                }))}
              />
            ),
          }))}
        />
      )}
    </>
  );

  return <PageContainer title={title}>{content}</PageContainer>;
}

export default ModuleFormPage;
