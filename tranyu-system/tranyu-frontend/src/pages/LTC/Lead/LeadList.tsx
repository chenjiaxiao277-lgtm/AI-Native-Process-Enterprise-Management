import React from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';

type LeadItem = {
  id: string;
  name: string;
  createdAt: string;
};

const LeadList: React.FC = () => {
  return (
    <PageContainer>
      <ProTable<LeadItem>
        rowKey="id"
        search={false}
        pagination={{ pageSize: 10 }}
        columns={[
          { title: 'ID', dataIndex: 'id' },
          { title: '名称', dataIndex: 'name' },
          { title: '创建时间', dataIndex: 'createdAt' },
        ]}
        dataSource={[
          { id: '1', name: '示例线索', createdAt: '2026-03-05' },
        ]}
      />
    </PageContainer>
  );
};

export default LeadList;

