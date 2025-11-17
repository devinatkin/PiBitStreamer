// src/pages/BoardPage.tsx
import { PageContainer, ProCard } from "@ant-design/pro-components";
import {
    Badge,
    Button,
    message,
    Modal,
    Space,
    Spin,
    Statistic,
    Tag,
    Tooltip,
    Typography,
} from "antd";
import React, { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import UploadCard from "../components/UploadCard";
import type { BoardType } from "../features/boards/boardsService";
import {
    fetchBoards,
    flashBoard,
    releaseBoard,
    uploadBitstream,
} from "../features/boards/boardsSlice";
import {
    setUser,
    type StudentUser,
} from "../features/user/userSlice";

type BoardStatus = "ready" | "busy" | "flashing" | "error";

const statusToBadge = (s: BoardStatus) =>
  s === "ready"
    ? { status: "success" as const, text: "Ready" }
    : s === "busy"
    ? { status: "warning" as const, text: "Busy" }
    : s === "flashing"
    ? { status: "processing" as const, text: "Flashing" }
    : { status: "error" as const, text: "Error" };

// map backend "READY" | "BUSY" | "FLASHING" | "ERROR" to UI BoardStatus
const mapBackendStatus = (s: BoardType["status"]): BoardStatus =>
  s.toLowerCase() as BoardStatus;

const BoardPage: React.FC = () => {
  const { id: boardIdParam } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { boards, isLoading } = useAppSelector((state) => state.boards);
  const { user } = useAppSelector((state) => state.user);

  // Ensure boards are loaded (if not already)
  useEffect(() => {
    if (!boards.length) {
      dispatch(fetchBoards());
    }
  }, [dispatch, boards.length]);

  const myBoard: BoardType | null = useMemo(() => {
    if (!boardIdParam) return null;
    return boards.find((b) => b.id === boardIdParam) || null;
  }, [boards, boardIdParam]);

  // lease time as ms
  const leaseUntilMs: number | null = useMemo(
    () => (myBoard ? myBoard.leaseUntil : null),
    [myBoard]
  );

  const isLeaseActive = !!leaseUntilMs && leaseUntilMs > Date.now();

  const status: BoardStatus = myBoard
    ? mapBackendStatus(myBoard.status)
    : "ready";

  const extraHeader = useMemo(
    () => (
      <Space size={16} align="center" wrap>
        {/* Board */}
        <Tooltip title={myBoard ? "FPGA board in use" : "No board claimed yet"}>
          <Tag
            color="blue"
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: "22px",
              padding: "2px 10px",
              borderRadius: 6,
            }}
          >
            {myBoard ? myBoard.id : "No board"}
          </Tag>
        </Tooltip>

        {/* Time left (only if we have a lease) */}
        {leaseUntilMs && (
          <Tooltip title="Time remaining on this board">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Typography.Text type="secondary" style={{ fontSize: 14 }}>
                Time left:
              </Typography.Text>
              <Statistic.Timer
                type="countdown"
                value={leaseUntilMs}
                format="mm[min] ss[s]"
                valueStyle={{
                  fontSize: 14,
                  fontVariantNumeric: "tabular-nums",
                }}
                onFinish={() => {
                  message.info("Your time on this board has ended.");
                  // lease is over; you probably want to go back home
                  navigate("/");
                }}
              />
            </div>
          </Tooltip>
        )}

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
    [myBoard, leaseUntilMs, status, navigate]
  );

  const canUpload =
    !!user &&
    !!myBoard &&
    !!isLeaseActive &&
    user.board === myBoard.id;

  // Upload handler: require a user + claimed board, then upload & flash
  const handleUpload = async (file: File) => {
    try {
      if (!user) {
        message.error("Please register first on the Home page before uploading.");
        navigate("/");
        return;
      }

      if (!myBoard || !isLeaseActive || user.board !== myBoard.id) {
        message.error(
          "No active lease for this board. Please connect to this board from the Home page."
        );
        navigate("/");
        return;
      }

      const boardId = myBoard.id;
      console.log("[BoardPage] uploading file:", file);

      // Upload bitstream
      const { jobId } = await dispatch(
        uploadBitstream({ boardId, file })
      ).unwrap();

      // Flash board
      await dispatch(flashBoard({ boardId, jobId })).unwrap();

      message.success(`Bitstream flashed to ${boardId}`);
    } catch (err) {
      const msg =
        typeof err === "string"
          ? err
          : "Failed to upload or flash bitstream.";
      message.error(msg);
    }
  };

  // Exit handler: confirm + release board + clear user.board + go home
  const handleBackHome = () => {
    // If no board or lease already inactive, just go home
    if (!myBoard || !isLeaseActive) {
      navigate("/");
      return;
    }

    Modal.confirm({
      title: "Release this board?",
      content:
        "Are you sure you want to exit? This will release the board so other users can claim it.",
      okText: "Yes, release board",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          // Release on backend (student-initiated release)
          await dispatch(
            releaseBoard({ boardId: myBoard.id })
          ).unwrap();

          // Clear board from user so Home won't auto-redirect back
          const updatedUser: StudentUser | null = user
            ? { ...user, board: null }
            : null;
          dispatch(setUser(updatedUser));

          message.success("Board released. You have exited the session.");
          navigate("/");
        } catch (err) {
          const msg =
            typeof err === "string"
              ? err
              : "Failed to release board. Please try again.";
          message.error(msg);
        }
      },
    });
  };

  return (
    <PageContainer
      header={{
        title: `Board ${boardIdParam}`,
        onBack: handleBackHome,
      }}
      extra={extraHeader}
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
      }}
      token={{
        paddingBlockPageContainerContent: 16,
        paddingInlinePageContainerContent: 16,
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          width: "100%",
          justifyContent: "center",
          padding: 16,
          minHeight: 0,
        }}
      >
        <Spin spinning={isLoading}>
          {canUpload ? (
            <UploadCard
              accept=".bit,.svf,.sv"
              maxSizeMB={100}
              onUpload={handleUpload}
            />
          ) : (
            <ProCard
              title="Cannot upload to this board"
              subTitle="You must have an active lease on this board to upload a bitstream."
              headerBordered
              bordered
              size="small"
              bodyStyle={{ padding: 16 }}
              style={{ width: "100%", maxWidth: 640 }}
            >
              <Space
                direction="vertical"
                size={12}
                style={{ width: "100%", textAlign: "center" }}
              >
                <Typography.Paragraph>
                  Either your lease expired, you are not registered, or this is
                  not the board you reserved.
                </Typography.Paragraph>
                <Button type="primary" onClick={handleBackHome}>
                  Go back to Home
                </Button>
              </Space>
            </ProCard>
          )}
        </Spin>
      </div>
    </PageContainer>
  );
};

export default BoardPage;