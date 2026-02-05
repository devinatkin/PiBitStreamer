// src/pages/Home.tsx
import { PageContainer, ProCard } from "@ant-design/pro-components";
import { Button, message, Space, Spin, Typography } from "antd";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import StudentInitModal from "../components/StudentInitModal";
import type { BoardType } from "../features/boards/boardsService";
import { fetchBoards } from "../features/boards/boardsSlice";
import {
  hydrateFromStorage,
  setUser,
  type StudentUser,
} from "../features/user/userSlice";

const Home: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { boards, isLoading } = useAppSelector((state) => state.boards);
  const { user } = useAppSelector((state) => state.user);

  const [modalKey, setModalKey] = useState(0);

  // Avoid spamming messages in effects
  const warnedStaleRef = useRef(false);

  // On first load: hydrate user from localStorage (identity only)
  useEffect(() => {
    dispatch(hydrateFromStorage());
  }, [dispatch]);

  // Load boards once on mount
  useEffect(() => {
    dispatch(fetchBoards());
  }, [dispatch]);

  // Find this user's board in Redux state (backend source of truth)
  const myBoard: BoardType | null = useMemo(() => {
    if (!user?.board) return null;
    return boards.find((b) => b.id === user.board) || null;
  }, [boards, user?.board]);

  // lease time as ms (backend already sends ms numbers)
  const leaseUntilMs: number | null = useMemo(
    () => (myBoard ? myBoard.leaseUntil : null),
    [myBoard]
  );

  const isLeaseActive = !!leaseUntilMs && leaseUntilMs > Date.now();

  // ✅ Only consider "has board reserved" if the lease is ACTIVE
  const hasActiveLease = !!user?.board && isLeaseActive;

  // If user has a board saved but backend says lease is NOT active, it is stale
  const hasStaleSavedBoard = !!user?.board && !isLeaseActive;

  // ✅ If lease is active, auto-redirect to board page
  useEffect(() => {
    if (hasActiveLease && user?.board) {
      navigate(`/board/${encodeURIComponent(user.board)}`, { replace: true });
    }
  }, [hasActiveLease, user?.board, navigate]);

  // ✅ If admin force-released / lease expired, clear local saved board
  useEffect(() => {
    if (!user?.board) {
      warnedStaleRef.current = false;
      return;
    }

    if (hasStaleSavedBoard) {
      // Show a warning once
      if (!warnedStaleRef.current) {
        warnedStaleRef.current = true;
        message.warning("Your board lease is no longer active. Please reconnect to claim a board again.");
      }

      const cleared: StudentUser = { ...user, board: null };
      dispatch(setUser(cleared));
    }
  }, [hasStaleSavedBoard, user, dispatch]);

  const handleConnectClick = () => {
    const cleared: StudentUser | null = user ? { ...user, board: null } : null;
    dispatch(setUser(cleared));
    setModalKey((k) => k + 1);
  };

  const handleOpenBoardPage = () => {
    if (!user?.board) {
      message.error("You don’t have a board reserved yet.");
      return;
    }
    navigate(`/board/${encodeURIComponent(user.board)}`);
  };

  return (
    <>
      <StudentInitModal
        key={modalKey}
        student={user}
        onRegistered={(s) => {
          dispatch(setUser(s));
          if (s.board) {
            navigate(`/board/${encodeURIComponent(s.board)}`);
          }
        }}
      />

      <PageContainer
        header={{ title: "Welcome to the PiBitStream" }}
        style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
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
            <ProCard
              title={hasActiveLease ? "You have a board reserved" : "No active board lease"}
              subTitle={
                hasActiveLease
                  ? "You can open your board page to upload and flash bitstreams."
                  : "Your lease may have expired or been released by an admin. Reconnect to claim a board."
              }
              headerBordered
              bordered
              size="small"
              bodyStyle={{ padding: 16 }}
              style={{ width: "100%", maxWidth: 750 }}
            >
              <Space direction="vertical" size={12} style={{ width: "100%", textAlign: "center" }}>
                {hasActiveLease ? (
                  <>
                    <Typography.Paragraph>
                      Board ID: <strong>{user!.board}</strong>
                    </Typography.Paragraph>
                    <Space>
                      <Button onClick={handleConnectClick}>Change / reconnect to a different board</Button>
                      <Button type="primary" onClick={handleOpenBoardPage}>
                        Open board page
                      </Button>
                    </Space>
                  </>
                ) : (
                  <>
                    <Typography.Paragraph>
                      Use the button below to join the waitlist and claim a board.
                    </Typography.Paragraph>
                    <Button type="primary" onClick={handleConnectClick}>
                      Click here to connect to a board
                    </Button>
                  </>
                )}
              </Space>
            </ProCard>
          </Spin>
        </div>
      </PageContainer>
    </>
  );
};

export default Home;