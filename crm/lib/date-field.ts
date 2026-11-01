/** The year for a day+month typed without one: this year, or next year once that day has already passed. */
export function resolveYear(today: Date, month: number, day: number): number {
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return new Date(today.getFullYear(), month, day) < startOfToday ? today.getFullYear() + 1 : today.getFullYear()
}
