export interface SessionResponse {
  sessionId: string;
  accessToken: string;
  hubUrl: string;
  deviceLoginUrl: string;
}

export interface TokenResponse {
  access_token: string;
  expires_in: number;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: "added" | "uploading" | "success" | "error";
  error?: string;
  url?: string;
  thumbnailBase64?: string;
}

export interface QrCodeGeneratorState {
  loading: boolean;
  isConnected: boolean;
  retry: boolean;
  deviceLoginUrl: string;
  uploadedFiles: UploadedFile[];
}
