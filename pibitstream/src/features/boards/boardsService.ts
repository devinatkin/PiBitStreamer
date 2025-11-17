// src/features/boards/boardsService.ts
import axios from "axios";

let API_URL = "";
if (!import.meta.env.PROD) {
  API_URL = "http://localhost:5000/api/"; // dev backend
} else {
  API_URL = "/api/";                       // prod via same origin
}

export interface BoardType {
  id: string;
  status: "READY" | "BUSY" | "FLASHING" | "ERROR";
  userid: string | null;
  ip: string | null;
  leaseSince: number | null;   // Date.now() from backend
  leaseUntil: number | null;
  secondsLeft: number;
  lastError: string | null;
  currentJobId: string | null;
}

// GET /api/boards
const getBoards = async (): Promise<BoardType[]> => {
  try {
    const { data } = await axios.get(API_URL + "boards");
    // backend: { boards: [...] }
    return data.boards as BoardType[];
  } catch (error) {
    console.log("error from BoardsService.getBoards: ", error);
    throw error;
  }
};

// POST /api/boards/:id/claim
// body: { userid, leaseMinutes }
const claimBoard = async (payload: {
  boardId: string;
  userid: string;
  leaseMinutes?: number;
}): Promise<BoardType> => {
  const { boardId, userid, leaseMinutes } = payload;

  try {
    const { data } = await axios.post(
      API_URL + `boards/${boardId}/claim`,
      {
        userid,
        leaseMinutes,
      }
    );
    // backend: { board }
    return data.board as BoardType;
  } catch (error) {
    console.log("error from BoardsService.claimBoard: ", error);
    throw error;
  }
};

// POST /api/boards/:id/upload  (multipart)
// returns { jobId, board }
const uploadBitstream = async (payload: {
  boardId: string;
  file: File;
}): Promise<{ jobId: string; board: BoardType }> => {
  const { boardId, file } = payload;

  const formData = new FormData();
  formData.append("file", file);
  try {
    const { data } = await axios.post(
      API_URL + `boards/${boardId}/upload`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    // backend: { jobId, board }
    return {
      jobId: data.jobId as string,
      board: data.board as BoardType,
    };
  } catch (error) {
    console.log("error from BoardsService.uploadBitstream: ", error);
    throw error;
  }
};

// POST /api/boards/:id/flash
// body: { jobId }
// returns { board }
const flashBoard = async (payload: {
  boardId: string;
  jobId: string;
}): Promise<BoardType> => {
  const { boardId, jobId } = payload;

  try {
    const { data } = await axios.post(
      API_URL + `boards/${boardId}/flash`,
      { jobId }
    );
    return data.board as BoardType;
  } catch (error) {
    console.log("error from BoardsService.flashBoard: ", error);
    throw error;
  }
};

const boardsService = {
  getBoards,
  claimBoard,
  uploadBitstream,
  flashBoard,
};

export default boardsService;
