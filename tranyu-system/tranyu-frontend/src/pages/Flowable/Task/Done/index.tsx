/**
 * Flowable 已办任务：当前用户已处理的审批任务
 */
import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Table, message } from 'antd';
import { getDoneTasks, type TaskItem } from '@/services/flowable';

export default function FlowableDonePage() {
  const [list, setList] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getDoneTasks()
      .then((res) => {
        setList(res.code === 0 && res.data ? res.data : []);
      })
      .catch(() => message.error('加载失败'))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { title: '任务ID', dataIndex: 'id', ellipsis: true, width: 200 },
    { title: '任务名称', dataIndex: 'name' },
    { title: '流程实例ID', dataIndex: 'processInstanceId', ellipsis: true, width: 200 },
    { title: '开始时间', dataIndex: 'startTime', width: 180 },
    { title: '结束时间', dataIndex: 'endTime', width: 180 },
  ];

  return (
    <PageContainer title="已办任务">
      <Table rowKey="id" loading={loading} columns={columns} dataSource={list} pagination={false} />
    </PageContainer>
  );
}
