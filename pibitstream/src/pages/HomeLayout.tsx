// src/pages/HomeLayout.tsx
import {
  GithubFilled,
  HomeOutlined,
  InfoCircleFilled,
  UserSwitchOutlined,
} from '@ant-design/icons';
import {
  DefaultFooter,
  ProLayout,
  type MenuDataItem,
} from '@ant-design/pro-components';
import { Tooltip } from 'antd';
import React, { useMemo } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

const HomeLayout: React.FC = () => {
  const location = useLocation();

  // Minimal menu (Home only)
  const menuData = useMemo<MenuDataItem[]>(
    () => [{ name: 'Home', path: '/', icon: <HomeOutlined /> }],
    []
  );

  return (
    <ProLayout
      logo={false}
      title="PiBitStreamer"
      layout="top"
      fixedHeader
      route={{ path: '/', routes: menuData }}
      location={location}
      style={{ minHeight: '100dvh' }}                           // fill viewport
      contentStyle={{ display: 'flex', flexDirection: 'column', height: '100%' }}
      // Right-side header actions: Admin link + a couple of small icons
      actionsRender={() => [
        <Tooltip key="admin" title="Admin">
          <Link
            to="/admin"
            style={{ color: 'inherit', textDecoration: 'none' }}
            aria-label="Go to admin"
          >
            <UserSwitchOutlined/>
          </Link>
        </Tooltip>,
        <Tooltip key="info" title="Info">
          <InfoCircleFilled />
        </Tooltip>,
        <Tooltip key="gh" title="GitHub">
          <a
            href="https://github.com/devinatkin/PiBitStreamer"
            target="_blank"
            rel="noreferrer"
            style={{ color: 'inherit', textDecoration: 'none' }}
            aria-label="Open PiBitStreamer on GitHub"
          >
            <GithubFilled />
          </a>
        </Tooltip>,
      ]}
      // Keep link behavior for the (single) Home item
      menuItemRender={(item, dom) => (item.path ? <Link to={item.path}>{dom}</Link> : dom)}
      footerRender={() => (
        <DefaultFooter
          copyright="PiBitStreamer 2025"
          links={[
            { key: 'Ant Design Pro', title: 'Ant Design Pro', href: 'https://pro.ant.design', blankTarget: true },
            { key: 'Ant Design', title: 'Ant Design', href: 'https://ant.design', blankTarget: true },
          ]}
        />
      )}
    >
      <>
        <Outlet />
      </>
    </ProLayout>
  );
};

export default HomeLayout;