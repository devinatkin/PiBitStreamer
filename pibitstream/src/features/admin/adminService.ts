// src/features/admin/adminService.ts
import axios from "axios";
import type { BoardType } from "../boards/boardsService";

let API_URL = "";
if (!import.meta.env.PROD) {
  API_URL = "http://localhost:5000/api/"; // dev
} else {
  API_URL = "/api/";                       // prod
}

// GET /api/boards/admin/boards  (protected)
const getBoardsAdmin = async (token: string): Promise<BoardType[]> => {
  const { data } = await axios.get(API_URL + "boards/admin", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // backend shape: { boards: [...] }
  return data.boards as BoardType[];
};

// POST /api/boards/:id/force-release  (protected)
const forceReleaseBoard = async (
  boardId: string,
  token: string
): Promise<BoardType> => {
  const { data } = await axios.post(
    API_URL + `boards/${boardId}/force-release`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  // backend shape: { board }
  return data.board as BoardType;
};

// POST /api/boards/:id/reboot  (protected)
const rebootBoard = async (
  boardId: string,
  token: string
): Promise<BoardType> => {
  const { data } = await axios.post(
    API_URL + `boards/${boardId}/reboot`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  // backend shape: { board }
  return data.board as BoardType;
};

const adminService = {
  getBoardsAdmin,
  forceReleaseBoard,
  rebootBoard,
};

export default adminService;
