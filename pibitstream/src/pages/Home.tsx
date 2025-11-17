// src/pages/Home.tsx
import { PageContainer, ProCard } from "@ant-design/pro-components";
import { Button, message, Space, Spin, Typography } from "antd";
import React, { useEffect, useMemo, useState } from "react";
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

  // key used to force-remount StudentInitModal when we want to reopen it
  const [modalKey, setModalKey] = useState(0);

  // On first load: hydrate user from localStorage (identity only)
  useEffect(() => {
    dispatch(hydrateFromStorage());
  }, [dispatch]);

  // Load boards once on mount
  useEffect(() => {
    dispatch(fetchBoards());
  }, [dispatch]);

  // Find this user's board in Redux state (using backend as source of truth)
  const myBoard: BoardType | null = useMemo(() => {
    if (!user?.board) return null;
    return boards.find((b) => b.id === user.board) || null;
  }, [boards, user]);

  // lease time as ms (backend already sends ms numbers)
  const leaseUntilMs: number | null = useMemo(
    () => (myBoard ? myBoard.leaseUntil : null),
    [myBoard]
  );

  const isLeaseActive = !!leaseUntilMs && leaseUntilMs > Date.now();

  // Auto-redirect to board page if user already has an active lease
  useEffect(() => {
    if (user?.board && isLeaseActive) {
      navigate(`/board/${encodeURIComponent(user.board)}`, { replace: true });
    }
  }, [user?.board, isLeaseActive, navigate]);

  const handleConnectClick = () => {
    // Reset current user.board and reopen modal
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

  const hasBoard = !!user?.board;

  return (
    <>
      {/* First-time user / reconnection onboarding */}
      <StudentInitModal
        key={modalKey}
        student={user}
        onRegistered={(s) => {
          // After a successful claim, save student AND go straight to board page
          dispatch(setUser(s));
          if (s.board) {
            navigate(`/board/${encodeURIComponent(s.board)}`);
          }
        }}
      />

      <PageContainer
        header={{ title: "Welcome to the PiBitStream" }}
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
            <ProCard
              title={hasBoard ? "You have a board reserved" : "No board connected"}
              subTitle={
                hasBoard
                  ? "You can open your board page to upload and flash bitstreams."
                  : "You need to reserve a board to join the waitlist and start using PiBitStream."
              }
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
                {hasBoard ? (
                  <>
                    <Typography.Paragraph>
                      Board ID: <strong>{user!.board}</strong>
                    </Typography.Paragraph>
                    <Space>
                      <Button onClick={handleConnectClick}>
                        Change / reconnect to a different board
                      </Button>
                      <Button type="primary" onClick={handleOpenBoardPage}>
                        Open board page
                      </Button>
                    </Space>
                  </>
                ) : (
                  <>
                    <Typography.Paragraph>
                      Your session may have expired, or you haven’t connected yet.
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