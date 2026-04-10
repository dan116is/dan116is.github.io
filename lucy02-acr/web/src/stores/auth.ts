import { create } from "zustand";
import { api, setToken, clearToken, type User } from "../lib/api";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  init: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,

  init: () => {
    const token = localStorage.getItem("access_token");
    const userStr = localStorage.getItem("user");
    if (token && userStr) {
      setToken(token);
      set({ user: JSON.parse(userStr), loading: false });
    } else {
      set({ loading: false });
    }
  },

  login: async (email, password) => {
    const resp = await api.auth.login(email, password);
    setToken(resp.access_token);
    localStorage.setItem("refresh_token", resp.refresh_token);
    localStorage.setItem("user", JSON.stringify(resp.user));
    set({ user: resp.user });
  },

  logout: () => {
    clearToken();
    localStorage.removeItem("user");
    set({ user: null });
    window.location.href = "/login";
  },
}));
