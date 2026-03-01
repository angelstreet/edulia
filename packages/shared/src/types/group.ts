import type { BaseEntity, TenantScoped, GroupType, GroupRole } from './common';

export interface Group extends BaseEntity, TenantScoped {
  campus_id: string | null;
  academic_year_id: string | null;
  type: GroupType;
  name: string;
  description: string;
  capacity: number | null;
  metadata: Record<string, unknown>;
}

export interface GroupMembership extends BaseEntity {
  group_id: string;
  user_id: string;
  role_in_group: GroupRole;
  joined_at: string;
  left_at: string | null;
}
