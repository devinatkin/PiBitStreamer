// src/features/user/userService.ts
import axios from "axios";

export interface StudentUser {
  id: string;
  username: string;
  role: "student" | string;
  board: string | null; // mapped from backend current_board_id
}

interface RegisterUserResponse {
  success: boolean;
  user: {
    id: string;
    username: string;
    role?: string;
    current_board_id: string | null;
  };
}

let API_URL = "";
if (!import.meta.env.PROD) {
  API_URL = "http://localhost:5000/api/users"; // dev backend
} else {
  API_URL = "/api/users";                       // prod via same origin
}

async function registerUser(payload: {
  id: string;
  username: string;
}): Promise<StudentUser> {
  const res = await axios.post<RegisterUserResponse>(`${API_URL}/register`, payload);
  const u = res.data.user;
  return {
    id: u.id,
    username: u.username,
    role: (u.role as string) || "student",
    board: u.current_board_id, // important: map DB -> frontend
  };
}

export default { registerUser };
