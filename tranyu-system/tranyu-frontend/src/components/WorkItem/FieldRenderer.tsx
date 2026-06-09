import React from 'react';
import { DatePicker, Form, Input, InputNumber, Select, Switch } from 'antd';
import type { WorkItemField } from '@/services/workItem';
import {
  buildFieldFormRules,
  type FieldOptionItem,
  isFieldReadonly,
  parseFieldOptions,
} from '@/utils/workItemFieldMeta';
import WorkItemRichTextEditor from '@/components/WorkItem/WorkItemRichTextEditor';

export { isFieldRequired } from '@/utils/workItemFieldMeta';

function resolvePlaceholder(meta: ReturnType<typeof parseFieldOptions>, fallback: string): string {
  return meta.placeholder !== undefined && meta.placeholder !== null ? meta.placeholder : fallback;
}

export function renderWorkItemFieldFormItem(params: {
  field: WorkItemField;
  required?: boolean;
  label?: string;
  relationOptions?: FieldOptionItem[];
}): React.ReactNode {
  const { field, required, label, relationOptions } = params;
  const meta = parseFieldOptions(field);
  const rules = buildFieldFormRules(field, { required, label });
  const readOnly = isFieldReadonly(field);
  const common = { name: field.fieldKey, label: label || field.fieldName, rules };
  const ro = readOnly ? ({ disabled: true } as const) : {};

  switch (field.fieldType) {
    case 'text':
      return (
        <Form.Item key={field.fieldKey} {...common}>
          <Input
            placeholder={resolvePlaceholder(meta, '请输入')}
            maxLength={meta.maxLength}
            showCount={!!meta.maxLength}
            {...ro}
          />
        </Form.Item>
      );
    case 'textarea':
      return (
        <Form.Item key={field.fieldKey} {...common}>
          <Input.TextArea
            autoSize={{ minRows: 4, maxRows: 12 }}
            placeholder={resolvePlaceholder(meta, '请输入')}
            maxLength={meta.maxLength}
            showCount={!!meta.maxLength}
            {...ro}
          />
        </Form.Item>
      );
    case 'rich_text':
      return (
        <Form.Item key={field.fieldKey} {...common} getValueFromEvent={(v) => v}>
          <WorkItemRichTextEditor
            disabled={readOnly}
            placeholder={resolvePlaceholder(meta, '请输入内容')}
          />
        </Form.Item>
      );
    case 'number': {
      const isInt = meta.numberMode === 'integer';
      const precision = isInt ? 0 : meta.precision;
      return (
        <Form.Item key={field.fieldKey} {...common}>
          <InputNumber
            style={{ width: '100%' }}
            placeholder={resolvePlaceholder(meta, '请输入数值')}
            step={isInt ? 1 : undefined}
            min={meta.min}
            max={meta.max}
            precision={precision}
            {...ro}
          />
        </Form.Item>
      );
    }
    case 'switch':
      return (
        <Form.Item key={field.fieldKey} {...common} valuePropName="checked">
          <Switch {...ro} />
        </Form.Item>
      );
    case 'date':
      return (
        <Form.Item key={field.fieldKey} {...common}>
          <DatePicker style={{ width: '100%' }} {...ro} />
        </Form.Item>
      );
    case 'date_range':
      return (
        <Form.Item key={field.fieldKey} {...common}>
          <DatePicker.RangePicker style={{ width: '100%' }} {...ro} />
        </Form.Item>
      );
    case 'date_time':
      return (
        <Form.Item key={field.fieldKey} {...common}>
          <DatePicker showTime style={{ width: '100%' }} {...ro} />
        </Form.Item>
      );
    case 'single_select':
      return (
        <Form.Item key={field.fieldKey} {...common}>
          <Select allowClear options={meta.options} placeholder={resolvePlaceholder(meta, '请选择')} {...ro} />
        </Form.Item>
      );
    case 'multi_select':
      return (
        <Form.Item key={field.fieldKey} {...common}>
          <Select mode="multiple" allowClear options={meta.options} placeholder={resolvePlaceholder(meta, '请选择')} {...ro} />
        </Form.Item>
      );
    case 'member':
      return (
        <Form.Item key={field.fieldKey} {...common}>
          <Select
            showSearch
            allowClear
            mode="tags"
            maxCount={1}
            placeholder={resolvePlaceholder(meta, '输入成员名或邮箱')}
            {...ro}
          />
        </Form.Item>
      );
    case 'members':
      return (
        <Form.Item key={field.fieldKey} {...common}>
          <Select showSearch allowClear mode="tags" placeholder={resolvePlaceholder(meta, '输入成员名或邮箱')} {...ro} />
        </Form.Item>
      );
    case 'url':
      return (
        <Form.Item key={field.fieldKey} {...common}>
          <Input placeholder={resolvePlaceholder(meta, 'https://example.com')} {...ro} />
        </Form.Item>
      );
    case 'attachment':
      return (
        <Form.Item key={field.fieldKey} {...common}>
          <Input placeholder={resolvePlaceholder(meta, '请输入附件URL（MVP）')} {...ro} />
        </Form.Item>
      );
    case 'multi_attachment':
      return (
        <Form.Item key={field.fieldKey} {...common}>
          <Select mode="tags" allowClear placeholder={resolvePlaceholder(meta, '输入多个附件URL（MVP）')} {...ro} />
        </Form.Item>
      );
    case 'work_item_relation':
      return (
        <Form.Item key={field.fieldKey} {...common}>
          <Select
            showSearch
            allowClear
            options={relationOptions || []}
            placeholder={resolvePlaceholder(meta, '请选择关联工作项')}
            {...ro}
          />
        </Form.Item>
      );
    case 'work_item_relation_multi':
      return (
        <Form.Item key={field.fieldKey} {...common}>
          <Select
            mode="multiple"
            allowClear
            options={relationOptions || []}
            placeholder={resolvePlaceholder(meta, '请选择关联工作项')}
            {...ro}
          />
        </Form.Item>
      );
    case 'formula': {
      const rt = meta.formulaResultType || 'number';
      const ph =
        rt === 'boolean' ? '由公式自动计算（是/否）' : rt === 'text' ? '由公式自动计算' : '由公式自动计算（数值）';
      return (
        <Form.Item key={field.fieldKey} {...common}>
          <Input readOnly placeholder={ph} />
        </Form.Item>
      );
    }
    default:
      return (
        <Form.Item key={field.fieldKey} {...common}>
          <Input placeholder={resolvePlaceholder(meta, '请输入')} {...ro} />
        </Form.Item>
      );
  }
}
