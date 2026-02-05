// src/features/boards/boardsSlice.ts
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { AxiosError } from "axios";
import boardsService, { type BoardType } from "./boardsService";

interface BoardsState {
  boards: BoardType[];
  selectedBoard: BoardType | null;
  currentJobId: string | null;
  isError: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  message: string;
}

const initialState: BoardsState = {
  boards: [],
  selectedBoard: null,
  currentJobId: null,
  isError: false,
  isLoading: false,
  isSuccess: false,
  message: "",
};

// ---------- Thunks ----------

// GET /api/boards
export const fetchBoards = createAsyncThunk<
  BoardType[],
  void,
  { rejectValue: string }
>("boards/fetchBoards", async (_, thunkAPI) => {
  try {
    return await boardsService.getBoards();
  } catch (err) {
    const error = err as AxiosError<{ message?: string }>;

    const message =
      error.response?.data?.message ??
      error.message ??
      "An unexpected error occurred while fetching boards";

    return thunkAPI.rejectWithValue(message);
  }
});

// POST /api/boards/:id/claim
export const claimBoard = createAsyncThunk<
  BoardType,
  { boardId: string; userid: string; leaseMinutes?: number },
  { rejectValue: string }
>("boards/claimBoard", async (payload, thunkAPI) => {
  try {
    return await boardsService.claimBoard(payload);
  } catch (err) {
    const error = err as AxiosError<{ message?: string }>;

    const message =
      error.response?.data?.message ??
      error.message ??
      "An unexpected error occurred while claiming board";

    return thunkAPI.rejectWithValue(message);
  }
});

// POST /api/boards/:id/upload
export const uploadBitstream = createAsyncThunk<
  { jobId: string; board: BoardType },
  { boardId: string; file: File },
  { rejectValue: string }
>("boards/uploadBitstream", async (payload, thunkAPI) => {
  try {
    return await boardsService.uploadBitstream(payload);
  } catch (err) {
    const error = err as AxiosError<{ message?: string }>;

    const message =
      error.response?.data?.message ??
      error.message ??
      "An unexpected error occurred while uploading bitstream";

    return thunkAPI.rejectWithValue(message);
  }
});

// POST /api/boards/:id/flash
export const flashBoard = createAsyncThunk<
  BoardType,
  { boardId: string; jobId: string },
  { rejectValue: string }
>("boards/flashBoard", async (payload, thunkAPI) => {
  try {
    return await boardsService.flashBoard(payload);
  } catch (err) {
    const error = err as AxiosError<{ message?: string }>;

    const message =
      error.response?.data?.message ??
      error.message ??
      "An unexpected error occurred while flashing board";

    return thunkAPI.rejectWithValue(message);
  }
});

// POST /api/boards/:id/release (your service can call BoardManager.releaseBoard)
export const releaseBoard = createAsyncThunk<
  BoardType,
  { boardId: string },
  { rejectValue: string }
>("admin/forceReleaseBoard", async ({ boardId }, thunkAPI) => {
  try {
    return await boardsService.releaseBoard(boardId);
  } catch (err) {
    const error = err as AxiosError<{ message?: string }>;
    const message =
      error.response?.data?.message ??
      error.message ??
      "Failed to force-release board";
    return thunkAPI.rejectWithValue(message);
  }
});

// POST /api/boards/:id/reboot
export const rebootBoard = createAsyncThunk<
  BoardType,
  { boardId: string },
  { rejectValue: string }
>("boards/rebootBoard", async ({ boardId }, thunkAPI) => {
  try {
    return await boardsService.rebootBoard(boardId);
  } catch (err) {
    const error = err as AxiosError<{ message?: string }>;
    const message =
      error.response?.data?.message ??
      error.message ??
      "Failed to reboot board";
    return thunkAPI.rejectWithValue(message);
  }
});

// ---------- Slice ----------

export const boardsSlice = createSlice({
  name: "boards",
  initialState,
  reducers: {
    resetBoards: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = "";
    },
    clearSelectedBoard: (state) => {
      state.selectedBoard = null;
      state.currentJobId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchBoards
      .addCase(fetchBoards.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchBoards.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.boards = action.payload;
      })
      .addCase(fetchBoards.rejected, (state, action) => {
        state.isLoading = false;
        state.isSuccess = false;
        state.isError = true;
        state.message =
          action.payload ?? "Failed to fetch boards in Boards Slice";
      })

      // claimBoard
      .addCase(claimBoard.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(claimBoard.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.selectedBoard = action.payload;

        // update the board in the list if it exists
        const idx = state.boards.findIndex((b) => b.id === action.payload.id);
        if (idx !== -1) {
          state.boards[idx] = action.payload;
        } else {
          state.boards.push(action.payload);
        }
      })
      .addCase(claimBoard.rejected, (state, action) => {
        state.isLoading = false;
        state.isSuccess = false;
        state.isError = true;
        state.message =
          action.payload ?? "Failed to claim board in Boards Slice";
      })

      // uploadBitstream
      .addCase(uploadBitstream.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(uploadBitstream.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.currentJobId = action.payload.jobId;
        state.selectedBoard = action.payload.board;

        const idx = state.boards.findIndex(
          (b) => b.id === action.payload.board.id,
        );
        if (idx !== -1) {
          state.boards[idx] = action.payload.board;
        } else {
          state.boards.push(action.payload.board);
        }
      })
      .addCase(uploadBitstream.rejected, (state, action) => {
        state.isLoading = false;
        state.isSuccess = false;
        state.isError = true;
        state.message =
          action.payload ?? "Failed to upload bitstream in Boards Slice";
      })

      // flashBoard
      .addCase(flashBoard.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(flashBoard.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.selectedBoard = action.payload;

        const idx = state.boards.findIndex((b) => b.id === action.payload.id);
        if (idx !== -1) {
          state.boards[idx] = action.payload;
        } else {
          state.boards.push(action.payload);
        }
      })
      .addCase(flashBoard.rejected, (state, action) => {
        state.isLoading = false;
        state.isSuccess = false;
        state.isError = true;
        state.message =
          action.payload ?? "Failed to flash board in Boards Slice";
      })

      // releaseBoard
      .addCase(releaseBoard.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(releaseBoard.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;

        // Board comes back as READY / released
        const released = action.payload;
        state.selectedBoard = released;
        state.currentJobId = null;

        const idx = state.boards.findIndex((b) => b.id === released.id);
        if (idx !== -1) {
          state.boards[idx] = released;
        } else {
          state.boards.push(released);
        }
      })
      .addCase(releaseBoard.rejected, (state, action) => {
        state.isLoading = false;
        state.isSuccess = false;
        state.isError = true;
        state.message =
          action.payload ?? "Failed to release board in Boards Slice";
      })

      .addCase(rebootBoard.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(rebootBoard.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;

        const rebooted = action.payload;
        state.selectedBoard = rebooted;
        state.currentJobId = null;

        const idx = state.boards.findIndex((b) => b.id === rebooted.id);
        if (idx !== -1) {
          state.boards[idx] = rebooted;
        } else {
          state.boards.push(rebooted);
        }
      })
      .addCase(rebootBoard.rejected, (state, action) => {
        state.isLoading = false;
        state.isSuccess = false;
        state.isError = true;
        state.message =
          action.payload ?? "Failed to reboot board in Boards Slice";
      });
  },
});

export const { resetBoards, clearSelectedBoard } = boardsSlice.actions;

export default boardsSlice.reducer;
