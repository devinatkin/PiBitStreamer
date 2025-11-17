// src/features/user/userSlice.ts
import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AxiosError } from "axios";
import userService, { type StudentUser } from "./userService";

interface UserState {
  user: StudentUser | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  message: string;
}

const initialState: UserState = {
  user: null,
  isLoading: false,
  isError: false,
  isSuccess: false,
  message: "",
};

// helper to read from localStorage once
function loadUserFromStorage(): StudentUser | null {
  const raw = localStorage.getItem("pibit_student");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StudentUser;
    if (!parsed.id || !parsed.username) return null;
    return parsed;
  } catch {
    return null;
  }
}

// POST /api/users/register
export const registerUser = createAsyncThunk<
  StudentUser,
  { id: string; username: string },
  { rejectValue: string }
>("user/registerUser", async (payload, thunkAPI) => {
  try {
    return await userService.registerUser(payload);
  } catch (err) {
    const error = err as AxiosError<{ message?: string }>;
    const message =
      error.response?.data?.message ??
      error.message ??
      "Failed to register user";
    return thunkAPI.rejectWithValue(message);
  }
});

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    hydrateFromStorage: (state) => {
      const u = loadUserFromStorage();
      state.user = u;
    },
    setUser: (state, action: PayloadAction<StudentUser | null>) => {
      state.user = action.payload;
      if (action.payload) {
        localStorage.setItem("pibit_student", JSON.stringify(action.payload));
      } else {
        localStorage.removeItem("pibit_student");
      }
    },
    resetUser: (state) => {
      state.user = null;
      state.isLoading = false;
      state.isError = false;
      state.isSuccess = false;
      state.message = "";
      localStorage.removeItem("pibit_student");
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.isSuccess = false;
        state.message = "";
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.user = action.payload;
        localStorage.setItem("pibit_student", JSON.stringify(action.payload));
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.isSuccess = false;
        state.message = action.payload ?? "Failed to register user in slice";
      });
  },
});

export const { hydrateFromStorage, setUser, resetUser } = userSlice.actions;
export default userSlice.reducer;
export type { StudentUser };
