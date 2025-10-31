// src/pages/Admin.tsx
import { PageContainer } from '@ant-design/pro-components';
import { Col, Row } from 'antd';
import React from 'react';
import BoardCard, { type BoardStatus } from '../components/BoardCard';

const boards: Array<{
  name: 'Basys3-A' | 'Basys3-B' | 'Basys3-C' | 'Basys3-D';
  status: BoardStatus; user?: string; ip?: string; since?: string; until?: string;
}> = [
  { name: 'Basys3-A', status: 'busy' },
  { name: 'Basys3-B', status: 'ready', user: 'sfuentes', ip: '172.16.1.23', since: '10:05', until: '10:35' },
  { name: 'Basys3-C', status: 'flashing', user: 'dlee', ip: '172.16.1.18', since: '10:12', until: '10:42' },
  { name: 'Basys3-D', status: 'error' },
];

const Admin: React.FC = () => {
  return (
    <PageContainer
      header={{ title: 'Admin Dashboard' }}
      style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
      token={{ paddingBlockPageContainerContent: 16, paddingInlinePageContainerContent: 16 }}
    >
      <Row gutter={[16, 16]} justify="center">
        {boards.map((b) => (
          <Col key={b.name} xs={24} md={12} style={{ display: 'flex' }}>
            {/* let the card fill its column nicely */}
            <div style={{ width: '100%' }}>
              <BoardCard {...b} />
            </div>
          </Col>
        ))}
      </Row>
    </PageContainer>
  );
};

export default Admin;