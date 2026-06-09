/**
 * Flowable 待办任务：当前用户待审批列表，支持通过/驳回/加签/减签
 */
import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Button, Table, Space, Input, message, Modal } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { getTodoTasks, approveTask, rejectTask, type TaskItem } from '@/services/flowable';
import { getUserInfo } from '@/utils/auth';

export default function FlowableTodoPage() {
  const [list, setList] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [actionTask, setActionTask] = useState<TaskItem | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getTodoTasks();
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

  const openModal = (task: TaskItem, type: 'approve' | 'reject') => {
    setActionTask(task);
    setActionType(type);
    setComment('');
  };

  const handleSubmit = async () => {
    if (!actionTask || !actionType) return;
    const user = getUserInfo();
    try {
      if (actionType === 'approve') {
        await approveTask({ taskId: actionTask.id, comment, variables: {} });
        message.success('已通过');
      } else {
        await rejectTask({ taskId: actionTask.id, comment });
        message.success('已驳回');
      }
      setActionTask(null);
      setActionType(null);
      load();
    } catch (e: any) {
      message.error(e?.message || '操作失败');
    }
  };

  const columns = [
    { title: '任务ID', dataIndex: 'id', ellipsis: true, width: 200 },
    { title: '任务名称', dataIndex: 'name' },
    { title: '流程实例ID', dataIndex: 'processInstanceId', ellipsis: true, width: 200 },
    { title: '创建时间', dataIndex: 'createTime', width: 180 },
    {
      title: '操作',
      width: 180,
      render: (_: any, r: TaskItem) => (
        <Space>
          <Button type="link" size="small" icon={<CheckOutlined />} onClick={() => openModal(r, 'approve')}>
            通过
          </Button>
          <Button type="link" size="small" danger icon={<CloseOutlined />} onClick={() => openModal(r, 'reject')}>
            驳回
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer title="待办任务">
      <Table rowKey="id" loading={loading} columns={columns} dataSource={list} pagination={false} />
      <Modal
        title={actionType === 'approve' ? '审批通过' : '驳回'}
        open={!!actionTask}
        onCancel={() => { setActionTask(null); setActionType(null); }}
        onOk={handleSubmit}
        okText={actionType === 'approve' ? '通过' : '驳回'}
        cancelButtonProps={{ style: { display: actionType === 'reject' ? undefined : undefined } }}
      >
        {actionTask && (
          <div>
            <p>任务：{actionTask.name}</p>
            <p style={{ marginTop: 8 }}>意见：</p>
            <Input.TextArea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={actionType === 'approve' ? '选填' : '请填写驳回原因'}
            />
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}
