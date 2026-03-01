import type { BaseEntity, TenantScoped, Status, Gender, Address, ScopeType, RelationshipType } from './common';

export interface User extends BaseEntity, TenantScoped {
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  display_name: string;
  avatar_url: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: Gender;
  address: Address | null;
  metadata: Record<string, unknown>;
  status: Status;
  last_login_at: string | null;
}

export interface Role extends BaseEntity, TenantScoped {
  code: string;
  display_name: string;
  is_system: boolean;
  permissions: string[];
}

export interface UserRole extends BaseEntity {
  user_id: string;
  role_id: string;
  scope_type: ScopeType;
  scope_id: string | null;
  granted_at: string;
  revoked_at: string | null;
}

export interface Relationship extends BaseEntity, TenantScoped {
  from_user_id: string;
  to_user_id: string;
  type: RelationshipType;
  is_primary: boolean;
  metadata: Record<string, unknown>;
}
