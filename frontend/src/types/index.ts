export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'institution_user' | 'reviewer';
  institution_id?: string;
  institution_name?: string;
  status: string;
  created_at: string;
  last_login?: string;
}

export interface Institution {
  id: string;
  aicte_id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  type?: string;
  status: string;
  logo_url?: string;
  created_at: string;
}

export interface Programme {
  id: string;
  institution_id: string;
  code: string;
  name: string;
  degree_type?: string;
  duration_years: number;
  approved_intake: number;
  academic_year: string;
  supernumerary_seats: number;
  nri_seats: number;
  status: string;
}

export interface Student {
  id: string;
  institution_id: string;
  submission_id?: string;
  apaar_id?: string;
  name: string;
  date_of_birth?: string;
  gender?: string;
  programme_id?: string;
  programme_name?: string;
  programme_code?: string;
  enrollment_date?: string;
  enrollment_status?: string;
  category?: string;
  institute_roll_no?: string;
  email?: string;
  phone?: string;
  row_number?: number;
  validation_status: 'valid' | 'invalid' | 'duplicate' | 'warning' | 'pending';
  remarks?: string;
  version: number;
  is_latest: boolean;
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: string;
  institution_id: string;
  uploaded_by: string;
  uploader_name?: string;
  file_name?: string;
  academic_year?: string;
  programme_id?: string;
  programme_name?: string;
  total_records: number;
  valid_records: number;
  error_records: number;
  warning_records: number;
  status: 'uploaded' | 'mapping' | 'mapped' | 'validating' | 'validated' | 'submitted';
  column_mapping?: Record<string, string>;
  submitted_at: string;
  validated_at?: string;
}

export interface ValidationIssue {
  id: string;
  submission_id: string;
  student_id?: string;
  student_name?: string;
  student_apaar_id?: string;
  rule_code: string;
  severity: 'error' | 'warning' | 'info';
  field_name?: string;
  description: string;
  row_number?: number;
  status: string;
  created_at: string;
}

export interface VerificationCase {
  id: string;
  student_id?: string;
  student_name?: string;
  student_apaar_id?: string;
  student_programme?: string;
  submission_id?: string;
  institution_id: string;
  institution_name?: string;
  issue_type: 'duplicate_enrollment' | 'invalid_data' | 'intake_mismatch' | 'missing_documents';
  title?: string;
  description?: string;
  status: 'open' | 'under_review' | 'pending' | 'resolved' | 'rejected';
  assigned_to?: string;
  assigned_user_name?: string;
  resolved_by?: string;
  resolved_user_name?: string;
  resolution_reason?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  events?: CaseEvent[];
}

export interface CaseEvent {
  id: string;
  case_id: string;
  actor_id: string;
  actor_name?: string;
  actor_role?: string;
  event_type: string;
  description?: string;
  old_value?: string;
  new_value?: string;
  created_at: string;
}

export interface DashboardStats {
  total_students: number;
  valid_records: number;
  valid_percentage: number;
  pending_verification: number;
  pending_percentage: number;
  issues_found: number;
  issues_percentage: number;
  total_submissions: number;
  total_programmes: number;
  open_cases: number;
}
