export type TreeNodeType = "folder" | "device";

export interface TreeNode {
  name: string;
  type: TreeNodeType;
  depth: number;
  deviceId?: number;
  children?: TreeNode[];
}

export interface LoginResponse {
  authenticated: boolean;
  email?: string;
  needsOnboarding?: boolean;
  error?: string;
}

export interface UserViewResponse {
  username: string;
  viewId: number;
  viewIds?: number[];
  lastLogin?: string | null;
  tree: TreeNode[];
}

export interface CreateUserResponse {
  success: boolean;
  email: string;
  viewIds: number[];
  folderNames?: string[];
  messageId?: string;
  emailSent?: boolean;
  message?: string;
  error?: string;
}
