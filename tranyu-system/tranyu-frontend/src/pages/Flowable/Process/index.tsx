/**
 * Flowable 流程管理：已部署流程列表、上传部署、删除、挂起/激活
 */
import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Button, Table, Tag, Space, Upload, message, Modal } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  getProcessList,
  deleteProcess,
  deployProcess,
  setProcessSuspended,
  type ProcessDefinitionItem,
} from '@/services/flowable';

export default function FlowableProcessPage() {
  const [list, setList] = useState<ProcessDefinitionItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getProcessList();
      setList(res.code === 0 && res.data ? res.data : []);
    } catch (e) {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDeploy = async (file: File) => {
    try {
      const res = await deployProcess(file);
      if (res.code === 0) {
        message.success('部署成功');
        load();
      } else {
        message.error(res.message || '部署失败');
      }
    } catch (e: any) {
      message.error(e?.message || '部署失败');
    }
  };

  const handleDelete = (record: ProcessDefinitionItem) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定删除流程「${record.name}」？将同时删除相关流程实例。`,
      onOk: async () => {
        try {
          await deleteProcess(record.deploymentId);
          message.success('已删除');
          load();
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  const handleSuspended = async (record: ProcessDefinitionItem) => {
    try {
      await setProcessSuspended(record.id, !record.suspended);
      message.success(record.suspended ? '已激活' : '已挂起');
      load();
    } catch {
      message.error('操作失败');
    }
  };

  const columns = [
    { title: '流程定义ID', dataIndex: 'id', ellipsis: true, width: 260 },
    { title: '名称', dataIndex: 'name' },
    { title: 'Key', dataIndex: 'key', width: 140 },
    { title: '版本', dataIndex: 'version', width: 80 },
    {
      title: '状态',
      dataIndex: 'suspended',
      width: 90,
      render: (suspended: boolean) => (
        <Tag color={suspended ? 'default' : 'green'}>{suspended ? '已挂起' : '有效'}</Tag>
      ),
    },
    {
      title: '操作',
      width: 200,
      render: (_: any, r: ProcessDefinitionItem) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleSuspended(r)}>
            {r.suspended ? '激活' : '挂起'}
          </Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer title="Flowable 流程管理">
      <Space style={{ marginBottom: 16 }}>
        <Upload
          accept=".bpmn20.xml,.bpmn,.zip,.bar"
          showUploadList={false}
          beforeUpload={(file) => {
            handleDeploy(file);
            return false;
          }}
        >
          <Button type="primary" icon={<PlusOutlined />}>
            部署流程（BPMN/ZIP）
          </Button>
        </Upload>
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={list}
        pagination={false}
      />
    </PageContainer>
  );
}
