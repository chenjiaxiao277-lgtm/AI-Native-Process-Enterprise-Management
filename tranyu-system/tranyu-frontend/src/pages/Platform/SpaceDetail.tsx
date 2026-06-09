import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PageContainer, ProDescriptions, ProTable, ModalForm, ProFormText, ProFormSelect } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Tabs, message, Alert } from 'antd';
import { history, useLocation, useParams } from 'umi';
import {
  addMember,
  createGroup,
  createRelationAuth,
  createRole,
  getSpace,
  listGroups,
  listMembers,
  listRelationAuth,
  listRoles,
  removeMember,
  type SpaceGroupCreateRequest,
  type SpaceGroupItem,
  type SpaceItem,
  type SpaceMemberCreateRequest,
  type SpaceMemberItem,
  type SpaceRelationAuthCreateRequest,
  type SpaceRelationAuthItem,
  type SpaceRoleCreateRequest,
  type SpaceRoleItem,
} from '@/services/space';

const statusOptions = [
  { label: '启用', value: 1 },
  { label: '禁用', value: 0 },
];

const SpaceDetail: React.FC = () => {
  const params = useParams<{ id: string }>();
  const location = useLocation();
  const tenantId = useMemo(() => new URLSearchParams(location.search).get('tenantId') || '', [location.search]);
  const [detail, setDetail] = useState<SpaceItem | undefined>();
  const [loading, setLoading] = useState(false);
  const memberActionRef = useRef<ActionType>();
  const groupActionRef = useRef<ActionType>();
  const roleActionRef = useRef<ActionType>();
  const relationActionRef = useRef<ActionType>();

  const spaceId = params.id || '';

  const fetchDetail = async () => {
    if (!tenantId || !spaceId) return;
    setLoading(true);
    try {
      const resp = await getSpace(spaceId, tenantId);
      setDetail(resp.data);
    } catch (error: any) {
      message.error(error?.message || '加载空间详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [tenantId, spaceId]);

  const memberColumns: ProColumns<SpaceMemberItem>[] = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '用户ID', dataIndex: 'userId' },
    { title: '角色ID', dataIndex: 'roleId' },
    { title: '状态', dataIndex: 'status', valueEnum: { 1: '启用', 0: '禁用' } },
    { title: '创建时间', dataIndex: 'createTime' },
    {
      title: '操作',
      valueType: 'option',
      render: (_, record) => [
        <a
          key="remove"
          onClick={async () => {
            if (!record.id) return;
            await removeMember(spaceId, record.id);
            message.success('已移除');
            memberActionRef.current?.reload();
          }}
        >
          移除
        </a>,
      ],
    },
  ];

  const groupColumns: ProColumns<SpaceGroupItem>[] = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '组名', dataIndex: 'groupName' },
    { title: '编码', dataIndex: 'groupCode' },
    { title: '状态', dataIndex: 'status', valueEnum: { 1: '启用', 0: '禁用' } },
    { title: '描述', dataIndex: 'description' },
    { title: '创建时间', dataIndex: 'createTime' },
  ];

  const roleColumns: ProColumns<SpaceRoleItem>[] = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '角色名', dataIndex: 'roleName' },
    { title: '角色编码', dataIndex: 'roleCode' },
    { title: '状态', dataIndex: 'status', valueEnum: { 1: '启用', 0: '禁用' } },
    { title: '描述', dataIndex: 'description' },
    { title: '排序', dataIndex: 'sort' },
  ];

  const relationColumns: ProColumns<SpaceRelationAuthItem>[] = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '目标空间', dataIndex: 'targetSpaceId' },
    { title: '资源类型', dataIndex: 'resourceType' },
    { title: '资源Key', dataIndex: 'resourceKey' },
    { title: '状态', dataIndex: 'status', valueEnum: { 1: '启用', 0: '禁用' } },
    { title: '备注', dataIndex: 'remark' },
    { title: '创建时间', dataIndex: 'createTime' },
  ];

  return (
    <PageContainer
      title="空间详情"
      breadcrumb={{
        items: [
          { path: '/enterprise/spaces', title: '企业管理' },
          { title: '空间管理' },
          { title: '空间详情' },
        ],
      }}
      onBack={() => history.push('/enterprise/spaces')}
      loading={loading}
    >
      {!tenantId ? (
        <Alert
          type="warning"
          message="请先输入租户ID后再操作"
          description="企业管理入口依赖租户上下文，当前未检测到 tenantId。"
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : null}
      <ProDescriptions<SpaceItem>
        column={2}
        dataSource={detail}
        columns={[
          { title: '租户标识', dataIndex: 'tenantId' },
          { title: '空间标识', dataIndex: 'spaceId' },
          { title: '空间名称', dataIndex: 'spaceName' },
          { title: '状态', dataIndex: 'status', valueEnum: { 1: '启用', 0: '禁用' } },
          { title: '归档', dataIndex: 'archived', valueEnum: { 1: '是', 0: '否' } },
          { title: '描述', dataIndex: 'description' },
        ]}
      />
      <Tabs
        items={[
          {
            key: 'members',
            label: '成员管理',
            children: (
              <ProTable<SpaceMemberItem>
                actionRef={memberActionRef}
                rowKey="id"
                search={false}
                columns={memberColumns}
                locale={{ emptyText: '暂无成员，可先点击“添加成员”' }}
                request={async () => {
                  if (!tenantId || !spaceId) return { data: [], success: true };
                  try {
                    const resp = await listMembers(spaceId, tenantId);
                    return { data: resp.data || [], success: resp.code === 0 };
                  } catch (error: any) {
                    message.error(error?.message || '加载成员失败');
                    return { data: [], success: false };
                  }
                }}
                toolBarRender={() => [
                  <ModalForm<SpaceMemberCreateRequest>
                    key="member-add"
                    title="添加成员"
                    trigger={<Button type="primary">添加成员</Button>}
                    initialValues={{ status: 1 }}
                    onFinish={async (values) => {
                      try {
                        await addMember(spaceId, tenantId, values);
                        message.success('已添加');
                        memberActionRef.current?.reload();
                      } catch (error: any) {
                        message.error(error?.message || '添加成员失败');
                      }
                      return true;
                    }}
                  >
                    <ProFormText name="userId" label="用户ID" rules={[{ required: true }]} />
                    <ProFormText name="roleId" label="角色ID" />
                    <ProFormSelect name="status" label="状态" options={statusOptions} />
                  </ModalForm>,
                ]}
              />
            ),
          },
          {
            key: 'groups',
            label: '用户组管理',
            children: (
              <ProTable<SpaceGroupItem>
                actionRef={groupActionRef}
                rowKey="id"
                search={false}
                columns={groupColumns}
                locale={{ emptyText: '暂无用户组，可先点击“新建用户组”' }}
                request={async () => {
                  if (!tenantId || !spaceId) return { data: [], success: true };
                  try {
                    const resp = await listGroups(spaceId, tenantId);
                    return { data: resp.data || [], success: resp.code === 0 };
                  } catch (error: any) {
                    message.error(error?.message || '加载用户组失败');
                    return { data: [], success: false };
                  }
                }}
                toolBarRender={() => [
                  <ModalForm<SpaceGroupCreateRequest>
                    key="group-add"
                    title="新建用户组"
                    trigger={<Button type="primary">新建用户组</Button>}
                    initialValues={{ status: 1 }}
                    onFinish={async (values) => {
                      try {
                        await createGroup(spaceId, tenantId, values);
                        message.success('已创建');
                        groupActionRef.current?.reload();
                      } catch (error: any) {
                        message.error(error?.message || '创建用户组失败');
                      }
                      return true;
                    }}
                  >
                    <ProFormText name="groupName" label="组名" rules={[{ required: true }]} />
                    <ProFormText name="groupCode" label="编码" />
                    <ProFormSelect name="status" label="状态" options={statusOptions} />
                    <ProFormText name="description" label="描述" />
                  </ModalForm>,
                ]}
              />
            ),
          },
          {
            key: 'roles',
            label: '空间角色',
            children: (
              <ProTable<SpaceRoleItem>
                actionRef={roleActionRef}
                rowKey="id"
                search={false}
                columns={roleColumns}
                locale={{ emptyText: '暂无空间角色，可先点击“新建角色”' }}
                request={async () => {
                  if (!tenantId || !spaceId) return { data: [], success: true };
                  try {
                    const resp = await listRoles(spaceId, tenantId);
                    return { data: resp.data || [], success: resp.code === 0 };
                  } catch (error: any) {
                    message.error(error?.message || '加载角色失败');
                    return { data: [], success: false };
                  }
                }}
                toolBarRender={() => [
                  <ModalForm<SpaceRoleCreateRequest>
                    key="role-add"
                    title="新建空间角色"
                    trigger={<Button type="primary">新建角色</Button>}
                    initialValues={{ status: 1 }}
                    onFinish={async (values) => {
                      try {
                        await createRole(spaceId, tenantId, values);
                        message.success('已创建');
                        roleActionRef.current?.reload();
                      } catch (error: any) {
                        message.error(error?.message || '创建角色失败');
                      }
                      return true;
                    }}
                  >
                    <ProFormText name="roleName" label="角色名称" rules={[{ required: true }]} />
                    <ProFormText name="roleCode" label="角色编码" rules={[{ required: true }]} />
                    <ProFormSelect name="status" label="状态" options={statusOptions} />
                    <ProFormText name="description" label="描述" />
                    <ProFormText name="sort" label="排序" />
                  </ModalForm>,
                ]}
              />
            ),
          },
          {
            key: 'relation',
            label: '空间关联授权',
            children: (
              <ProTable<SpaceRelationAuthItem>
                actionRef={relationActionRef}
                rowKey="id"
                search={false}
                columns={relationColumns}
                locale={{ emptyText: '暂无关联授权，可先点击“新建授权”' }}
                request={async () => {
                  if (!tenantId || !spaceId) return { data: [], success: true };
                  try {
                    const resp = await listRelationAuth(spaceId, tenantId);
                    return { data: resp.data || [], success: resp.code === 0 };
                  } catch (error: any) {
                    message.error(error?.message || '加载关联授权失败');
                    return { data: [], success: false };
                  }
                }}
                toolBarRender={() => [
                  <ModalForm<SpaceRelationAuthCreateRequest>
                    key="relation-add"
                    title="新建关联授权"
                    trigger={<Button type="primary">新建授权</Button>}
                    initialValues={{ status: 1 }}
                    onFinish={async (values) => {
                      try {
                        await createRelationAuth(spaceId, tenantId, values);
                        message.success('已创建');
                        relationActionRef.current?.reload();
                      } catch (error: any) {
                        message.error(error?.message || '创建关联授权失败');
                      }
                      return true;
                    }}
                  >
                    <ProFormText name="targetSpaceId" label="目标空间ID" rules={[{ required: true }]} />
                    <ProFormText name="resourceType" label="资源类型" rules={[{ required: true }]} />
                    <ProFormText name="resourceKey" label="资源Key" />
                    <ProFormSelect name="status" label="状态" options={statusOptions} />
                    <ProFormText name="remark" label="备注" />
                  </ModalForm>,
                ]}
              />
            ),
          },
        ]}
      />
    </PageContainer>
  );
};

export default SpaceDetail;
