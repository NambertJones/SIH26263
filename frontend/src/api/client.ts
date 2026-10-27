const BASE_URL = '/api';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = 'An error occurred';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || JSON.stringify(errJson);
    } catch {
      errorDetail = response.statusText;
    }
    throw new ApiError(response.status, errorDetail);
  }

  // Handle empty or blob responses
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return response.text() as unknown as T;
}

// Authentication API
export const authApi = {
  login: (data: { email: string; password: string }) =>
    request<{ access_token: string; token_type: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getMe: () => request<any>('/auth/me'),
  refresh: () => request<any>('/auth/refresh', { method: 'POST' }),
};

// Dashboard API
export const dashboardApi = {
  getStats: (institutionId?: string) =>
    request<any>(`/dashboard/stats${institutionId ? `?institution_id=${institutionId}` : ''}`),
  getRecentActivity: (institutionId?: string) =>
    request<any[]>(`/dashboard/recent-activity${institutionId ? `?institution_id=${institutionId}` : ''}`),
  getEnrollmentByProgram: (institutionId?: string) =>
    request<any[]>(`/dashboard/enrollment-by-program${institutionId ? `?institution_id=${institutionId}` : ''}`),
  getSubmissionStatus: (institutionId?: string) =>
    request<any>(`/dashboard/submission-status${institutionId ? `?institution_id=${institutionId}` : ''}`),
};

// Submissions API
export const submissionsApi = {
  upload: (formData: FormData) =>
    request<any>('/submissions/upload', {
      method: 'POST',
      body: formData,
    }),
  list: (institutionId?: string) =>
    request<any[]>(`/submissions${institutionId ? `?institution_id=${institutionId}` : ''}`),
  get: (id: string) => request<any>(`/submissions/${id}`),
  getPreview: (id: string) => request<any>(`/submissions/${id}/preview`),
  mapColumns: (id: string, data: { mapping: Record<string, string>; programme_id?: string; academic_year?: string }) =>
    request<any>(`/submissions/${id}/map-columns`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  validate: (id: string) =>
    request<any>(`/submissions/${id}/validate`, {
      method: 'POST',
    }),
  submit: (id: string) =>
    request<any>(`/submissions/${id}/submit`, {
      method: 'POST',
    }),
};

// Validation API
export const validationApi = {
  getResults: (submissionId: string, severity?: string) =>
    request<any>(`/validation/${submissionId}/results${severity ? `?severity=${severity}` : ''}`),
  getErrors: (submissionId: string) => request<any>(`/validation/${submissionId}/errors`),
  getWarnings: (submissionId: string) => request<any>(`/validation/${submissionId}/warnings`),
  getDuplicates: (submissionId: string) => request<any>(`/validation/${submissionId}/duplicates`),
};

// Students API
export const studentsApi = {
  list: (params: {
    institution_id?: string;
    submission_id?: string;
    programme_id?: string;
    validation_status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}) => {
    const q = new URLSearchParams();
    if (params.institution_id) q.set('institution_id', params.institution_id);
    if (params.submission_id) q.set('submission_id', params.submission_id);
    if (params.programme_id) q.set('programme_id', params.programme_id);
    if (params.validation_status) q.set('validation_status', params.validation_status);
    if (params.search) q.set('search', params.search);
    if (params.limit) q.set('limit', params.limit.toString());
    if (params.offset) q.set('offset', params.offset.toString());
    return request<{ total: number; items: any[] }>(`/students?${q.toString()}`);
  },
  get: (id: string) => request<any>(`/students/${id}`),
  getCases: (id: string) => request<any[]>(`/students/${id}/cases`),
  getAuditTrail: (id: string) => request<any[]>(`/students/${id}/audit-trail`),
  correct: (id: string, data: any) =>
    request<any>(`/students/${id}/correct`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// Verification Cases API
export const casesApi = {
  list: (params: {
    institution_id?: string;
    status?: string;
    issue_type?: string;
    priority?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}) => {
    const q = new URLSearchParams();
    if (params.institution_id) q.set('institution_id', params.institution_id);
    if (params.status) q.set('status', params.status);
    if (params.issue_type) q.set('issue_type', params.issue_type);
    if (params.priority) q.set('priority', params.priority);
    if (params.search) q.set('search', params.search);
    if (params.limit) q.set('limit', params.limit.toString());
    if (params.offset) q.set('offset', params.offset.toString());
    return request<{ total: number; items: any[] }>(`/cases?${q.toString()}`);
  },
  get: (id: string) => request<any>(`/cases/${id}`),
  assign: (id: string, assignedTo: string) =>
    request<any>(`/cases/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ assigned_to: assignedTo }),
    }),
  addComment: (id: string, comment: string) =>
    request<any>(`/cases/${id}/comment`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    }),
  requestClarification: (id: string, note: string) =>
    request<any>(`/cases/${id}/request-clarification`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    }),
  resolve: (id: string, reason: string) =>
    request<any>(`/cases/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  reject: (id: string, reason: string) =>
    request<any>(`/cases/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
};

// Reports API
export const reportsApi = {
  getEnrollmentSummary: (institutionId?: string) =>
    request<any>(`/reports/enrollment-summary${institutionId ? `?institution_id=${institutionId}` : ''}`),
  getDiscrepancies: (institutionId?: string) =>
    request<any[]>(`/reports/discrepancy${institutionId ? `?institution_id=${institutionId}` : ''}`),
  getCompliance: (institutionId?: string) =>
    request<any>(`/reports/compliance${institutionId ? `?institution_id=${institutionId}` : ''}`),
  getInstitutionWise: () => request<any[]>('/reports/institution-wise'),
};

// Integrations API
export const integrationsApi = {
  list: () => request<any[]>('/integrations'),
  mockCheck: (service: string, payload: any) =>
    request<any>(`/integrations/${service}/mock-check`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  configure: (service: string, config: any) =>
    request<any>(`/integrations/${service}/configure`, {
      method: 'PUT',
      body: JSON.stringify(config),
    }),
};

// Users API
export const usersApi = {
  list: (params: { role?: string; institution_id?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.role) q.set('role', params.role);
    if (params.institution_id) q.set('institution_id', params.institution_id);
    return request<any[]>(`/users?${q.toString()}`);
  },
  create: (data: any) =>
    request<any>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any) =>
    request<any>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deactivate: (id: string) =>
    request<any>(`/users/${id}`, {
      method: 'DELETE',
    }),
};

// Institutions API
export const institutionsApi = {
  list: () => request<any[]>('/institutions'),
  get: (id: string) => request<any>(`/institutions/${id}`),
  update: (id: string, data: any) =>
    request<any>(`/institutions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getProgrammes: (id: string) => request<any[]>(`/institutions/${id}/programmes`),
  addProgramme: (id: string, data: any) =>
    request<any>(`/institutions/${id}/programmes`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Certificate API
export const certificateApi = {
  getPreview: (studentId: string) => request<any>(`/certificate/${studentId}/preview`),
};

// Public verification API (no login required)
export const publicApi = {
  verify: (certificateId: string) =>
    request<any>(`/public/verify/${encodeURIComponent(certificateId)}`),
};
