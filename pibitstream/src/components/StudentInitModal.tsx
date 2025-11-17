// src/components/StudentInitModal.tsx
import { Button, Form, Input, message, Modal } from "antd";
import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import type { BoardType } from "../features/boards/boardsService";
import { claimBoard, fetchBoards } from "../features/boards/boardsSlice";

export interface StudentUser {
  id: string;
  username: string;
  role: "student";
  board: string | null;
}

interface StudentInitModalProps {
  student: StudentUser | null;
  onRegistered: (student: StudentUser) => void;
}

const StudentInitModal: React.FC<StudentInitModalProps> = ({
  student,
  onRegistered,
}) => {
  const [open, setOpen] = useState(!student);
  const [form] = Form.useForm<{ username: string }>();
  const dispatch = useAppDispatch();
  const { boards, isLoading } = useAppSelector((state) => state.boards);

  // Make sure we have boards loaded
  useEffect(() => {
    if (!boards.length) {
      dispatch(fetchBoards());
    }
  }, [boards.length, dispatch]);

  // If student becomes defined externally, close modal
  useEffect(() => {
    if (student) {
      setOpen(false);
    }
  }, [student]);

  const handleSubmit = async (values: { username: string }) => {
    try {
      // pick first READY board
      const readyBoard: BoardType | undefined = boards.find(
        (b) => b.status === "READY"
      );

      if (!readyBoard) {
        message.error("No boards are currently available. Please try again later.");
        return;
      }

      // create UUID
      const userid =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      // claim board for this user (30 min)
      const claimedBoard = await dispatch(
        claimBoard({
          boardId: readyBoard.id,
          userid,
          leaseMinutes: 30,
        })
      ).unwrap();

      const newStudent: StudentUser = {
        id: userid,
        username: values.username.trim(),
        role: "student",
        board: claimedBoard.id,
      };

      // persist in localStorage
      localStorage.setItem("pibit_student", JSON.stringify(newStudent));

      onRegistered(newStudent);
      message.success(`Board ${claimedBoard.id} claimed.`);
      setOpen(false);
      form.resetFields();
    } catch (err) {
      const msg =
        typeof err === "string"
          ? err
          : "Failed to claim a board. Please try again.";
      message.error(msg);
    }
  };

  return (
    <Modal
      open={open}
      title="Welcome to PiBitStream"
      maskClosable={true}
      closable={true}             
      onCancel={() => {
        setOpen(false);
        form.resetFields();
      }}
      footer={null}
      destroyOnHidden
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
          <Button
            type="primary"
            htmlType="submit"
            loading={isLoading}
          >
            Continue
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default StudentInitModal;
