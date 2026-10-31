export type Ring = [number, number, number, number] // x,y,w,h in the 1440x900 screenshot
export interface Scene { id: number; secs: number; kind: 'intro' | 'step' | 'outro'; step?: string; title: string; bullets: string[]; shots: string[]; ring?: Ring }
export const PAD = 0.7
export const FPS = 30
export const SCENES: Scene[] = [
  { id: 1, secs: 9.75, kind: 'intro', title: 'Igani CRM', bullets: ['Track every lead', 'Book every meeting', 'Never drop a follow-up'], shots: [] },
  { id: 2, secs: 7.71, kind: 'step', step: 'Sign in', title: 'Private to your team', bullets: ['Sign in with Google', 'Only invited teammates get in', 'Your data stays private'], shots: ['login'] },
  { id: 3, secs: 10.96, kind: 'step', step: 'Today', title: 'Your daily starting point', bullets: ['Tasks that are due', 'Meetings in the next 24 hours', 'Leads that need a follow-up', 'Hottest leads, scored 0 to 100'], shots: ['today'], ring: [852, 240, 556, 136] },
  { id: 4, secs: 10.26, kind: 'step', step: 'Contacts', title: 'Your address book', bullets: ['Search by name or company', 'Filter by stage and owner', 'Tag, import a CSV, export'], shots: ['contacts'], ring: [272, 218, 288, 36] },
  { id: 5, secs: 9.8, kind: 'step', step: 'Contact page', title: 'The full story, one click away', bullets: ['Log calls, emails, meetings', 'Write notes', 'Add tasks with due dates'], shots: ['lead'], ring: [684, 211, 422, 36] },
  { id: 6, secs: 11.0, kind: 'step', step: 'Board', title: 'See your deals as cards', bullets: ['New, Contacted, Demo, Proposal', 'Drag a card to move its stage', 'Won and Lost close the deal'], shots: ['board'], ring: [272, 192, 1136, 288] },
  { id: 7, secs: 11.19, kind: 'step', step: 'Meetings', title: 'Book meetings without the back and forth', bullets: ['Send an invite from your calendar', 'Google Meet link added automatically', 'Share a public booking page'], shots: ['invite', 'book'] },
  { id: 8, secs: 7.24, kind: 'step', step: 'Reports', title: 'Know what is working', bullets: ['Where leads come from', 'How many you win', 'Admin overview of the business'], shots: ['reports', 'overview'] },
  { id: 9, secs: 8.45, kind: 'step', step: 'Admin', title: 'Admins stay in control', bullets: ['Add teammates and set roles', 'Audit log of every change', 'Company settings'], shots: ['team', 'audit', 'settings'] },
  { id: 10, secs: 10.4, kind: 'outro', title: 'Sign in and try it today', bullets: [], shots: [] },
]
export const frames = (s: Scene): number => Math.round((s.secs + PAD) * FPS)
export const TOTAL = SCENES.reduce((a, s) => a + frames(s), 0)
