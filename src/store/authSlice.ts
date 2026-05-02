import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type AuthUser = {
  id: string;
  email: string;
  fullName?: string | null;
  /** Set at sign-in: true → onboarding; false → main app; omit → use profile check via API. */
  isNewUser?: boolean;
};

export type AuthState = {
  token: string | null;
  user: AuthUser | null;
  hydrated: boolean;
};

const initialState: AuthState = {
  token: null,
  user: null,
  hydrated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setSession(state, action: PayloadAction<{ token: string; user: AuthUser }>) {
      state.token = action.payload.token;
      state.user = action.payload.user;
    },
    clearSession(state) {
      state.token = null;
      state.user = null;
    },
    setHydrated(state, action: PayloadAction<boolean>) {
      state.hydrated = action.payload;
    },
  },
});

export const { setSession, clearSession, setHydrated } = authSlice.actions;
export const authReducer = authSlice.reducer;
