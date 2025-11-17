import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { AxiosError } from "axios";
import authService from "./authService";

export interface UserType {
  id: number;
  username: string;
  role: string;
  token: string;
  message: string;
}
//Get user from Local Storage
const storedUser = localStorage.getItem("user");
const user: UserType | null = storedUser ? JSON.parse(storedUser) : null;

interface AuthState {
  user: UserType | null;
  isError: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  message: string;
}

const initialState: AuthState = {
  user: user ? user : null,
  isError: false,
  isLoading: false,
  isSuccess: false,
  message: "",
};

// Login User
export const login = createAsyncThunk<UserType, { username: string; password: string }, { rejectValue: string }>(
  "auth/login", async (user, thunkAPI) => {
  try {
    return await authService.login(user);
  } catch (err) {
    const error = err as AxiosError<{ message?: string }>;

    const message =
      error.response?.data?.message ??
      error.message ??
      "An unexpected error occurred";

    return thunkAPI.rejectWithValue(message);
  }
});


export const authSlice = createSlice({
  name: "auth",
  initialState,
  // for syncronous functions
  reducers: {
    // reset to initial state
    reset: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = "";
    },

    logout: (state) => {
      authService.logout();
      state.user = null;
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = "";
    },
  },
  // for async functions
  extraReducers: (builder) => {
    builder

      .addCase(login.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(login.fulfilled, (state, action) => {
        console.log("went to fulfilled");
        state.isLoading = false;
        state.isSuccess = true;
        state.user = action.payload;
      })
      .addCase(login.rejected, (state, action) => {
        console.log("went to rejected");
        state.isLoading = false;
        state.isSuccess = false;
        state.isError = true;
        state.message = action.payload ?? "An error occurred in the Auth Slice";
        state.user = null;
      });
  },
});

export const { reset, logout } = authSlice.actions;

export default authSlice.reducer;
