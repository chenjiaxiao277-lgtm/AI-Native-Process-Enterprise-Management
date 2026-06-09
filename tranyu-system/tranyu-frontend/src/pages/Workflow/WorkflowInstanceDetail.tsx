/**
 * 流程实例详情：基本信息、审批轨迹（时间线）、审批操作（通过/驳回）
 */
import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Descriptions, Timeline, Button, Input, Radio, Space, message } from 'antd';
import { ArrowLeftOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useParams, history } from 'umi';
import { request } from '@/utils/request';

type RecordItem = {
  id: number;
  nodeName: string;
  approverName: string;
  action: string;
  comment?: string;
  createdAt: string;
};

type InstanceDetail = {
  id: number;
  workflowId: number;
  bizType: string;
  bizId: number;
  bizTitle: string;
  status: string;
  initiatorName: string;
  createdAt: string;
  records?: RecordItem[];
};

type Res<T> = { code: number; message: string; data: T };

const STATUS_TEXT: Record<string, string> = {
  running: '审批中',
  completed: '已通过',
  rejected: '已驳回',
};

const BIZ_TYPE_MAP: Record<string, string> = {
  sales_project: '销售项目',
  delivery_project: '交付项目',
};

export default function WorkflowInstanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<InstanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const approverId = '1';
  const approverName = '当前用户';

  const loadDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await request<Res<InstanceDetail>>(`/api/workflow/process/${id}`);
      setDetail(res.code === 0 ? res.data : null);
    } catch {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  const handleSubmit = async (act: 'approve' | 'reject') => {
    if (!id) return;
    setSubmitting(true);
    try {
      const url = act === 'approve' ? '/api/workflow/process/approve' : '/api/workflow/process/reject';
      await request<Res<null>>(url, {
        method: 'POST',
        body: JSON.stringify({
          instanceId: Number(id),
          approverId,
          approverName,
          comment: comment || (act === 'approve' ? '通过' : '驳回'),
        }),
      });
      message.success(act === 'approve' ? '已通过' : '已驳回');
      setComment('');
      loadDetail();
    } catch (e: any) {
      message.error(e?.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !detail) {
    return (
      <PageContainer title="流程详情">
        {loading ? '加载中…' : '流程不存在'}
      </PageContainer>
    );
  }

  const isRunning = detail.status === 'running';

  return (
    <PageContainer
      title={`流程详情 - ${detail.bizTitle || detail.id}`}
      extra={
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => history.push('/workflow/tasks')}>
          返回列表
        </Button>
      }
    >
      <Card title="基本信息" style={{ marginBottom: 16 }}>
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="业务类型">{BIZ_TYPE_MAP[detail.bizType] || detail.bizType}</Descriptions.Item>
          <Descriptions.Item label="业务标题">{detail.bizTitle || '-'}</Descriptions.Item>
          <Descriptions.Item label="业务ID">{detail.bizId}</Descriptions.Item>
          <Descriptions.Item label="状态">
            <span style={{ color: detail.status === 'rejected' ? '#ff4d4f' : detail.status === 'completed' ? '#52c41a' : undefined }}>
              {STATUS_TEXT[detail.status] || detail.status}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="发起人">{detail.initiatorName}</Descriptions.Item>
          <Descriptions.Item label="发起时间">
            {detail.createdAt ? new Date(detail.createdAt).toLocaleString() : '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="审批轨迹" style={{ marginBottom: 16 }}>
        {detail.records && detail.records.length > 0 ? (
          <Timeline
            items={detail.records.map((r) => ({
              color: r.action === 'approve' ? 'green' : 'red',
              children: (
                <div>
                  <div>
                    <strong>{r.nodeName}</strong> — {r.approverName} {r.action === 'approve' ? '通过' : '驳回'}
                  </div>
                  {r.comment ? <div style={{ color: '#666', marginTop: 4 }}>{r.comment}</div> : null}
                  <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                    {r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}
                  </div>
                </div>
              ),
            }))}
          />
        ) : (
          <div style={{ color: '#999' }}>暂无审批记录</div>
        )}
      </Card>

      {isRunning && (
        <Card title="审批操作">
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Radio.Group value={action} onChange={(e) => setAction(e.target.value)}>
              <Radio value="approve">通过</Radio>
              <Radio value="reject">驳回</Radio>
            </Radio.Group>
            <Input.TextArea
              placeholder="填写审批意见（选填）"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
            <Space>
              <Button type="primary" icon={<CheckOutlined />} onClick={() => handleSubmit('approve')} loading={submitting}>
                通过
              </Button>
              <Button danger icon={<CloseOutlined />} onClick={() => handleSubmit('reject')} loading={submitting}>
                驳回
              </Button>
            </Space>
          </Space>
        </Card>
      )}
    </PageContainer>
  );
}
