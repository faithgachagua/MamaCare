import type { Role, Scope } from '../services/api';

export const allScopes: Scope[] = ['journey', 'symptoms', 'vitals', 'baby'];

export const scopeLabels: Record<Scope, { title: string; hint: string }> = {
  journey: { title: 'Pregnancy progress', hint: 'Which week you are in and your due date' },
  symptoms: { title: 'Symptoms', hint: 'What you log about how you feel' },
  vitals: { title: 'Measurements', hint: 'Blood pressure, weight and temperature' },
  baby: { title: 'Baby details', hint: 'Name and date of birth' },
};

export const scopeShort: Record<Scope, string> = {
  journey: 'Progress',
  symptoms: 'Symptoms',
  vitals: 'Measurements',
  baby: 'Baby',
};

export const inviteRoles: Array<{ value: Role; label: string }> = [
  { value: 'partner', label: 'Partner' },
  { value: 'family', label: 'Family member' },
  { value: 'doctor', label: 'Doctor or nurse' },
];

const roleNames: Record<Role, string> = {
  mother: 'Mother',
  partner: 'Partner',
  family: 'Family member',
  doctor: 'Doctor',
  admin: 'Administrator',
};

export function roleLabel(role: Role | null | undefined): string {
  return role ? roleNames[role] : '';
}

export function defaultScopes(role: Role): Scope[] {
  if (role === 'doctor') return ['journey', 'symptoms', 'vitals'];
  if (role === 'partner') return ['journey', 'baby'];
  return ['journey'];
}

export function inviteLink(token: string): string {
  return `${window.location.origin}/?invite=${encodeURIComponent(token)}`;
}

export function whatsappLink(motherName: string, token: string): string {
  const text = `${motherName} has invited you to follow her pregnancy on MamaCare. Create your account here: ${inviteLink(token)}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
