import client from './client';

export interface GradeCategoryData {
  id: string;
  tenant_id: string;
  subject_id: string;
  group_id: string;
  term_id: string;
  name: string;
  weight: number;
  created_at: string;
}

export interface AssessmentData {
  id: string;
  tenant_id: string;
  subject_id: string;
  group_id: string;
  term_id: string;
  category_id: string | null;
  teacher_id: string;
  title: string;
  description: string | null;
  date: string;
  max_score: number;
  coefficient: number;
  is_published: boolean;
  created_at: string;
}

export interface GradeData {
  id: string;
  assessment_id: string;
  student_id: string;
  score: number | null;
  is_absent: boolean;
  is_exempt: boolean;
  comment: string | null;
  created_at: string;
}

export interface SubjectAverage {
  subject_id: string;
  subject_name: string;
  average: number | null;
  assessment_count: number;
}

export interface StudentAveragesData {
  student_id: string;
  term_id: string | null;
  averages: SubjectAverage[];
  general_average: number | null;
}

export interface GradeInput {
  student_id: string;
  score: number | null;
  is_absent: boolean;
  is_exempt: boolean;
  comment: string | null;
}

// Grade Categories
export function getGradeCategories(params: { group_id: string; subject_id: string; term_id: string }) {
  return client.get<GradeCategoryData[]>('/v1/gradebook/categories', { params });
}

export function createGradeCategory(data: { subject_id: string; group_id: string; term_id: string; name: string; weight?: number }) {
  return client.post<GradeCategoryData>('/v1/gradebook/categories', data);
}

// Assessments
export function getAssessments(params: { group_id?: string; subject_id?: string; term_id?: string } = {}) {
  return client.get<AssessmentData[]>('/v1/gradebook/assessments', { params });
}

export function createAssessment(data: {
  subject_id: string;
  group_id: string;
  term_id: string;
  category_id?: string;
  title: string;
  description?: string;
  date: string;
  max_score?: number;
  coefficient?: number;
}) {
  return client.post<AssessmentData>('/v1/gradebook/assessments', data);
}

// Grades
export function getAssessmentGrades(assessmentId: string) {
  return client.get<GradeData[]>(`/v1/gradebook/assessments/${assessmentId}/grades`);
}

export function bulkCreateGrades(assessmentId: string, grades: GradeInput[]) {
  return client.post<GradeData[]>('/v1/gradebook/grades/bulk', { grades }, { params: { assessment_id: assessmentId } });
}

// Student Averages
export function getStudentAverages(studentId: string, params: { term_id?: string } = {}) {
  return client.get<StudentAveragesData>(`/v1/gradebook/students/${studentId}/averages`, { params });
}
