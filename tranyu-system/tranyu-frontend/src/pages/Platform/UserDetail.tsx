import React, { useEffect, useState } from 'react';
import { PageContainer, ProDescriptions } from '@ant-design/pro-components';
import { history, useLocation, useParams } from 'umi';
import { Button, Space, message } from 'antd';
import { disableUser, enableUser, getUser, type UserItem } from '@/services/user';

const UserDetail: React.FC = () => {
  const params = useParams<{ id: string }>();
  const location = useLocation();
  const isEnterprise = location.pathname.startsWith('/enterprise');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<UserItem | undefined>();

  const fetchData = async () => {
    if (!params.id) return;
    setLoading(true);
    try {
      const resp = await getUser(Number(params.id));
      setData(resp.data);
    } catch (error: any) {
      message.error(error?.message || '加载用户详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [params.id]);

  return (
    <PageContainer
      title="用户详情"
      breadcrumb={{
        items: [
          { path: isEnterprise ? '/enterprise/users' : '/platform/users', title: isEnterprise ? '企业管理' : '平台管理' },
          { title: '用户管理' },
          { title: '用户详情' },
        ],
      }}
      loading={loading}
      onBack={() => history.push(isEnterprise ? '/enterprise/users' : '/platform/users')}
      extra={
        <Space>
          <Button
            onClick={async () => {
              if (!data?.id) return;
              try {
                if (data.status === 1) {
                  await disableUser(data.id);
                } else {
                  await enableUser(data.id);
                }
                message.success('状态已更新');
                fetchData();
              } catch (error: any) {
                message.error(error?.message || '状态更新失败');
              }
            }}
          >
            {data?.status === 1 ? '禁用用户' : '启用用户'}
          </Button>
        </Space>
      }
    >
      <ProDescriptions<UserItem>
        loading={loading}
        column={2}
        dataSource={data}
        columns={[
          { title: '租户标识', dataIndex: 'tenantId' },
          { title: '用户名', dataIndex: 'username' },
          { title: '姓名', dataIndex: 'realName' },
          { title: '状态', dataIndex: 'status', valueEnum: { 1: '启用', 0: '禁用' } },
          { title: '手机号', dataIndex: 'phone' },
          { title: '邮箱', dataIndex: 'email' },
          { title: '创建时间', dataIndex: 'createTime' },
          { title: '更新时间', dataIndex: 'updateTime' },
        ]}
      />
    </PageContainer>
  );
};

export default UserDetail;
