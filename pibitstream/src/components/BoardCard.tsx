// src/components/BoardCard.tsx
import { Badge, Button, Card, Descriptions, Space, Tag, Tooltip } from 'antd';
import React from 'react';

export type BoardStatus = 'ready' | 'busy' | 'flashing' | 'error';

export interface BoardCardProps {
  name: 'Basys3-A' | 'Basys3-B' | 'Basys3-C' | 'Basys3-D';
  status: BoardStatus;
  user?: string;
  ip?: string;
  since?: string;
  until?: string;
  onReboot?: () => void;
  onForceRelease?: () => void;
  onRefresh?: () => void;
}

const statusBadge = (s: BoardStatus) =>
  s === 'ready'
    ? { status: 'success' as const, text: 'Ready' }
    : s === 'busy'
    ? { status: 'warning' as const, text: 'Busy' }
    : s === 'flashing'
    ? { status: 'processing' as const, text: 'Flashing' }
    : { status: 'error' as const, text: 'Error' };

const BoardCard: React.FC<BoardCardProps> = ({
  name,
  status,
  user,
  ip,
  since,
  until,
  onReboot,
  onForceRelease,
  onRefresh,
}) => {
  const isInUse = status === 'busy' || status === 'flashing';

  return (
    <Card
      size="small"
      bordered
      title={
        <Space size={8}>
          <Tag color="blue" style={{ margin: 0 }}>{name}</Tag>
          <Badge {...statusBadge(status)} />
        </Space>
      }
      extra={
        <Space size={8}>
          <Button size="small" onClick={onRefresh}>Refresh</Button>
          <Tooltip title="Power-cycle board">
            <Button size="small" onClick={onReboot}>Reboot</Button>
          </Tooltip>
          <Tooltip title="Force free this board">
            <Button size="small" danger disabled={!isInUse} onClick={onForceRelease}>
              Force Release
            </Button>
          </Tooltip>
        </Space>
      }
      styles={{ body: { padding: 14 } }}
    >
      <Descriptions
        column={1}
        size="small"
        items={[
          { key: 'user', label: 'User', children: user ?? '-' },
          { key: 'ip', label: 'IP', children: ip ?? '-' },
          { key: 'since', label: 'Since', children: since ?? '-' },
          { key: 'until', label: 'Until', children: until ?? '-' },
        ]}
      />
    </Card>
  );
};

export default BoardCard;