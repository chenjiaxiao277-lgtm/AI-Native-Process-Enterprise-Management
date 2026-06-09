/**
 * 模块列表页：表格 + 筛选/排序/分页 + 导入导出 + 操作（查看、编辑、删除）
 * 新建/编辑/详情 统一跳转到独立页面（标签页+扩展面板）
 */
import React, { useMemo, useRef } from 'react';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, Upload, message } from 'antd';
import { PlusOutlined, UploadOutlined, DownloadOutlined, EyeOutlined, EditOutlined } from '@ant-design/icons';
import { history } from 'umi';
import { request } from '@/utils/request';

export type CrudTableProps<T extends { id?: number | string }> = {
  title: string;
  apiBase: string;
  listPath: string; // 模块列表路径，如 /sales/customer，用于跳转 新建/详情/编辑
  columns: ProColumns<T>[];
  nameField?: string;
};

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

type SimpleResult<T> = { code: number; message: string; data: T };

export function CrudTable<T extends { id?: number | string }>(props: CrudTableProps<T>) {
  const actionRef = useRef<ActionType>();
  const base = props.listPath.replace(/\/$/, '');

  const mergedColumns: ProColumns<T>[] = useMemo(() => {
    const colBase = props.columns.map((c) => ({ sorter: c.sorter ?? true, ...c }));
    return [
      ...colBase,
      {
        title: '操作',
        valueType: 'option',
        width: 200,
        fixed: 'right',
        render: (_, record) => [
          <a
            key="view"
            onClick={() => history.push(`${base}/${record.id}`)}
          >
            <EyeOutlined /> 查看
          </a>,
          <a
            key="edit"
            onClick={() => history.push(`${base}/${record.id}/edit`)}
          >
            <EditOutlined /> 编辑
          </a>,
          <a
            key="del"
            onClick={async () => {
              if (!record.id) return;
              await request<SimpleResult<boolean>>(`${props.apiBase}/${record.id}`, { method: 'DELETE' });
              message.success('删除成功');
              actionRef.current?.reload();
            }}
          >
            删除
          </a>,
        ],
      },
    ];
  }, [props.columns, props.apiBase, base]);

  return (
    <PageContainer title={props.title}>
      <ProTable<T>
        actionRef={actionRef}
        rowKey="id"
        columns={mergedColumns}
        search={{ labelWidth: 'auto' }}
        pagination={{ pageSize: 10 }}
        request={async (params, sorter) => {
          const sortField = Object.keys(sorter || {})[0];
          const sortOrder = sortField ? (sorter as any)[sortField] : undefined;
          const resp = await request<PageResult<T>>(`${props.apiBase}/page`, {
            method: 'GET',
            params: {
              current: params.current,
              pageSize: params.pageSize,
              ...params,
              sortField,
              sortOrder,
            },
          });
          return {
            data: resp.data.records,
            total: resp.data.total,
            success: resp.code === 0,
          };
        }}
        toolBarRender={() => [
          <Upload
            key="import"
            showUploadList={false}
            beforeUpload={async (file) => {
              const fd = new FormData();
              fd.append('file', file);
              await fetch(`${props.apiBase}/import`, { method: 'POST', body: fd });
              message.success('导入成功');
              actionRef.current?.reload();
              return false;
            }}
          >
            <Button icon={<UploadOutlined />}>导入</Button>
          </Upload>,
          <Button
            key="export"
            icon={<DownloadOutlined />}
            onClick={() => window.open(`${props.apiBase}/export`, '_blank')}
          >
            导出
          </Button>,
          <Button
            key="new"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => history.push(`${base}/new`)}
          >
            新建
          </Button>,
        ]}
      />
    </PageContainer>
  );
}
