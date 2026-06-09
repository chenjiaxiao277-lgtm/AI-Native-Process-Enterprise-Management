import React, { useEffect, useMemo, useState } from 'react';
import { history } from 'umi';
import { PageContainer } from '@ant-design/pro-components';
import { Button, Card, Space, Switch, Typography, message } from 'antd';
import { AppstoreOutlined, SettingOutlined } from '@ant-design/icons';
import { fetchWorkItemPage, saveWorkItem, type WorkItemType } from '@/services/workItem';
import { withSpaceId } from '@/utils/space';

const SpaceNavConfigPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<WorkItemType[]>([]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await fetchWorkItemPage({ current: 1, pageSize: 200 });
      if (res.code !== 0) {
        message.error(res.message || '加载导航配置失败');
        return;
      }
      const list = (res.data.records || [])
        .filter((item) => item.deleted !== 1 && item.status === 1)
        .sort((a, b) => (a.sort || 0) - (b.sort || 0));
      setItems(list);
    } catch (e: any) {
      message.error(e?.message || '加载导航配置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const updateVisible = async (item: WorkItemType, checked: boolean) => {
    const res = await saveWorkItem({
      ...item,
      navEntryEnabled: checked ? 1 : 0,
    });
    if (res.code !== 0) {
      message.error(res.message || '更新失败');
      return;
    }
    message.success('已更新');
    setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, navEntryEnabled: checked ? 1 : 0 } : x)));
  };

  const cardItems = useMemo(
    () =>
      items.map((item) => ({
        key: String(item.id),
        title: item.typeName,
        desc: item.description || `工作项类型编码：${item.typeCode}`,
        visible: item.navEntryEnabled === 1,
      })),
    [items],
  );

  return (
    <PageContainer
      title="导航配置"
      subTitle="控制当前空间下工作项是否展示在导航栏"
      extra={[
        <Button key="back" onClick={() => history.push(withSpaceId('/space/config'))}>
          返回空间配置
        </Button>,
      ]}
    >
      <Card loading={loading}>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {cardItems.map((item) => (
            <Card
              key={item.key}
              size="small"
              bodyStyle={{ padding: 14 }}
              style={{ borderRadius: 10 }}
            >
              <Space style={{ width: '100%', justifyContent: 'space-between' }} align="start">
                <Space align="start">
                  <AppstoreOutlined style={{ marginTop: 4 }} />
                  <div>
                    <Typography.Text strong>{item.title}</Typography.Text>
                    <br />
                    <Typography.Text type="secondary">{item.desc}</Typography.Text>
                  </div>
                </Space>
                <Switch
                  checkedChildren="可见"
                  unCheckedChildren="隐藏"
                  checked={item.visible}
                  onChange={(checked) => {
                    const raw = items.find((x) => String(x.id) === item.key);
                    if (!raw) return;
                    updateVisible(raw, checked);
                  }}
                />
              </Space>
            </Card>
          ))}
          <Card size="small" bodyStyle={{ padding: 14 }} style={{ borderRadius: 10 }}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Space>
                <SettingOutlined />
                <Typography.Text strong>空间配置</Typography.Text>
              </Space>
              <Typography.Text type="secondary">固定显示在导航栏最下方</Typography.Text>
            </Space>
          </Card>
        </Space>
      </Card>
    </PageContainer>
  );
};

export default SpaceNavConfigPage;
