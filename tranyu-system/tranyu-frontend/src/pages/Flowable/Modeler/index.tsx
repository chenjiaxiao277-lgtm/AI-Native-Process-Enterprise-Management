/**
 * Flowable 流程设计器：嵌入 Flowable Modeler（需单独部署或使用公开演示地址）
 * 若本地未部署 Flowable Modeler，可在页面内配置地址（存 localStorage）或参考下方说明
 */
import React, { useMemo, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Alert, Button, Input, Space, message } from 'antd';

const STORAGE_KEY = 'tranyu_flowable_modeler_url';

export default function FlowableModelerPage() {
  const initialUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const fromStorage = window.localStorage.getItem(STORAGE_KEY);
    if (fromStorage) return fromStorage;
    const fromGlobal = (window as any).__FLOWABLE_MODELER_URL__;
    return typeof fromGlobal === 'string' ? fromGlobal : '';
  }, []);

  const [url, setUrl] = useState<string>(initialUrl);
  const [editingUrl, setEditingUrl] = useState<string>(initialUrl);

  if (url) {
    return (
      <PageContainer title="流程设计器">
        <Space style={{ marginBottom: 12 }} wrap>
          <Button
            onClick={() => {
              setUrl('');
              message.info('已退出嵌入模式，可重新配置地址');
            }}
          >
            重新配置地址
          </Button>
          <Button
            onClick={() => {
              if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer');
            }}
          >
            新窗口打开
          </Button>
        </Space>
        <iframe
          title="Flowable Modeler"
          src={url}
          style={{ width: '100%', height: 'calc(100vh - 120px)', border: 'none' }}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer title="流程设计器">
      <Alert
        type="warning"
        showIcon
        message="尚未配置 Flowable Modeler 地址"
        description={
          <div>
            <p>你可以直接在这里填入 Flowable Modeler 的访问地址（例如：`http://localhost:8081/flowable-modeler`）。</p>
            <p>保存后本页会自动以 iframe 嵌入。</p>
          </div>
        }
        style={{ marginBottom: 16 }}
      />

      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          style={{ width: 520, maxWidth: '100%' }}
          placeholder="请输入 Flowable Modeler 地址，例如 http://localhost:8081/flowable-modeler"
          value={editingUrl}
          onChange={(e) => setEditingUrl(e.target.value)}
          onPressEnter={() => {
            const v = editingUrl.trim();
            if (!v) return message.warning('请输入地址');
            if (typeof window !== 'undefined') {
              window.localStorage.setItem(STORAGE_KEY, v);
            }
            setUrl(v);
            message.success('已保存并加载设计器');
          }}
        />
        <Button
          type="primary"
          onClick={() => {
            const v = editingUrl.trim();
            if (!v) return message.warning('请输入地址');
            if (typeof window !== 'undefined') {
              window.localStorage.setItem(STORAGE_KEY, v);
            }
            setUrl(v);
            message.success('已保存并加载设计器');
          }}
        >
          保存并嵌入
        </Button>
        <Button
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.localStorage.removeItem(STORAGE_KEY);
            }
            setEditingUrl('');
            message.success('已清除');
          }}
        >
          清除
        </Button>
      </Space>

      <Alert
        type="info"
        showIcon
        message="集成说明"
        description={
          <div>
            <p>1. 推荐使用 Docker 一键启动（避免与后端 8080 冲突，映射到 8081）：</p>
            <pre style={{ background: '#fafafa', padding: 12, borderRadius: 6, overflowX: 'auto' }}>{`docker run --rm -p 8081:8080 flowable/all-in-one`}</pre>
            <p>2. 启动后访问：`http://localhost:8081/flowable-modeler`，默认账号密码：`admin / test`。</p>
            <p>3. 设计器中配置审批人：使用「用户ID」（对应 sys_user.id）或「组/角色ID」（对应 sys_role.id）。</p>
            <p>4. 部署流程：在「Flowable 流程 / 流程管理」页上传 BPMN 文件即可。</p>
          </div>
        }
        style={{ marginBottom: 16 }}
      />
      <Button type="primary" href="https://www.flowable.com/open-source/docs/bpmn/ch15-Applications#flowable-modeler" target="_blank" rel="noopener noreferrer">
        查看 Flowable Modeler 文档
      </Button>
    </PageContainer>
  );
}
