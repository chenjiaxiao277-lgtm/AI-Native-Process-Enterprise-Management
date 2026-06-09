import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Table, Select, Input, Switch, InputNumber, Button, Space, message } from 'antd';
import { fetchBizModulePage, fetchBizFields, saveBizFields, type BizModule, type BizField } from '@/services/bizModule';

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

const widgetTypeOptions = [
  { label: '文本', value: 'text' },
  { label: '数字', value: 'number' },
  { label: '日期', value: 'date' },
  { label: '日期时间', value: 'datetime' },
  { label: '下拉选择', value: 'select' },
  { label: '多行文本', value: 'textarea' },
];

const FieldConfig: React.FC = () => {
  const [modules, setModules] = useState<BizModule[]>([]);
  const [currentModuleId, setCurrentModuleId] = useState<number | undefined>();
  const [fields, setFields] = useState<BizField[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBizModulePage({ current: 1, pageSize: 100 }).then((res) => {
      const data = (res as PageResult<BizModule>).data.records;
      setModules(data);
      if (data.length && !currentModuleId) {
        setCurrentModuleId(data[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (!currentModuleId) return;
    setLoading(true);
    fetchBizFields(currentModuleId)
      .then((res) => {
        if (res.code === 0 && res.data) setFields(res.data);
      })
      .finally(() => setLoading(false));
  }, [currentModuleId]);

  const updateField = (index: number, patch: Partial<BizField>) => {
    setFields((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const handleSave = async () => {
    if (!currentModuleId) return;
    await saveBizFields(currentModuleId, fields);
    message.success('字段配置已保存');
  };

  const columns = [
    { title: '字段编码', dataIndex: 'fieldCode', render: (_: any, r: BizField, idx: number) => (
      <Input value={r.fieldCode} onChange={(e) => updateField(idx, { fieldCode: e.target.value })} />
    ) },
    { title: '字段名称', dataIndex: 'fieldName', render: (_: any, r: BizField, idx: number) => (
      <Input value={r.fieldName} onChange={(e) => updateField(idx, { fieldName: e.target.value })} />
    ) },
    { title: '列名', dataIndex: 'columnName', render: (_: any, r: BizField, idx: number) => (
      <Input value={r.columnName} onChange={(e) => updateField(idx, { columnName: e.target.value })} />
    ) },
    { title: '控件类型', dataIndex: 'widgetType', render: (_: any, r: BizField, idx: number) => (
      <Select
        style={{ width: 120 }}
        options={widgetTypeOptions}
        value={r.widgetType}
        onChange={(v) => updateField(idx, { widgetType: v })}
      />
    ) },
    { title: '列表显示', dataIndex: 'showInList', render: (_: any, r: BizField, idx: number) => (
      <Switch
        checked={r.showInList === 1}
        onChange={(checked) => updateField(idx, { showInList: checked ? 1 : 0 })}
      />
    ) },
    { title: '表单显示', dataIndex: 'showInForm', render: (_: any, r: BizField, idx: number) => (
      <Switch
        checked={r.showInForm === 1}
        onChange={(checked) => updateField(idx, { showInForm: checked ? 1 : 0 })}
      />
    ) },
    { title: '必填', dataIndex: 'isRequired', render: (_: any, r: BizField, idx: number) => (
      <Switch
        checked={r.isRequired === 1}
        onChange={(checked) => updateField(idx, { isRequired: checked ? 1 : 0 })}
      />
    ) },
    { title: '列表排序', dataIndex: 'listSort', render: (_: any, r: BizField, idx: number) => (
      <InputNumber
        value={r.listSort}
        onChange={(v) => updateField(idx, { listSort: v || 0 })}
      />
    ) },
    { title: '表单排序', dataIndex: 'formSort', render: (_: any, r: BizField, idx: number) => (
      <InputNumber
        value={r.formSort}
        onChange={(v) => updateField(idx, { formSort: v || 0 })}
      />
    ) },
  ];

  return (
    <PageContainer
      title="字段表单配置"
      extra={
        <Space>
          <span>选择模块：</span>
          <Select
            style={{ width: 260 }}
            value={currentModuleId}
            placeholder="请选择模块"
            options={modules.map((m) => ({ label: `${m.moduleName} (${m.moduleCode})`, value: m.id }))}
            onChange={(v) => setCurrentModuleId(v)}
          />
          <Button type="primary" onClick={handleSave}>
            保存配置
          </Button>
        </Space>
      }
    >
      <Table
        rowKey={(r: BizField) => (r.id || `${r.columnName}`)}
        loading={loading}
        columns={columns as any}
        dataSource={fields}
        pagination={false}
        size="small"
      />
    </PageContainer>
  );
};

export default FieldConfig;

