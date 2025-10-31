// src/pages/Home.tsx
import { PageContainer } from '@ant-design/pro-components';
import { Badge, Space, Statistic, Tag, Tooltip, Typography } from 'antd';
import React, { useMemo, useState } from 'react';
import UploadCard from '../components/UploadCard';

type BoardStatus = 'ready' | 'busy' | 'flashing' | 'error';

const statusToBadge = (s: BoardStatus) =>
  s === 'ready'
    ? { status: 'success' as const, text: 'Ready' }
    : s === 'busy'
    ? { status: 'warning' as const, text: 'Busy' }
    : s === 'flashing'
    ? { status: 'processing' as const, text: 'Flashing' }
    : { status: 'error' as const, text: 'Error' };

const Home: React.FC = () => {

  // Demo state — wire to real values as needed
  const [status, setStatus] = useState<BoardStatus>('ready');
  const [deadline] = useState<number>(() => Date.now() + 30 * 60 * 1000); // 30 min

  const extraHeader = useMemo(
    () => (
        <Space size={16} align="center" wrap>
        {/* Board (static) */}
        <Tooltip title="FPGA board in use">
            <Tag
            color="blue"
            style={{
                margin: 0,
                fontSize: 14,            // bigger text
                lineHeight: '22px',
                padding: '2px 10px',     // chunkier pill
                borderRadius: 6,
            }}
            >
            Basys3-B
            </Tag>
        </Tooltip>

        {/* Time left */}
        <Tooltip title="Time remaining on this board">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Typography.Text type="secondary" style={{ fontSize: 14 }}>
                Time left:
            </Typography.Text>
            <Statistic.Timer
                type="countdown"
                value={deadline}
                format="mm[min] ss[s]"
                valueStyle={{
                fontSize: 14,          // bigger digits
                fontVariantNumeric: 'tabular-nums',
                }}
                onFinish={() => setStatus('ready')}
            />
            </div>
        </Tooltip>

        {/* Status */}
        <Tooltip title="Board status">
            <Badge
            {...statusToBadge(status)}
            text={
                <span style={{ fontSize: 14 }}>
                {statusToBadge(status).text}
                </span>
            }
            />
        </Tooltip>
        </Space>
    ),
    [deadline, status]
    );

  return (
    <PageContainer
      header={{ title: 'Welcome to the PiBitStream' }}
      extra={extraHeader}
      style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
      token={{
        paddingBlockPageContainerContent: 16,
        paddingInlinePageContainerContent: 16,
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          width: '100%',
          justifyContent: 'center',
          padding: 16,
          minHeight: 0,
        }}
      >
        <UploadCard
          accept=".bit,.svf,.sv"
          maxSizeMB={100}
          onUpload={async (file) => {
            // Example integration:
            // setStatus('flashing');
            // await doUpload(file);
            // setStatus('ready');
            console.log('Uploading', file.name, file.size);
          }}
        />
      </div>
    </PageContainer>
  );
};

export default Home;