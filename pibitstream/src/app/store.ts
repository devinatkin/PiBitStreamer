import { type Action, type ThunkAction, configureStore } from "@reduxjs/toolkit";
import adminReducer from "../features/admin/adminSlice";
import authReducer from "../features/auth/authSlice";
import boardsReducer from "../features/boards/boardsSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    boards: boardsReducer,
    admin: adminReducer
  },
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
