import * as React from 'react'
import { BookingCancelled } from './BookingCancelled'
import { BookingConfirmed } from './BookingConfirmed'
import { BookingInvite } from './BookingInvite'
import { BookingRequested } from './BookingRequested'
import { ContactEmail } from './ContactEmail'
import { LeadAssigned } from './LeadAssigned'
import { MeetingReminder } from './MeetingReminder'
import { NewLeadAlert } from './NewLeadAlert'
import { PendingBooking } from './PendingBooking'
import { TaskDigest } from './TaskDigest'
import { TeamInvite } from './TeamInvite'
import { WeeklySummary } from './WeeklySummary'

/** Sample data for every CRM email: used by scripts/render-emails.tsx and the email tests. */
const logoUrl = 'https://app.igani.co/igani-logo%202.png'
const base = { logoUrl, brandName: 'Igani', supportEmail: 'hello@igani.co' }
const when = { startTime: new Date('2026-11-02T09:00:00Z'), endTime: new Date('2026-11-02T09:30:00Z'), timeZone: 'Asia/Jerusalem' }
const meeting = { ...base, ...when, guestName: 'Dana', hostName: 'Gabriel', title: 'Igani intro call' }

export const SAMPLES: Record<string, React.ReactElement> = {
  BookingInvite: <BookingInvite {...meeting} acceptUrl="https://app.igani.co/invites/x" notes="Looking forward to walking you through the new site." />,
  BookingConfirmed: <BookingConfirmed {...meeting} meetUrl="https://meet.google.com/abc-defg-hij" icsFileName="igani-meeting.ics" />,
  BookingRequested: <BookingRequested {...meeting} />,
  BookingCancelled: <BookingCancelled {...meeting} kind="cancelled" rebookUrl="https://app.igani.co/book/intro" />,
  BookingDeclined: <BookingCancelled {...meeting} kind="declined" rebookUrl="https://app.igani.co/book/intro" />,
  MeetingReminder: <MeetingReminder {...meeting} meetUrl="https://meet.google.com/abc-defg-hij" />,
  PendingBooking: <PendingBooking {...meeting} guestName="Dana Levi" guestEmail="dana@acme.com" reviewUrl="https://app.igani.co/admin/bookings" notes="We need a new e-commerce site before Q1." />,
  TeamInvite: <TeamInvite {...base} role="SALES" inviterName="Gabriel" loginUrl="https://app.igani.co/login?invite=x" />,
  LeadAssigned: <LeadAssigned {...base} repName="Noa" leadName="Dana Levi" leadEmail="dana@acme.com" phone="+972 50 123 4567" company="Acme" source="igani.co" message="Hi! We need a new site for our store, budget around $8k." leadUrl="https://app.igani.co/sales/leads/x" />,
  NewLeadAlert: <NewLeadAlert {...base} leadName="Dana Levi" leadEmail="dana@acme.com" phone="+972 50 123 4567" company="Acme" budget="$8k" source="igani.co/contact" campaign="fall-promo" owner="Noa" message="Hi! We need a new site for our store." leadUrl="https://app.igani.co/sales/leads/x" />,
  WeeklySummary: (
    <WeeklySummary
      {...base}
      name="Gabriel"
      range="Oct 27 – Nov 2"
      stats={[
        { label: 'New leads', value: '12', sub: '+50% vs last week', tone: 'good' },
        { label: 'Deals won', value: '2', sub: '₪41,000', tone: 'good' },
        { label: 'Meetings held', value: '7' },
        { label: 'Open pipeline', value: '₪186,500', sub: '14 open deals' },
      ]}
      signed={[{ title: 'Website and booking system', client: 'Cryotherapy Rejuvenate', total: '$18,500' }]}
      hotOffers={[
        { title: 'Online store', client: 'Honey Ltd', detail: '4 visits by 2 people · read 85% · last Nov 2', url: 'https://app.igani.co/admin/offers/x#visits' },
        { title: 'Real estate site', client: 'Gabai Real Estate', detail: '1 visit · read 40% · last Oct 30', url: 'https://app.igani.co/admin/offers/y#visits' },
      ]}
      tasks={[
        { name: 'Noa', open: 6, overdue: 2 },
        { name: 'Rita Rep', open: 3, overdue: 0 },
      ]}
      sources="igani.co (7), google (3), manual (2)"
      quiet={3}
      dashboardUrl="https://app.igani.co/admin/dashboard"
      tasksUrl="https://app.igani.co/sales/tasks?scope=all"
      todayUrl="https://app.igani.co/sales/today"
    />
  ),
  TaskDigest: (
    <TaskDigest
      {...base}
      name="Noa"
      tasksUrl="https://app.igani.co/sales/tasks"
      tasks={[
        { title: 'Send proposal', contact: 'Acme · Dana Levi', due: 'Overdue since Nov 1, 2:00 PM', overdue: true, url: 'https://x' },
        { title: 'Call back about pricing', contact: 'Yoni Cohen', due: 'Due today, 4:00 PM', overdue: false, url: 'https://y' },
      ]}
    />
  ),
  ContactEmail: (
    <ContactEmail
      {...base}
      subject="Thanks for reaching out to Igani"
      body={"Hi Dana,\n\nThanks for getting in touch with Igani! I'd love to learn more about Acme and what you're looking to build.\n\nWould you be up for a quick 20-minute call this week?\n\nTalk soon,\nGabriel"}
      senderName="Gabriel Leubitz"
      senderEmail="gabriel@igani.co"
      cta={{ label: 'Pick a time to talk', href: 'https://app.igani.co/book/intro' }}
    />
  ),
}
