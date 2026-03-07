import client from './client';

export interface GroupData {
  id: string;
  name: string;
  type: string;
  parent_id: string | null;
  member_count: number;
  created_at: string;
}

export interface GroupMember {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  role: string;
  subjects: string[];
}

export function getGroups(params: { type?: string; parent_id?: string } = {}) {
  return client.get<{ data: GroupData[] }>('/v1/groups', { params });
}

export function getMyGroups() {
  return client.get<GroupData[]>('/v1/groups/my');
}

export function getGroup(id: string) {
  return client.get<GroupData & { members: GroupMember[] }>(`/v1/groups/${id}`);
}

export function createGroup(data: { name: string; type: string; parent_id?: string }) {
  return client.post<GroupData>('/v1/groups', data);
}

export function updateGroup(id: string, data: { name?: string }) {
  return client.patch<GroupData>(`/v1/groups/${id}`, data);
}

export function deleteGroup(id: string) {
  return client.delete(`/v1/groups/${id}`);
}

export function addMember(groupId: string, userId: string) {
  return client.post(`/v1/groups/${groupId}/members`, { user_id: userId });
}

export function removeMember(groupId: string, userId: string) {
  return client.delete(`/v1/groups/${groupId}/members/${userId}`);
}
