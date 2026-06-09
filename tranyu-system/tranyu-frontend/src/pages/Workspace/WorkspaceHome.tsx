import React from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Alert, Typography } from 'antd';

const WorkspaceHome: React.FC = () => {
  return (
    <PageContainer>
      <Alert
        type="info"
        message="空间工作台入口（占位）"
        description="当前为业务人员入口的最小壳子页面，后续在这里接入空间内业务工作台与配置模块。"
        showIcon
      />
      <Typography.Paragraph style={{ marginTop: 16 }}>
        下一步将逐步接入空间内业务页面，但本阶段不触碰泳道图/流程图/业务配置模块。
      </Typography.Paragraph>
    </PageContainer>
  );
};

export default WorkspaceHome;
