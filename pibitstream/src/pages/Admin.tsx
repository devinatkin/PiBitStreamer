// src/pages/Admin.tsx
import { PageContainer } from "@ant-design/pro-components";
import { Col, Row, Spin, message } from "antd";
import React, { useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import BoardCard, { type BoardStatus } from "../components/BoardCard";
import {
  fetchAdminBoards,
  forceReleaseBoard,
  rebootBoard,
} from "../features/admin/adminSlice";
import type { BoardType } from "../features/boards/boardsService";

const mapStatus = (s: BoardType["status"]): BoardStatus =>
  s.toLowerCase() as BoardStatus; // "READY" -> "ready", etc.

const formatTime = (value: number | string | null | undefined): string | undefined => {
  if (!value) return undefined;
  const d = typeof value === "number" ? new Date(value) : new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const Admin: React.FC = () => {
  const dispatch = useAppDispatch();
  const { boards, isLoading, isError, message: errMsg } = useAppSelector(
    (state) => state.admin
  );

  console.log("boards", boards)

  // initial load
  useEffect(() => {
    dispatch(fetchAdminBoards());
  }, [dispatch]);

  // surface errors
  useEffect(() => {
    if (isError && errMsg) {
      message.error(errMsg);
    }
  }, [isError, errMsg]);

  const viewBoards = useMemo(
    () =>
      boards.map((b) => ({
        name: b.id as "Basys3-A" | "Basys3-B" | "Basys3-C" | "Basys3-D",
        status: mapStatus(b.status),
        user: b.userid ?? undefined,
        ip: b.ip ?? undefined,
        since: formatTime(b.leaseSince),
        until: formatTime(b.leaseUntil),
      })),
    [boards]
  );

  const handleRefresh = () => {
    dispatch(fetchAdminBoards());
  };

  const handleForceRelease = async (boardId: string) => {
    try {
      await dispatch(forceReleaseBoard({ boardId })).unwrap();
      message.success(`Board ${boardId} force-released`);
      dispatch(fetchAdminBoards());
    } catch (err) {
      const msg =
        typeof err === "string"
          ? err
          : "Failed to force-release board.";
      message.error(msg);
    }
  };

  const handleReboot = async (boardId: string) => {
    try {
      await dispatch(rebootBoard({ boardId })).unwrap();
      message.success(`Board ${boardId} rebooted`);
      dispatch(fetchAdminBoards());
    } catch (err) {
      const msg =
        typeof err === "string" ? err : "Failed to reboot board.";
      message.error(msg);
    }
  };

  return (
    <PageContainer
      header={{ title: "Admin Dashboard" }}
      style={{ display: "flex", flexDirection: "column", flex: 1 }}
      token={{
        paddingBlockPageContainerContent: 16,
        paddingInlinePageContainerContent: 16,
      }}
    >
      <Spin spinning={isLoading}>
        <Row gutter={[16, 16]} justify="center">
          {viewBoards.map((b) => (
            <Col key={b.name} xs={24} md={12} style={{ display: "flex" }}>
              <div style={{ width: "100%" }}>
                <BoardCard
                  {...b}
                  onRefresh={handleRefresh}
                  onForceRelease={() => handleForceRelease(b.name)}
                  onReboot={() => handleReboot(b.name)}
                />
              </div>
            </Col>
          ))}
        </Row>
      </Spin>
    </PageContainer>
  );
};

export default Admin;
