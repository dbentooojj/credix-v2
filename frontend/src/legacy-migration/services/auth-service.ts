import { apiClient } from "./api-client";

export type AuthUser = {
  sub: string;
  name: string;
  email: string;
  role: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type UpdateProfilePayload = {
  name: string;
  email: string;
};

export type UpdatePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

export type LoginResponse = {
  message: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
};

export type AuthMeResponse = {
  user: AuthUser;
};

export type AuthMessageResponse = {
  message: string;
};

export async function login(payload: LoginPayload) {
  return apiClient.post<LoginResponse, LoginPayload>("/auth/login", payload);
}

export async function forgotPassword(email: string) {
  return apiClient.post<AuthMessageResponse, { email: string }>("/auth/forgot-password", { email });
}

export async function resetPassword(token: string, newPassword: string, confirmPassword: string) {
  return apiClient.post<AuthMessageResponse, { token: string; newPassword: string; confirmPassword: string }>("/auth/reset-password", {
    token,
    newPassword,
    confirmPassword,
  });
}

export async function getCurrentSession(signal?: AbortSignal) {
  return apiClient.get<AuthMeResponse>("/auth/me", { signal });
}

export async function logout() {
  return apiClient.post<AuthMessageResponse>("/auth/logout");
}

export async function updateProfile(payload: UpdateProfilePayload) {
  return apiClient.patch<LoginResponse, UpdateProfilePayload>("/auth/profile", payload);
}

export async function updatePassword(payload: UpdatePasswordPayload) {
  return apiClient.patch<AuthMessageResponse, UpdatePasswordPayload>("/auth/password", payload);
}
