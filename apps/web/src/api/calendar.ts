import client from './client';

export interface CalendarEvent {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  event_type: string;
  color: string | null;
  target_roles: string[] | null;
  created_by: string | null;
  created_at: string;
}

export interface EventCreate {
  title: string;
  description?: string;
  start_at: string;
  end_at?: string;
  event_type?: string;
  color?: string;
  target_roles?: string[];
}

export function getEvents(params: { start?: string; end?: string } = {}) {
  return client.get<CalendarEvent[]>('/v1/calendar/events', { params });
}

export function createEvent(data: EventCreate) {
  return client.post<CalendarEvent>('/v1/calendar/events', data);
}

export function deleteEvent(id: string) {
  return client.delete(`/v1/calendar/events/${id}`);
}
