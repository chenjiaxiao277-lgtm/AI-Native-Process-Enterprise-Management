import React from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Alert, Typography } from 'antd';
import { useParams } from 'umi';

const WorkspaceSpaceHome: React.FC = () => {
  const params = useParams<{ id: string }>();
  return (
    <PageContainer>
      <Alert
        type="info"
        message="空间工作台（占位）"
        description={`当前空间：${params.id || '-'}`}
        showIcon
      />
      <Typography.Paragraph style={{ marginTop: 16 }}>
        这里后续接入空间内业务模块与工作台能力，本阶段仅保留入口壳子。
      </Typography.Paragraph>
    </PageContainer>
  );
};

export default WorkspaceSpaceHome;
