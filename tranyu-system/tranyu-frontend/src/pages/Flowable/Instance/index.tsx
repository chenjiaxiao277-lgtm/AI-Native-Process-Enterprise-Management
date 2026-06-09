/**
 * Flowable 流程实例：发起流程、运行中/历史实例列表、终止
 */
import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Button, Table, Select, Space, message, Modal, Input } from 'antd';
import { PlayCircleOutlined, StopOutlined } from '@ant-design/icons';
import {
  getProcessList,
  startInstance,
  getInstanceList,
  terminateInstance,
  type ProcessDefinitionItem,
  type InstanceItem,
} from '@/services/flowable';

export default function FlowableInstancePage() {
  const [processList, setProcessList] = useState<ProcessDefinitionItem[]>([]);
  const [running, setRunning] = useState<InstanceItem[]>([]);
  const [historic, setHistoric] = useState<InstanceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [startKey, setStartKey] = useState<string | null>(null);
  const [startModalVisible, setStartModalVisible] = useState(false);
  const [bizTitle, setBizTitle] = useState('');

  const loadProcessList = async () => {
    try {
      const res = await getProcessList();
      setProcessList(res.code === 0 && res.data ? res.data : []);
    } catch {
      message.error('加载流程列表失败');
    }
  };

  const loadInstances = async () => {
    setLoading(true);
    try {
      const res = await getInstanceList();
      if (res.code === 0 && res.data) {
        setRunning(res.data.running || []);
        setHistoric(res.data.historic || []);
      }
    } catch {
      message.error('加载实例列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProcessList();
    loadInstances();
  }, []);

  const handleStart = () => {
    if (!processList.length) {
      message.warning('请先部署流程');
      return;
    }
    setStartKey(processList[0].key);
    setStartModalVisible(true);
    setBizTitle('');
  };

  const handleStartOk = async () => {
    if (!startKey) return;
    try {
      const res = await startInstance({
        processDefinitionKey: startKey,
        variables: { bizTitle: bizTitle || undefined },
      });
      if (res.code === 0) {
        message.success('流程已发起');
        setStartModalVisible(false);
        loadInstances();
      } else {
        message.error(res.message || '发起失败');
      }
    } catch (e: any) {
      message.error(e?.message || '发起失败');
    }
  };

  const handleTerminate = (record: InstanceItem) => {
    Modal.confirm({
      title: '确认终止',
      content: '确定终止该流程实例？',
      onOk: async () => {
        try {
          await terminateInstance(record.id);
          message.success('已终止');
          loadInstances();
        } catch {
          message.error('终止失败');
        }
      },
    });
  };

  const runColumns = [
    { title: '实例ID', dataIndex: 'id', ellipsis: true, width: 260 },
    { title: '流程定义ID', dataIndex: 'processDefinitionId', ellipsis: true, width: 220 },
    { title: '当前节点', dataIndex: 'activityId', width: 120 },
    {
      title: '操作',
      width: 100,
      render: (_: any, r: InstanceItem) => (
        <Button type="link" size="small" danger icon={<StopOutlined />} onClick={() => handleTerminate(r)}>
          终止
        </Button>
      ),
    },
  ];

  const histColumns = [
    { title: '实例ID', dataIndex: 'id', ellipsis: true, width: 260 },
    { title: '流程定义ID', dataIndex: 'processDefinitionId', ellipsis: true, width: 220 },
    { title: '开始时间', dataIndex: 'startTime', width: 180 },
    { title: '结束时间', dataIndex: 'endTime', width: 180 },
    { title: '结束原因', dataIndex: 'deleteReason', ellipsis: true },
  ];

  return (
    <PageContainer title="流程实例">
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleStart}>
          发起流程
        </Button>
      </Space>

      <h4>运行中</h4>
      <Table
        rowKey="id"
        loading={loading}
        columns={runColumns}
        dataSource={running}
        pagination={false}
        style={{ marginBottom: 24 }}
      />

      <h4>已结束</h4>
      <Table rowKey="id" loading={loading} columns={histColumns} dataSource={historic} pagination={false} />

      <Modal
        title="发起流程"
        open={startModalVisible}
        onCancel={() => setStartModalVisible(false)}
        onOk={handleStartOk}
        okText="发起"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <span>流程定义：</span>
            <Select
              style={{ width: 260, marginLeft: 8 }}
              value={startKey}
              onChange={setStartKey}
              options={processList.map((p) => ({ label: `${p.name} (${p.key})`, value: p.key }))}
            />
          </div>
          <div>
            <span>业务标题：</span>
            <Input
              style={{ width: 260, marginLeft: 8 }}
              placeholder="选填"
              value={bizTitle}
              onChange={(e) => setBizTitle(e.target.value)}
            />
          </div>
        </Space>
      </Modal>
    </PageContainer>
  );
}
