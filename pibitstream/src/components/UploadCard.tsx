import { InboxOutlined } from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components';
import { Button, message, Progress, Space, Typography, Upload } from 'antd';
import type { RcFile, UploadProps } from 'antd/es/upload';
import React, { useMemo, useState } from 'react';

const { Dragger } = Upload;

export interface UploadCardProps {
  /** Called after local validation. Return a promise to show progress until resolved/rejected. */
  onUpload?: (file: File) => Promise<void> | void;
  /** Comma-separated list of extensions or mime types */
  accept?: string;
  /** Max file size (MB) */
  maxSizeMB?: number;
  /** Card title/subtitle overrides */
  title?: React.ReactNode;
  subTitle?: React.ReactNode;
  /** Optional: disable the dragger */
  disabled?: boolean;
}

/**
 * UploadCard — ProCard wrapper around antd Upload.Dragger
 * - Validates file type/size locally
 * - Calls onUpload(file) instead of auto-posting
 * - Shows progress when onUpload returns a Promise (simulated if not provided)
 */
const UploadCard: React.FC<UploadCardProps> = ({
  onUpload,
  accept = '.bit,.svf,.sv',
  maxSizeMB = 50,
  title = 'Upload Bitstream',
  subTitle = 'Drag & drop your SystemVerilog/bitstream file here, or click to browse',
  disabled = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number>(0);

  const reset = () => {
    setUploading(false);
    setProgress(0);
  };

  const beforeUpload: UploadProps['beforeUpload'] = async (file: RcFile) => {
    // Type/extension check
    const allowed = accept
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;

    const typeOk =
      allowed.length === 0 ||
      allowed.includes(ext) ||
      (file.type && allowed.includes(file.type.toLowerCase()));

    if (!typeOk) {
      message.error(`Invalid file type. Allowed: ${accept}`);
      return Upload.LIST_IGNORE;
    }

    // Size check
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      message.error(`File is too large. Max ${maxSizeMB} MB.`);
      return Upload.LIST_IGNORE;
    }

    // Prevent antd from auto-uploading; we handle it in onChange
    return false;
  };

  const simulateProgress = () => {
    setUploading(true);
    setProgress(10);
    const id = setInterval(() => {
      setProgress((p) => {
        if (p >= 95) {
          clearInterval(id);
          return p;
        }
        return p + Math.max(1, Math.round((100 - p) * 0.08));
      });
    }, 120);
    return () => clearInterval(id);
  };

  const handleCustomUpload = async (file: File) => {
    let stopSim: (() => void) | undefined;
    try {
      if (onUpload) {
        setUploading(true);
        stopSim = simulateProgress();
        await onUpload(file);
        setProgress(100);
        message.success('Upload complete');
      } else {
        // No handler given — just simulate a short “success”
        stopSim = simulateProgress();
        await new Promise((r) => setTimeout(r, 1200));
        setProgress(100);
        message.success('Pretend upload complete (no onUpload handler)');
      }
    } finally {
      if (stopSim) stopSim();
      setTimeout(reset, 500);
    }
  };

  const uploadProps = useMemo<UploadProps>(
    () => ({
      multiple: false,
      accept,
      disabled: disabled || uploading,
      beforeUpload,
      showUploadList: false, // we show our own progress
      onChange: async (info) => {
        const f = info.file.originFileObj as File | undefined;
        if (!f) return;
        await handleCustomUpload(f);
      },
    }),
    [accept, disabled, uploading]
  );

  return (
    <ProCard
      title={title}
      subTitle={subTitle}
      headerBordered
      bordered
      size="small"
      loading={false}
      extra={
        <Space size="small">
          {uploading && (
            <Button size="small" onClick={reset}>
              Cancel
            </Button>
          )}
        </Space>
      }
      // keep content roomy but not huge
      bodyStyle={{ padding: 16 }}
      style={{ width: '100%', maxWidth: 640 }}
    >
      <Space direction="vertical" size={12} style={{ display: 'flex' }}>
        <Dragger {...uploadProps} style={{ padding: 16 }}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <Typography.Paragraph strong>
            Click or drag file to this area to upload
          </Typography.Paragraph>
          <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
            Allowed: {accept} • Max size: {maxSizeMB} MB
          </Typography.Paragraph>
        </Dragger>

        {uploading && (
          <div style={{ paddingInline: 4 }}>
            <Progress percent={progress} status={progress < 100 ? 'active' : 'success'} />
          </div>
        )}
      </Space>
    </ProCard>
  );
};

export default UploadCard;