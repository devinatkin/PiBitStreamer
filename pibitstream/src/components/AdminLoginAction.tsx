import { UserSwitchOutlined } from "@ant-design/icons";
import { Alert, Button, Form, Input, message, Modal } from "antd";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { login } from "../features/auth/authSlice";

type LoginFormValues = {
  username: string;
  password: string;
};

const AdminLoginAction: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<LoginFormValues>();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const isLoading = useAppSelector((state) => state.auth.isLoading);

  const handleOpen = () => {
    setSubmitError(null);
    setOpen(true);
  };

  const handleCancel = () => {
    setOpen(false);
    setSubmitError(null);
    form.resetFields();
  };

  const onFinish = async (values: LoginFormValues) => {
    setSubmitError(null);

    try {
      // login thunk: rejectWithValue(message: string)
      await dispatch(login(values)).unwrap();
      message.success("Logged in as admin");
      setOpen(false);
      form.resetFields();
      navigate("/admin");
    } catch (err) {
      const errorMessage =
        typeof err === "string" ? err : "Login failed. Please try again.";
      setSubmitError(errorMessage);
    }
  };

  return (
    <>
      <>
        <button
          type="button"
          onClick={handleOpen}
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            padding: 0,
            color: "inherit",
          }}
          aria-label="Admin login"
        >
          <UserSwitchOutlined />
        </button>
      </>

      <Modal
        open={open}
        title="Admin Login"
        onCancel={handleCancel}
        footer={null}
        destroyOnHidden
      >
        {submitError && (
          <Alert
            type="error"
            showIcon
            message={submitError}
            style={{ marginBottom: 16 }}
          />
        )}

        <Form<LoginFormValues> form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="Username"
            name="username"
            rules={[{ required: true, message: "Please enter your username" }]}
          >
            <Input autoComplete="username" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: "Please enter your password" }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>

          <Form.Item style={{ textAlign: "right", marginBottom: 0 }}>
            <Button onClick={handleCancel} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={isLoading}>
              Login
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default AdminLoginAction;