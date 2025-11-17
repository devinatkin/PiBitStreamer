// src/components/StudentInitModal.tsx
import { Button, Form, Input, message, Modal } from "antd";
import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import type { BoardType } from "../features/boards/boardsService";
import { claimBoard, fetchBoards } from "../features/boards/boardsSlice";
import {
  registerUser,
  type StudentUser,
} from "../features/user/userSlice";

interface StudentInitModalProps {
  student: StudentUser | null;
  onRegistered: (student: StudentUser) => void;
}

const StudentInitModal: React.FC<StudentInitModalProps> = ({
  student,
  onRegistered,
}) => {
  // Open if there is no student OR the student has no board yet
  const [open, setOpen] = useState<boolean>(() => !student || !student.board);
  const [form] = Form.useForm<{ username: string }>();
  const dispatch = useAppDispatch();
  const { boards, isLoading } = useAppSelector((state) => state.boards);

  // Make sure we have boards loaded
  useEffect(() => {
    if (!boards.length) {
      dispatch(fetchBoards());
    }
  }, [boards.length, dispatch]);

  // Close when the student actually has a board
  useEffect(() => {
    if (student?.board) {
      setOpen(false);
    }
  }, [student?.board]);

  const handleSubmit = async (values: { username: string }) => {
    try {
      const username = values.username.trim();
      if (!username) {
        message.error("Please enter a username.");
        return;
      }

      // pick first READY board
      const readyBoard: BoardType | undefined = boards.find(
        (b) => b.status === "READY"
      );

      if (!readyBoard) {
        message.error(
          "No boards are currently available. Please try again later."
        );
        return;
      }

      // create UUID for this user
      const userid =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      // 1) Register user in backend (SQLite users table)
      await dispatch(
        registerUser({ id: userid, username })
      ).unwrap();

      // 2) Claim board for this user (30 min lease)
      const claimedBoard = await dispatch(
        claimBoard({
          boardId: readyBoard.id,
          userid,
          leaseMinutes: 30,
        })
      ).unwrap();

      // 3) Build StudentUser object for frontend
      const newStudent: StudentUser = {
        id: userid,
        username,
        role: "student",
        board: claimedBoard.id,
      };

      // Still mirror to localStorage for soft persistence
      localStorage.setItem("pibit_student", JSON.stringify(newStudent));

      onRegistered(newStudent);
      message.success(`Board ${claimedBoard.id} claimed.`);
      setOpen(false);
      form.resetFields();
    } catch (err) {
      const msg =
        typeof err === "string"
          ? err
          : "Failed to register user or claim a board. Please try again.";
      message.error(msg);
    }
  };

  return (
    <Modal
      open={open}
      title="Welcome to PiBitStream"
      maskClosable
      closable
      onCancel={() => {
        setOpen(false);
        form.resetFields();
      }}
      footer={null}        // hide default Cancel / OK buttons
      destroyOnClose       // correct AntD prop
    >
      <p style={{ marginBottom: 16 }}>
        Please enter your name so we can reserve a board for you.
      </p>

      <Form<{ username: string }>
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          label="Username"
          name="username"
          rules={[
            { required: true, message: "Please enter a username" },
            { max: 32, message: "Username is too long" },
          ]}
        >
          <Input placeholder="e.g. sfuentes" autoFocus />
        </Form.Item>

        <Form.Item style={{ textAlign: "right", marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" loading={isLoading}>
            Continue
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default StudentInitModal;