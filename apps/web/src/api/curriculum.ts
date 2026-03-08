import client from './client';

export interface Competency {
  id: string;
  code: string;
  description: string;
  sub_domain: string | null;
  levels: string[];
  sort_order: number;
  school_plan?: {
    id: string;
    term: string | null;
    week_from: number | null;
    week_to: number | null;
    notes: string | null;
    status: string;
    content: { type: string; ref: string; label: string }[];
  } | null;
}

export interface CurriculumDomain {
  id: string;
  code: string;
  name: string;
  sort_order: number;
  competencies: Competency[];
}

export interface CurriculumFramework {
  id: string;
  code: string;
  name: string;
  country: string;
  cycle: string;
  year: number;
  source: string;
  levels: string[];
}

export interface StudentProgramme {
  framework: CurriculumFramework | null;
  level: string;
  detected_level: string;
  group_name: string | null;
  student_id: string;
  domains: CurriculumDomain[];
}

export const getStudentProgramme = (studentId: string) =>
  client.get<StudentProgramme>(`/api/v1/curriculum/student/${studentId}`);

export const getCompetenciesForLevel = (level: string) =>
  client.get<StudentProgramme>(`/api/v1/curriculum/for-level/${level}`);
