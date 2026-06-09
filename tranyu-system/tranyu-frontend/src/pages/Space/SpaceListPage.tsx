import React, { useMemo, useState } from 'react';
import { history } from 'umi';
import { Alert, Button, Card, Checkbox, Collapse, Divider, Drawer, Form, Input, List, Modal, Select, Space, Tag, Typography, Upload } from 'antd';
import { ArrowRightOutlined, SearchOutlined, CloseOutlined, UploadOutlined } from '@ant-design/icons';
import { STANDARD_SPACE_ICONS, addSpace, getSpaceList, switchSpaceWithRefresh, withSpaceId, type SpaceInfo } from '@/utils/space';

const SpaceListPage: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [managedOnly, setManagedOnly] = useState(false);
  const [spaces, setSpaces] = useState<SpaceInfo[]>(getSpaceList());
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm] = Form.useForm<{
    workArea: string;
    name: string;
    domain: string;
    icon: string;
    templateType: string;
    language: string;
    sampleViewsEnabled: boolean;
    sampleWorkItemsEnabled: boolean;
  }>();
  const selectedCreateIcon = Form.useWatch('icon', createForm);

  const { accessibleSpaces, inaccessibleSpaces } = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const filtered = spaces.filter((space) => {
      if (managedOnly && !space.manageable) return false;
      if (!kw) return true;
      return space.name.toLowerCase().includes(kw);
    });
    return {
      accessibleSpaces: filtered.filter((space) => space.accessible !== false),
      inaccessibleSpaces: filtered.filter((space) => space.accessible === false),
    };
  }, [spaces, keyword, managedOnly]);

  const openCreateSpace = () => {
    createForm.setFieldsValue({
      workArea: '大厂行业专版',
      name: '',
      domain: Math.random().toString(36).slice(2, 8),
      icon: STANDARD_SPACE_ICONS[0],
      templateType: '行业专版',
      language: '简体中文',
      sampleViewsEnabled: true,
      sampleWorkItemsEnabled: false,
    });
    setCreateOpen(true);
  };

  const submitCreateSpace = async () => {
    const values = await createForm.validateFields();
    const exists = spaces.some((space) => space.domain === values.domain);
    if (exists) {
      Modal.error({ title: '空间域名不可重复', content: '请修改后重试' });
      return;
    }
    setCreating(true);
    addSpace({
      name: values.name,
      icon: values.icon,
      workArea: values.workArea,
      domain: values.domain,
      templateType: values.templateType,
      language: values.language,
      sampleViewsEnabled: values.sampleViewsEnabled,
      sampleWorkItemsEnabled: values.sampleWorkItemsEnabled,
    });
    setSpaces(getSpaceList());
    setCreating(false);
    setCreateOpen(false);
    history.push(withSpaceId('/space/config'));
  };

  const enterSpace = (spaceId: string) => {
    switchSpaceWithRefresh(spaceId);
    history.push(withSpaceId('/space/config', spaceId));
  };

  const renderSpaceIcon = (icon?: string, dim = 32, bg = '#fff7e6') => {
    const isImage = !!icon && (icon.startsWith('data:image/') || icon.startsWith('http'));
    return (
      <div
        style={{
          width: dim,
          height: dim,
          borderRadius: 8,
          background: bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {isImage ? (
          <img src={icon} alt="space-icon" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span>{icon || '🥮'}</span>
        )}
      </div>
    );
  };

  const uploadCreateIcon = (file: File) => {
    if (!file.type.startsWith('image/')) return Upload.LIST_IGNORE;
    if (file.size > 2 * 1024 * 1024) return Upload.LIST_IGNORE;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') createForm.setFieldValue('icon', reader.result);
    };
    reader.readAsDataURL(file);
    return false;
  };

  return (
    <div style={{ padding: 20 }}>
      <Card
        title={
          <Space>
            <Typography.Text strong style={{ fontSize: 28 / 2 }}>
              空间列表
            </Typography.Text>
            <Typography.Text type="secondary">{spaces.length}</Typography.Text>
          </Space>
        }
        extra={<Button type="text" icon={<CloseOutlined />} onClick={() => history.push(withSpaceId('/space/config'))} />}
      >
        <Space style={{ width: '100%', justifyContent: 'flex-end', marginBottom: 16 }}>
          <Input
            style={{ width: 260 }}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            allowClear
            prefix={<SearchOutlined />}
            placeholder="搜索空间名称"
          />
          <Button type="primary" icon={<ArrowRightOutlined />} onClick={openCreateSpace}>
            新空间接入
          </Button>
        </Space>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <Checkbox checked={managedOnly} onChange={(e) => setManagedOnly(e.target.checked)}>
            我管理的空间
          </Checkbox>
        </div>

        <Collapse
          bordered={false}
          defaultActiveKey={['accessible']}
          items={[
            {
              key: 'accessible',
              label: <Typography.Text strong>可访问空间</Typography.Text>,
              children: (
                <List
                  dataSource={accessibleSpaces}
                  locale={{ emptyText: '暂无可访问空间' }}
                  renderItem={(space) => (
                    <List.Item
                      actions={[
                        <Button type="link" key="enter" onClick={() => enterSpace(space.id)}>
                          进入空间
                        </Button>,
                      ]}
                    >
                      <List.Item.Meta
                        avatar={
                          renderSpaceIcon(space.icon, 32, '#fff7e6')
                        }
                        title={space.name}
                        description={
                          <Space wrap>
                            {space.admins.slice(0, 2).map((admin) => (
                              <Tag key={admin}>{admin}</Tag>
                            ))}
                            {space.admins.length > 2 ? (
                              <Typography.Text type="secondary">+{space.admins.length - 2}</Typography.Text>
                            ) : null}
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              ),
            },
            {
              key: 'inaccessible',
              label: <Typography.Text strong>无访问权限空间</Typography.Text>,
              children: (
                <List
                  dataSource={inaccessibleSpaces}
                  locale={{ emptyText: '暂无无权限空间' }}
                  renderItem={(space) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={
                          renderSpaceIcon(space.icon, 32, '#f5f5f5')
                        }
                        title={space.name}
                        description="当前无权限访问"
                      />
                    </List.Item>
                  )}
                />
              ),
            },
          ]}
        />
      </Card>

      <Drawer
        title="创建空间"
        width={980}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        extra={<Button type="text" icon={<CloseOutlined />} onClick={() => setCreateOpen(false)} />}
        footer={
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={() => setCreateOpen(false)}>取消</Button>
            <Button type="primary" loading={creating} onClick={submitCreateSpace}>
              创建空间
            </Button>
          </Space>
        }
      >
        <Form form={createForm} layout="vertical">
          <Typography.Title level={4}>空间信息</Typography.Title>
          <Form.Item name="workArea" label="工作区" rules={[{ required: true }]}>
            <Select options={[{ label: '大厂行业专版', value: '大厂行业专版' }]} />
          </Form.Item>
          <Form.Item name="name" label="空间名称" rules={[{ required: true, message: '请输入空间名称' }]}>
            <Input placeholder="为你的空间取个名字" />
          </Form.Item>
          <Form.Item name="domain" label="空间域名" rules={[{ required: true, message: '请输入空间域名' }]}>
            <Input addonBefore="https://project.feishu.cn/" />
          </Form.Item>
          <Typography.Text type="secondary">
            空间域名创建后不可修改，且该域名不可重复使用
          </Typography.Text>
          <Form.Item name="icon" label="空间图标" style={{ marginTop: 12 }}>
            <div>
              <div style={{ marginBottom: 10 }}>
                {renderSpaceIcon(selectedCreateIcon, 72)}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(10, 1fr)',
                  gap: 8,
                  marginBottom: 10,
                  maxWidth: 560,
                }}
              >
                {STANDARD_SPACE_ICONS.map((icon) => (
                  <Button
                    key={icon}
                    style={{ width: 44, height: 44, borderRadius: 10, padding: 0 }}
                    type={selectedCreateIcon === icon ? 'primary' : 'default'}
                    onClick={() => createForm.setFieldValue('icon', icon)}
                  >
                    {icon}
                  </Button>
                ))}
              </div>
              <Upload showUploadList={false} beforeUpload={uploadCreateIcon} accept="image/png,image/jpeg,image/webp">
                <Button icon={<UploadOutlined />}>自定义上传</Button>
              </Upload>
            </div>
          </Form.Item>

          <Divider />
          <Typography.Title level={4}>配置与数据</Typography.Title>
          <Form.Item name="templateType" label="空间配置" rules={[{ required: true }]}>
            <Select
              options={[
                { label: '空白模板', value: '空白模板' },
                { label: '行业专版', value: '行业专版' },
              ]}
            />
          </Form.Item>
          <Form.Item name="language" label="模板语言" rules={[{ required: true }]}>
            <Select options={[{ label: '简体中文', value: '简体中文' }]} />
          </Form.Item>
          <Form.Item label="实例数据">
            <Space direction="vertical">
              <Form.Item name="sampleViewsEnabled" valuePropName="checked" noStyle>
                <Checkbox>视图（默认 17）</Checkbox>
              </Form.Item>
              <Form.Item name="sampleWorkItemsEnabled" valuePropName="checked" noStyle>
                <Checkbox>工作项实例</Checkbox>
              </Form.Item>
            </Space>
          </Form.Item>
          <Alert
            type="info"
            showIcon
            message="多空间数据默认隔离；仅在空间关联并授权后，才可跨空间访问数据。"
          />
        </Form>
      </Drawer>
    </div>
  );
};

export default SpaceListPage;
