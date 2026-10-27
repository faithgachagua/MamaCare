const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

function getToken(): string | null {
  return localStorage.getItem('mc-token');
}

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

// FastAPI sends detail as a string, or as a list of field problems for 422s.
function errorText(body: { detail?: unknown } | null): string {
  const d = body?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d) && d.length > 0) {
    const first = d[0] as { msg?: string; loc?: unknown[] };
    const field = Array.isArray(first.loc) ? String(first.loc[first.loc.length - 1]).replace(/_/g, ' ') : '';
    return first.msg ? `${field ? field.charAt(0).toUpperCase() + field.slice(1) + ': ' : ''}${first.msg}` : '';
  }
  return '';
}

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = getToken();
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
    ...options,
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    return { ok: false, error: errorText(body) || response.statusText };
  }
  return { ok: true, data: body };
}

// ── Auth ──────────────────────────────────────────────────────────────────

export type Role = 'mother' | 'partner' | 'family' | 'doctor' | 'admin';
export type Stage = 'pregnant' | 'postpartum';
export type Scope = 'journey' | 'symptoms' | 'vitals' | 'baby';

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  full_name: string;
  email: string;
  role: Role;
  stage?: Stage;
  pregnancy_id?: string;
  gestational_age_weeks?: number;
  weeks_postpartum?: number;
  due_date?: string;
  delivery_date?: string;
}

export async function register(payload: {
  full_name: string;
  email: string;
  phone?: string;
  password: string;
  stage?: Stage;
  lmp_date?: string;
  due_date?: string;
  delivery_date?: string;
  invite_token?: string;
}) {
  return request<TokenResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function login(payload: { email: string; password: string }) {
  return request<TokenResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ── Health ────────────────────────────────────────────────────────────────

export async function getHealthSummary() {
  return request('/api/health/summary');
}

export async function postSymptom(data: {
  symptom_type: string;
  severity?: number;
  description?: string;
}) {
  return request('/api/health/symptoms', { method: 'POST', body: JSON.stringify(data) });
}

export async function postVital(data: {
  vital_type: string;
  value_numeric?: number;
  value_text?: string;
  unit?: string;
  notes?: string;
}) {
  return request('/api/health/vitals', { method: 'POST', body: JSON.stringify(data) });
}

// ── AI ────────────────────────────────────────────────────────────────────

export async function askAi(data: { question: string; session_id?: string }) {
  return request('/api/ai/chat', { method: 'POST', body: JSON.stringify(data) });
}

export async function listAiSessions() {
  return request('/api/ai/sessions');
}

export async function getAiMessages(sessionId: string) {
  return request(`/api/ai/sessions/${sessionId}/messages`);
}


// ── Me and babies ─────────────────────────────────────────────────────────

export interface Baby {
  id: string;
  name?: string;
  birth_date: string;
  sex?: string;
  birth_weight_g?: number;
}

export async function getMe() {
  return request('/api/me');
}

export async function listBabies() {
  return request<Baby[]>('/api/babies');
}

export async function addBaby(data: { name?: string; birth_date: string; sex?: string; birth_weight_g?: number }) {
  return request<Baby>('/api/babies', { method: 'POST', body: JSON.stringify(data) });
}

// ── Care circle ───────────────────────────────────────────────────────────

export interface Invite {
  id: string;
  email: string;
  role: Role;
  relationship_label?: string;
  scopes: Scope[];
  token: string;
  expires_at: string;
}

export interface InvitePreview {
  mother_name: string;
  email: string;
  role: Role;
  relationship_label?: string;
  scopes: Scope[];
}

export interface Grant {
  id: string;
  grantee_id: string;
  grantee_name: string;
  grantee_email: string;
  role: Role;
  relationship_label?: string;
  scopes: Scope[];
  created_at: string;
}

export interface CircleEntry {
  mother_id: string;
  mother_name: string;
  role: Role;
  relationship_label?: string;
  scopes: Scope[];
}

export const createInvite = (data: { email: string; role: Role; relationship_label?: string; scopes?: Scope[] }) =>
  request<Invite>('/api/care/invites', { method: 'POST', body: JSON.stringify(data) });
export const listInvites = () => request<Invite[]>('/api/care/invites');
export const revokeInvite = (id: string) => request<null>(`/api/care/invites/${id}`, { method: 'DELETE' });
export const previewInvite = (token: string) => request<InvitePreview>(`/api/care/invites/by-token/${token}`);
export const listGrants = () => request<Grant[]>('/api/care/grants');
export const updateGrant = (id: string, scopes: Scope[]) =>
  request<Grant>(`/api/care/grants/${id}`, { method: 'PATCH', body: JSON.stringify({ scopes }) });
export const revokeGrant = (id: string) => request<null>(`/api/care/grants/${id}`, { method: 'DELETE' });
export const getCircle = () => request<CircleEntry[]>('/api/care/circle');
export const getSharedSummary = (motherId: string) => request(`/api/care/mothers/${motherId}/summary`);
export const getAccessLog = () => request('/api/care/access-log');

// ── Home, insights and logging ────────────────────────────────────────────

export type FlagLevel = 'urgent' | 'check';
export type StatusLevel = FlagLevel | 'clear' | 'no_data';

export interface Flag {
  id: string;
  level: FlagLevel;
  title: string;
  detail: string;
  action: string;
}

export interface Checkup {
  week: number;
  title: string;
  who: string;
  approx_date: string;
  status: 'passed' | 'current' | 'upcoming';
}

export interface Progress {
  kind: Stage;
  week: number;
  of: number;
  percent: number;
  trimester?: number;
  days_to_due?: number | null;
}

export interface Home {
  first_name: string;
  progress: Progress;
  baby_this_week: { length_cm: number; weight_g: number; text: string } | null;
  checkups: Checkup[];
  status: { level: StatusLevel; flags: Flag[]; last_logged_at: string | null };
  babies: Array<{ id: string; name?: string; birth_date: string }>;
  care_circle_count: number;
}

export interface LatestVital {
  type: string;
  value: number;
  secondary?: number | null;
  unit?: string;
  recorded_at: string;
}

export interface InsightsData {
  stage: Stage;
  level: StatusLevel;
  flags: Flag[];
  latest: Record<string, LatestVital>;
  last_logged_at: string | null;
  nutrition: Array<{ label: string; text: string }>;
  checkups: Checkup[];
}

export interface Catalog {
  stage: Stage;
  symptoms: Array<{ key: string; label: string; level: 'urgent' | 'watch' | null }>;
  vitals: Array<{ key: string; label: string; unit: string }>;
}

export const getHome = () => request<Home>('/api/home');
export const getInsights = () => request<InsightsData>('/api/insights');
export const getCatalog = () => request<Catalog>('/api/health/catalog');
