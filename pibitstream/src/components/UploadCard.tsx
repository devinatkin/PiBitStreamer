import { InboxOutlined } from "@ant-design/icons";
import { ProCard } from "@ant-design/pro-components";
import { Button, message, Progress, Space, Typography, Upload } from "antd";
import type { RcFile, UploadProps } from "antd/es/upload";
import React, { useMemo, useState } from "react";

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

const UploadCard: React.FC<UploadCardProps> = ({
  onUpload,
  accept = ".bit,.svf,.sv",
  maxSizeMB = 50,
  title = "Upload Bitstream",
  subTitle = "Drag & drop your SystemVerilog/bitstream file here, or click to browse",
  disabled = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number>(0);

  const reset = () => {
    setUploading(false);
    setProgress(0);
  };

  const beforeUpload: UploadProps["beforeUpload"] = async (file: RcFile) => {
    console.log("[UploadCard] beforeUpload called with:", file);

    // Type/extension check
    const allowed = accept
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
    console.log("[UploadCard] allowed:", allowed, "ext:", ext);

    const typeOk =
      allowed.length === 0 ||
      allowed.includes(ext) ||
      (file.type && allowed.includes(file.type.toLowerCase()));

    if (!typeOk) {
      message.error(`Invalid file type. Allowed: ${accept}`);
      console.warn("[UploadCard] file rejected due to type");
      return Upload.LIST_IGNORE; // IMPORTANT: no onChange in this case
    }

    // Size check
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      message.error(`File is too large. Max ${maxSizeMB} MB.`);
      console.warn("[UploadCard] file rejected due to size");
      return Upload.LIST_IGNORE;
    }

    // Prevent antd from auto-uploading; we handle it in onChange
    console.log("[UploadCard] file accepted by beforeUpload");
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
    console.log("[UploadCard] handleCustomUpload got file:", file);
    let stopSim: (() => void) | undefined;

    try {
      stopSim = simulateProgress();

      if (onUpload) {
        await onUpload(file); // -> this should hit your Home.handleUpload
        setProgress(100);
      } else {
        await new Promise((r) => setTimeout(r, 1200));
        setProgress(100);
        message.success("Pretend upload complete (no onUpload handler)");
      }
    } catch (err) {
      console.error("[UploadCard] error in handleCustomUpload:", err);
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
      showUploadList: false,
      onChange: async (info) => {
        console.log("[UploadCard] onChange:", info);

        // When beforeUpload returns false, info.file is already an RcFile (extends File)
        const f = info.file as RcFile;

        if (!f) {
          console.warn("[UploadCard] file is undefined in onChange");
          return;
        }

        await handleCustomUpload(f as unknown as File);
      },
    }),
    [accept, disabled, uploading, onUpload] // keep onUpload in deps
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
      bodyStyle={{ padding: 16 }}
      style={{ width: "100%", maxWidth: 640 }}
    >
      <Space direction="vertical" size={12} style={{ display: "flex" }}>
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
            <Progress
              percent={progress}
              status={progress < 100 ? "active" : "success"}
            />
          </div>
        )}
      </Space>
    </ProCard>
  );
};

export default UploadCard;