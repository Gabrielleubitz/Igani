import { redirect } from 'next/navigation'

/** Igani Meet moved out of Tests into its own page. */
export default function TestsPage(): never {
  redirect('/meet')
}
