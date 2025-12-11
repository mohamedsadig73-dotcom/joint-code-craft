// Global types for declarations
export type DeclarationStatus = 
  | 'draft'
  | 'pending_warehouse_signature'
  | 'warehouse_signed'
  | 'sent_to_admin_office'
  | 'received_by_admin_office'
  | 'returned_to_warehouse'
  | 'archived'
  | 'rejected';

export type DeclarationType = 'دخول' | 'خروج';

export interface Declaration {
  id: string;
  type: DeclarationType;
  sender_id: string;
  sender?: { username: string };
  status: DeclarationStatus;
  archive_number: string | null;
  archive_file_id?: string | null;
  notes?: string | null;
  phone?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export interface DeletedDeclaration extends Declaration {
  deleted_at: string;
  deleted_by: string;
}

export interface DeclarationStats {
  total: number;
  draft: number;
  pending_warehouse_signature: number;
  warehouse_signed: number;
  sent_to_admin_office: number;
  received_by_admin_office: number;
  returned_to_warehouse: number;
  archived: number;
  rejected: number;
}

export interface Profile {
  id: string;
  username: string;
  email: string;
  phone?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  calendar_preference?: string | null;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'admin' | 'manager' | 'user';

export interface UserWithRole extends Profile {
  role: UserRole;
}
