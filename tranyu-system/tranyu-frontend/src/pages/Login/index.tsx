import React, { useEffect, useState } from 'react';
import { LoginFormPage, ProFormText, ProFormCheckbox } from '@ant-design/pro-components';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { message } from 'antd';
import { history } from 'umi';
import { login } from '@/services/login';
import { setToken, setUserInfo, getRememberedUsername, setRememberedUsername, setCurrentTenantId } from '@/utils/auth';
import { getCurrentSpaceId, withSpaceId } from '@/utils/space';

const LoginPage: React.FC = () => {
  const [submitting, setSubmitting] = useState(false);
  const [initialUsername, setInitialUsername] = useState<string | undefined>();

  useEffect(() => {
    const remembered = getRememberedUsername();
    if (remembered) {
      setInitialUsername(remembered);
    }
  }, []);

  const handleFinish = async (values: { username: string; password: string; rememberMe?: boolean }) => {
    setSubmitting(true);
    try {
      const res = await login({
        username: values.username,
        password: values.password,
        rememberMe: values.rememberMe,
      });
      if (res.code !== 0 || !res.data) {
        message.error(res.message || '登录失败');
        return;
      }
      const roles = res.data.user?.roles || [];
      const isPlatformAdmin = roles.includes('平台管理员') || roles.includes('PLATFORM_ADMIN');
      const isTenantAdmin = roles.includes('租户管理员') || roles.includes('TENANT_ADMIN');
      const isSpaceSuperAdmin = roles.includes('超级空间管理员') || roles.includes('SPACE_SUPER_ADMIN');
      const isSpaceAdmin = roles.includes('空间管理员') || roles.includes('SPACE_OWNER');
      const searchEntry = new URLSearchParams(window.location.search).get('entry');
      const path = window.location.pathname || '';
      const pathEntry = path.startsWith('/platform/')
        ? 'platform'
        : path.startsWith('/enterprise/')
          ? 'enterprise'
          : path.startsWith('/workspace/')
            ? 'workspace'
            : null;
      const entry = searchEntry || pathEntry;

      const redirectTo = (path: string) => history.push(path);
      const fallback = () => {
        if (isTenantAdmin) {
          redirectTo('/enterprise/spaces');
          return;
        }
        if (isPlatformAdmin) {
          redirectTo('/platform/tenants');
          return;
        }
        if (isSpaceSuperAdmin) {
          redirectTo('/workspace/home');
          return;
        }
        redirectTo('/workspace/home');
      };

      if (entry === 'platform') {
        if (!isPlatformAdmin) {
          message.error('当前账号无权进入平台入口');
          return;
        }
        setToken(res.data.token);
        setUserInfo(res.data.user);
        if (res.data.user?.tenantId) {
          setCurrentTenantId(res.data.user.tenantId);
        }
        if (values.rememberMe) {
          setRememberedUsername(values.username);
        } else {
          setRememberedUsername(undefined);
        }
        message.success('登录成功');
        redirectTo('/platform/tenants');
        return;
      }
      if (entry === 'enterprise') {
        if (!isTenantAdmin) {
          message.error('当前账号无权进入企业入口');
          return;
        }
        setToken(res.data.token);
        setUserInfo(res.data.user);
        if (res.data.user?.tenantId) {
          setCurrentTenantId(res.data.user.tenantId);
        }
        if (values.rememberMe) {
          setRememberedUsername(values.username);
        } else {
          setRememberedUsername(undefined);
        }
        message.success('登录成功');
        redirectTo('/enterprise/spaces');
        return;
      }
      if (entry === 'workspace') {
        if (!isSpaceSuperAdmin) {
          message.error('当前账号无权进入空间入口');
          return;
        }
        setToken(res.data.token);
        setUserInfo(res.data.user);
        if (res.data.user?.tenantId) {
          setCurrentTenantId(res.data.user.tenantId);
        }
        if (values.rememberMe) {
          setRememberedUsername(values.username);
        } else {
          setRememberedUsername(undefined);
        }
        message.success('登录成功');
        redirectTo('/workspace/home');
        return;
      }

      setToken(res.data.token);
      setUserInfo(res.data.user);
      if (res.data.user?.tenantId) {
        setCurrentTenantId(res.data.user.tenantId);
      }
      if (values.rememberMe) {
        setRememberedUsername(values.username);
      } else {
        setRememberedUsername(undefined);
      }
      message.success('登录成功');
      fallback();
    } catch (e: any) {
      message.error(e?.message || '登录失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ height: '100vh', background: 'linear-gradient(135deg, #f0f5ff 0%, #ffffff 60%)' }}>
      <LoginFormPage
        backgroundImageUrl=""
        logo={null}
        title="Tranyu系统"
        subTitle="销售项目 / 交付项目一体化管理平台"
        onFinish={handleFinish}
        loading={submitting}
        initialValues={{
          username: initialUsername,
          rememberMe: !!initialUsername,
        }}
      >
        <ProFormText
          name="username"
          fieldProps={{
            size: 'large',
            prefix: <UserOutlined />,
          }}
          placeholder="请输入用户名"
          rules={[
            { required: true, message: '请输入用户名' },
            { min: 3, max: 50, message: '用户名长度为3-50个字符' },
          ]}
        />
        <ProFormText.Password
          name="password"
          fieldProps={{
            size: 'large',
            prefix: <LockOutlined />,
          }}
          placeholder="请输入密码"
          rules={[{ required: true, message: '请输入密码' }]}
        />
        <ProFormCheckbox name="rememberMe">记住我</ProFormCheckbox>
      </LoginFormPage>
    </div>
  );
};

export default LoginPage;
