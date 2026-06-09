import React, { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, history } from 'umi';
import { ModalForm, ProFormText, ProLayout } from '@ant-design/pro-components';
import { Dropdown, Space, Typography, message } from 'antd';
import {
  UserOutlined,
  SettingOutlined,
  AppstoreOutlined,
  DownOutlined,
  TeamOutlined,
  ApartmentOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { fetchAllWorkItems, type WorkItemType } from '@/services/workItem';
import {
  SPACE_CHANGED_EVENT,
  getCurrentSpaceId,
  getSpaceIdFromSearch,
  getCurrentSpace,
  getSpaceList,
  switchSpaceWithRefresh,
  withSpaceId,
  type SpaceInfo,
} from '@/utils/space';

import { clearAuthStorage, getToken, getUserInfo } from '@/utils/auth';
import { clearSpaceScopedRuntimeCache } from '@/utils/space';
import { changeMyPassword } from '@/services/user';

const BasicLayout: React.FC = () => {
  const location = useLocation();
  const [dynamicWorkItems, setDynamicWorkItems] = useState<WorkItemType[]>([]);
  const [spaces, setSpaces] = useState<SpaceInfo[]>([]);
  const [currentSpaceId, setCurrentSpaceIdState] = useState('');
  const [passwordOpen, setPasswordOpen] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      history.push('/login');
    }
  }, [location.pathname]);

  useEffect(() => {
    const path = location.pathname || '';
    if (path.startsWith('/platform') && !isPlatformAdmin) {
      history.replace('/workspace/home');
      return;
    }
    if (path.startsWith('/enterprise') && !isTenantAdmin) {
      history.replace('/workspace/home');
    }
  }, [location.pathname, isPlatformAdmin, isTenantAdmin]);

  useEffect(() => {
    const realCurrent = getCurrentSpaceId();
    const querySpaceId = getSpaceIdFromSearch(location.search);
    const allSpaceIds = new Set(getSpaceList().map((s) => s.id));
    if (querySpaceId) {
      if (allSpaceIds.has(querySpaceId) && querySpaceId !== realCurrent) {
        switchSpaceWithRefresh(querySpaceId);
      }
      if (!allSpaceIds.has(querySpaceId)) {
        const normalized = withSpaceId(`${location.pathname}${location.search || ''}`, realCurrent);
        if (normalized !== `${location.pathname}${location.search || ''}`) {
          history.replace(normalized);
        }
      }
      return;
    }
    const normalized = withSpaceId(`${location.pathname}${location.search || ''}`, realCurrent);
    if (normalized !== `${location.pathname}${location.search || ''}`) {
      history.replace(normalized);
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    fetchAllWorkItems()
      .then((res) => {
        if (res.code !== 0) return;
        setDynamicWorkItems(
          (res.data || []).filter(
            (item) => item.status === 1 && item.navEntryEnabled === 1 && item.deleted !== 1,
          ),
        );
      })
      .catch(() => {
        // ignore dynamic menu errors
      });
  }, [location.pathname, currentSpaceId]);

  useEffect(() => {
    const syncSpaceState = () => {
      const list = getSpaceList();
      const current = getCurrentSpace();
      setSpaces(list);
      setCurrentSpaceIdState(current.id);
    };
    syncSpaceState();
    window.addEventListener(SPACE_CHANGED_EVENT, syncSpaceState as EventListener);
    return () => {
      window.removeEventListener(SPACE_CHANGED_EVENT, syncSpaceState as EventListener);
    };
  }, []);

  const currentUser = getUserInfo();
  const currentRoles = currentUser?.roles || [];
  const isPlatformAdmin = currentRoles.includes('平台管理员') || currentRoles.includes('PLATFORM_ADMIN');
  const isTenantAdmin = currentRoles.includes('租户管理员') || currentRoles.includes('TENANT_ADMIN');
  const isSpaceAdmin =
    currentRoles.includes('空间管理员') ||
    currentRoles.includes('SPACE_OWNER') ||
    currentRoles.includes('超级空间管理员') ||
    currentRoles.includes('SPACE_SUPER_ADMIN');

  const mergedMenuData = useMemo(() => {
    const platformRoutes = [{ path: '/platform/tenants', name: '租户管理', icon: <ApartmentOutlined /> }];
    const enterpriseRoutes = [
      { path: '/enterprise/users', name: '用户管理', icon: <UserOutlined /> },
      { path: '/enterprise/spaces', name: '空间管理', icon: <TeamOutlined /> },
      { path: '/enterprise/permissions/space', name: '权限管理', icon: <SafetyCertificateOutlined /> },
    ];
    const workspaceRoutes = [
      { path: '/workspace/home', name: '空间工作台', icon: <AppstoreOutlined /> },
    ];
    const dynamicRoutes = dynamicWorkItems.map((item) => ({
      path: withSpaceId(`/space/work-items/${item.id}`, currentSpaceId || getCurrentSpaceId()),
      name: item.typeName,
      icon: <AppstoreOutlined />,
    }));
    const path = location.pathname || '';
    if (path.startsWith('/platform')) {
      return isPlatformAdmin ? platformRoutes : workspaceRoutes;
    }
    if (path.startsWith('/enterprise')) {
      return isTenantAdmin ? enterpriseRoutes : workspaceRoutes;
    }
    if (path.startsWith('/workspace')) {
      const workspaceMenu = isSpaceAdmin
        ? [
            ...workspaceRoutes,
            { path: withSpaceId('/space/config', currentSpaceId || getCurrentSpaceId()), name: '空间配置', icon: <SettingOutlined /> },
          ]
        : workspaceRoutes;
      return [...workspaceMenu, ...dynamicRoutes];
    }
    if (!isSpaceAdmin) {
      return [...dynamicRoutes];
    }
    return [
      ...dynamicRoutes,
      { path: withSpaceId('/space/config', currentSpaceId || getCurrentSpaceId()), name: '空间配置', icon: <SettingOutlined /> },
      { path: withSpaceId('/space/list', currentSpaceId || getCurrentSpaceId()), name: '空间列表', hideInMenu: true },
      { path: withSpaceId('/space/nav-config', currentSpaceId || getCurrentSpaceId()), name: '导航配置', hideInMenu: true },
    ];
  }, [dynamicWorkItems, currentSpaceId, location.pathname, isPlatformAdmin, isTenantAdmin, isSpaceAdmin]);
  const currentSpace = useMemo(
    () => spaces.find((space) => space.id === currentSpaceId) || getCurrentSpace(),
    [spaces, currentSpaceId],
  );

  const switchSpace = (spaceId: string) => {
    switchSpaceWithRefresh(spaceId);
    history.push(withSpaceId('/space/config', spaceId));
  };

  const renderSpaceIcon = (icon?: string, size = 20) => {
    const isImage = !!icon && (icon.startsWith('data:image/') || icon.startsWith('http'));
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 6,
          background: '#fff7e6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {isImage ? (
          <img src={icon} alt="space-icon" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: size * 0.6 }}>{icon || '🥮'}</span>
        )}
      </div>
    );
  };

  return (
    <ProLayout
      logo={false}
      title={
        <Dropdown
          trigger={['click']}
          menu={{
            items: [
              ...(spaces || []).map((space) => ({
                key: space.id,
                label: (
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Space>
                      {renderSpaceIcon(space.icon, 18)}
                      <span>{space.name}</span>
                    </Space>
                    {space.id === currentSpace.id ? <Typography.Text type="secondary">当前</Typography.Text> : null}
                  </Space>
                ),
              })),
              { type: 'divider' as const },
              { key: '__space_list__', label: '查看空间列表' },
            ],
            onClick: ({ key }) => {
              if (key === '__space_list__') {
                history.push(withSpaceId('/space/list', currentSpace.id));
                return;
              }
              switchSpace(String(key));
            },
          }}
        >
          <Space style={{ cursor: 'pointer' }}>
            {renderSpaceIcon(currentSpace?.icon, 18)}
            <span>{currentSpace?.name || '空间'}</span>
            <DownOutlined style={{ fontSize: 12 }} />
          </Space>
        </Dropdown>
      }
      layout="mix"
      location={{ pathname: location.pathname }}
      route={{ path: '/', routes: mergedMenuData as any }}
      avatarProps={{
        icon: <UserOutlined />,
        title: currentUser?.realName || currentUser?.username || '未登录',
        render: (_, dom) => (
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                { key: 'tenant', label: `当前租户：${currentUser?.tenantId || 'default'}` },
                { type: 'divider' as const },
                { key: 'change_password', label: '修改密码' },
                { key: 'logout', label: '退出登录' },
              ],
              onClick: ({ key }) => {
                if (key === 'change_password') {
                  setPasswordOpen(true);
                  return;
                }
                if (key !== 'logout') return;
                clearAuthStorage();
                clearSpaceScopedRuntimeCache();
                history.push('/login');
              },
            }}
          >
            {dom}
          </Dropdown>
        ),
      }}
      menuItemRender={(item, dom) => {
        if (!item.path) return dom;
        return <Link to={item.path}>{dom}</Link>;
      }}
    >
      <ModalForm
        title="修改密码"
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
        modalProps={{ destroyOnClose: true }}
        onFinish={async (values) => {
          if (!values.oldPassword || !values.newPassword) {
            message.warning('请填写原密码和新密码');
            return false;
          }
          if (values.newPassword !== values.confirmPassword) {
            message.warning('新密码与确认密码不一致');
            return false;
          }
          await changeMyPassword(values);
          message.success('密码已更新，请重新登录');
          clearAuthStorage();
          clearSpaceScopedRuntimeCache();
          history.push('/login');
          return true;
        }}
      >
        <ProFormText.Password name="oldPassword" label="原密码" rules={[{ required: true }]} />
        <ProFormText.Password name="newPassword" label="新密码" rules={[{ required: true }]} />
        <ProFormText.Password name="confirmPassword" label="确认密码" rules={[{ required: true }]} />
      </ModalForm>
      <Outlet key={currentSpaceId || getCurrentSpaceId()} />
    </ProLayout>
  );
};

export default BasicLayout;
