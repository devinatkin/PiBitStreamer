// src/features/admin/adminSlice.ts
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { AxiosError } from "axios";
import type { RootState } from "../../app/store";
import type { BoardType } from "../boards/boardsService";
import adminService from "./adminService";

interface AdminState {
  boards: BoardType[];
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  message: string;
}

const initialState: AdminState = {
  boards: [],
  isLoading: false,
  isError: false,
  isSuccess: false,
  message: "",
};

// helper to pull JWT from auth slice
const getToken = (state: RootState): string | null =>
  state.auth.user?.token ?? null;

// GET /api/boards/admin/boards
export const fetchAdminBoards = createAsyncThunk<
  BoardType[],
  void,
  { state: RootState; rejectValue: string }
>("admin/fetchBoards", async (_, thunkAPI) => {
  const token = getToken(thunkAPI.getState());

  if (!token) {
    return thunkAPI.rejectWithValue("Not authenticated");
  }

  try {
    return await adminService.getBoardsAdmin(token);
  } catch (err) {
    const error = err as AxiosError<{ message?: string }>;
    const message =
      error.response?.data?.message ??
      error.message ??
      "Failed to fetch admin boards";
    return thunkAPI.rejectWithValue(message);
  }
});

// POST /api/boards/:id/force-release
export const forceReleaseBoard = createAsyncThunk<
  BoardType,
  { boardId: string },
  { state: RootState; rejectValue: string }
>("admin/forceReleaseBoard", async ({ boardId }, thunkAPI) => {
  const token = getToken(thunkAPI.getState());

  if (!token) {
    return thunkAPI.rejectWithValue("Not authenticated");
  }

  try {
    return await adminService.forceReleaseBoard(boardId, token);
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
  { state: RootState; rejectValue: string }
>("admin/rebootBoard", async ({ boardId }, thunkAPI) => {
  const token = getToken(thunkAPI.getState());

  if (!token) {
    return thunkAPI.rejectWithValue("Not authenticated");
  }

  try {
    return await adminService.rebootBoard(boardId, token);
  } catch (err) {
    const error = err as AxiosError<{ message?: string }>;
    const message =
      error.response?.data?.message ??
      error.message ??
      "Failed to reboot board";
    return thunkAPI.rejectWithValue(message);
  }
});

export const adminSlice = createSlice({
  name: "admin",
  initialState,
  reducers: {
    resetAdmin: (state) => {
      state.isLoading = false;
      state.isError = false;
      state.isSuccess = false;
      state.message = "";
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchAdminBoards
      .addCase(fetchAdminBoards.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchAdminBoards.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.boards = action.payload;
      })
      .addCase(fetchAdminBoards.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.isSuccess = false;
        state.message =
          action.payload ?? "Failed to fetch admin boards in Admin Slice";
      })

      // forceReleaseBoard
      .addCase(forceReleaseBoard.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(forceReleaseBoard.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;

        const idx = state.boards.findIndex(
          (b) => b.id === action.payload.id
        );
        if (idx !== -1) {
          state.boards[idx] = action.payload;
        } else {
          state.boards.push(action.payload);
        }
      })
      .addCase(forceReleaseBoard.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.isSuccess = false;
        state.message =
          action.payload ?? "Failed to force-release board in Admin Slice";
      })

      // rebootBoard
      .addCase(rebootBoard.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(rebootBoard.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;

        const idx = state.boards.findIndex(
          (b) => b.id === action.payload.id
        );
        if (idx !== -1) {
          state.boards[idx] = action.payload;
        } else {
          state.boards.push(action.payload);
        }
      })
      .addCase(rebootBoard.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.isSuccess = false;
        state.message =
          action.payload ?? "Failed to reboot board in Admin Slice";
      });
  },
});

export const { resetAdmin } = adminSlice.actions;

export default adminSlice.reducer;
