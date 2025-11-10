export interface Admin {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  permissions?: string[];
  isActive: boolean;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedAdminsResponse {
  data: Admin[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface QueryAdminsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'username' | 'displayName' | 'lastLoginAt';
  sortOrder?: 'asc' | 'desc';
  isActive?: boolean;
}

export interface CreateAdminDto {
  username: string;
  email: string;
  password: string;
  displayName?: string;
  permissions?: string[];
}

export interface UpdateAdminDto {
  username?: string;
  email?: string;
  password?: string;
  displayName?: string;
  isActive?: boolean;
  permissions?: string[];
}

