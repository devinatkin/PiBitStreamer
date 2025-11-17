// src/pages/Home.tsx
import { PageContainer, ProCard } from "@ant-design/pro-components";
import {
  Badge,
  Button,
  message,
  Space,
  Spin,
  Statistic,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import React, { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import StudentInitModal, {
  type StudentUser,
} from "../components/StudentInitModal";
import UploadCard from "../components/UploadCard";
import type { BoardType } from "../features/boards/boardsService";
import {
  fetchBoards,
  flashBoard,
  uploadBitstream,
} from "../features/boards/boardsSlice";

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

const loadStudentFromStorage = (): StudentUser | null => {
  const raw = localStorage.getItem("pibit_student");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StudentUser;
    if (!parsed.id || !parsed.username) return null;
    return parsed;
  } catch {
    return null;
  }
};

const Home: React.FC = () => {
  const dispatch = useAppDispatch();
  const { boards, isLoading } = useAppSelector((state) => state.boards);

  const [student, setStudent] = useState<StudentUser | null>(() =>
    loadStudentFromStorage()
  );
  // key used to force-remount StudentInitModal when we want to reopen it
  const [modalKey, setModalKey] = useState(0);

  // keep localStorage in sync if student changes
  useEffect(() => {
    if (student) {
      localStorage.setItem("pibit_student", JSON.stringify(student));
    } else {
      localStorage.removeItem("pibit_student");
    }
  }, [student]);

  // Load boards once on mount
  useEffect(() => {
    dispatch(fetchBoards());
  }, [dispatch]);

  // Find this student's board (by id from student.board)
  const myBoard: BoardType | null = useMemo(() => {
    if (!student?.board) return null;
    return boards.find((b) => b.id === student.board) || null;
  }, [boards, student]);

  // lease time as ms
  const leaseUntilMs: number | null = useMemo(() => {
    if (!myBoard?.leaseUntil) return null;
    if (typeof myBoard.leaseUntil === "number") return myBoard.leaseUntil;
    const t = new Date(myBoard.leaseUntil).getTime();
    return Number.isNaN(t) ? null : t;
  }, [myBoard]);

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
                  // mark student as no longer attached to a board
                  setStudent((prev) =>
                    prev ? { ...prev, board: null } : prev
                  );
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
    [myBoard, leaseUntilMs, status]
  );

  const canUpload =
    !!student && !!student.board && !!myBoard && !!isLeaseActive;

  // Upload handler: require a student + claimed board, then upload & flash
  const handleUpload = async (file: File) => {
    try {
      if (!student) {
        message.error("Please register first before uploading.");
        return;
      }

      if (!student.board || !myBoard || !isLeaseActive) {
        message.error("No active board lease. Please connect to a board.");
        return;
      }

      const boardId = student.board;
      console.log("[Home] uploading file:", file);

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

  const handleConnectClick = () => {
    // Reset current student/board and reopen modal
    setStudent(null);
    setModalKey((k) => k + 1);
  };

  return (
    <>
      {/* First-time user / reconnection onboarding */}
      <StudentInitModal
        key={modalKey}
        student={student}
        onRegistered={(s) => setStudent(s)}
      />

      <PageContainer
        header={{ title: "Welcome to the PiBitStream" }}
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
                title="No board connected"
                subTitle="You need to reserve a board before uploading a bitstream."
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
                    Your session may have expired, or you closed the connection
                    dialog.
                  </Typography.Paragraph>
                  <Button type="primary" onClick={handleConnectClick}>
                    Click here to connect to a board
                  </Button>
                </Space>
              </ProCard>
            )}
          </Spin>
        </div>
      </PageContainer>
    </>
  );
};

export default Home;