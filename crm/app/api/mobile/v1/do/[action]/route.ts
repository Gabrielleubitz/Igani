import * as admin from '@/app/actions/admin'
import * as bookings from '@/app/actions/bookings'
import * as callLists from '@/app/actions/call-lists'
import * as callShares from '@/app/actions/call-shares'
import * as chat from '@/app/actions/chat'
import * as leadIntel from '@/app/actions/lead-intel'
import * as calls from '@/app/actions/calls'
import * as deals from '@/app/actions/deals'
import * as leads from '@/app/actions/leads'
import * as meet from '@/app/actions/meet'
import * as places from '@/app/actions/places'
import * as phoneLines from '@/app/actions/phone-lines'
import * as sms from '@/app/actions/sms'
import * as tasks from '@/app/actions/tasks'
import * as videos from '@/app/actions/videos'
import * as siteAudit from '@/app/actions/site-audit'
import * as sales from '@/app/sales/actions'
import * as today from '@/app/sales/today/actions'
import { fail, json, mobileUser } from '@/lib/mobile'

export const dynamic = 'force-dynamic'
// rebuilding a lead profile reads several calls with AI
export const maxDuration = 300

type Action = (...args: never[]) => Promise<unknown>

/**
 * The app's buttons call the website's own server actions by name: each one checks the signed-in user and their role
 * itself, exactly as when the website calls it. Only the actions listed here can be reached.
 */
const ACTIONS: Record<string, Action> = {
  // phone
  startCall: calls.startCall,
  identifyCaller: calls.identifyCaller,
  abandonCall: calls.abandonCall,
  simulateCallProgress: calls.simulateCallProgress,
  simulateIncomingCall: calls.simulateIncomingCall,
  saveCallWrapUp: calls.saveCallWrapUp,
  liveCalls: calls.liveCalls,
  sendCallNote: calls.sendCallNote,
  callNotes: calls.callNotes,
  // the AI profile on a lead
  addProfileMeetingToCalendar: leadIntel.addProfileMeetingToCalendar,
  profileItemToTask: leadIntel.profileItemToTask,
  setProfileItem: leadIntel.setProfileItem,
  rebuildLeadProfile: leadIntel.rebuildLeadProfile,
  // team chat
  chatOverview: chat.chatOverview,
  chatUnread: chat.chatUnread,
  chatMessages: chat.chatMessages,
  chatSend: chat.chatSend,
  chatEdit: chat.chatEdit,
  chatDelete: chat.chatDelete,
  chatReact: chat.chatReact,
  chatMarkRead: chat.chatMarkRead,
  chatCreateChannel: chat.chatCreateChannel,
  chatUpdateChannel: chat.chatUpdateChannel,
  chatArchiveChannel: chat.chatArchiveChannel,
  chatAddMembers: chat.chatAddMembers,
  chatJoin: chat.chatJoin,
  chatLeave: chat.chatLeave,
  chatOpenDm: chat.chatOpenDm,
  chatTyping: chat.chatTyping,
  chatMute: chat.chatMute,
  chatSearch: chat.chatSearch,
  chatUploadTicket: chat.chatUploadTicket,
  chatFileUrl: chat.chatFileUrl,
  chatForward: chat.chatForward,
  searchDialerContacts: calls.searchDialerContacts,
  recentCalls: calls.recentCalls,
  lookupIncoming: calls.lookupIncoming,
  clearStuckCalls: calls.clearStuckCalls,
  reanalyzeCall: calls.reanalyzeCall,
  shareCall: callShares.shareCall,
  unshareCall: callShares.unshareCall,
  smsThreads: sms.smsThreads,
  smsUnread: sms.smsUnread,
  smsConversation: sms.smsConversation,
  sendText: sms.sendText,
  dialerCallLists: callLists.dialerCallLists,
  dialerProspects: callLists.dialerProspects,
  setProspectStatus: callLists.setProspectStatus,
  makeProspectLead: callLists.makeProspectLead,
  removeProspect: callLists.removeProspect,
  refreshProspectDetails: callLists.refreshProspectDetails,
  callListChoices: callLists.callListChoices,
  findBusinesses: places.findBusinesses,
  addToCallList: places.addToCallList,
  // contacts and tasks
  updateLead: leads.updateLead,
  assignLead: leads.assignLead,
  archiveLeads: leads.archiveLeads,
  updateLeadStatus: leads.updateLeadStatus,
  checkContactPhone: leads.checkContactPhone,
  saveQuotedPrice: deals.saveQuotedPrice,
  addLeadPayment: deals.addLeadPayment,
  setPaymentCommissionPaid: deals.setPaymentCommissionPaid,
  setBonusPaid: deals.setBonusPaid,
  logTouch: sales.logTouch,
  emailContact: sales.emailContact,
  updateTask: sales.updateTask,
  deleteTask: sales.deleteTask,
  setMeetingTask: sales.setMeetingTask,
  createTaskFor: tasks.createTaskFor,
  deleteTeamTask: tasks.deleteTeamTask,
  createCalendarEntry: today.createCalendarEntry,
  deleteCalendarEntry: today.deleteCalendarEntry,
  // meetings
  getHostSlots: bookings.getHostSlots,
  checkInviteTime: bookings.checkInviteTime,
  createTeamMeeting: bookings.createTeamMeeting,
  createSalesInvite: bookings.createSalesInvite,
  approveBooking: bookings.approveBooking,
  markBookingDone: bookings.markBookingDone,
  cancelBooking: bookings.cancelBooking,
  addMeetInvites: meet.addMeetInvites,
  meetRoomInvites: meet.meetRoomInvites,
  resendMeetInvite: meet.resendMeetInvite,
  removeMeetInvite: meet.removeMeetInvite,
  endMeetRoom: meet.endMeetRoom,
  // admin
  upsertAllowedUser: admin.upsertAllowedUser,
  resendInvite: admin.resendInvite,
  removeAllowedUser: admin.removeAllowedUser,
  updateTeamMember: admin.updateTeamMember,
  upsertBookingPage: admin.upsertBookingPage,
  deleteBookingPage: admin.deleteBookingPage,
  saveSettings: admin.saveSettings,
  assignPhoneLine: phoneLines.assignPhoneLine,
  removePhoneLine: phoneLines.removePhoneLine,
  routeIncomingToCrm: phoneLines.routeIncomingToCrm,
  restoreIncomingRouting: phoneLines.restoreIncomingRouting,
  setVideoAccess: videos.setVideoAccess,
  removeVideo: videos.removeVideo,
  setSalesProgress: videos.setSalesProgress,
  checkSite: siteAudit.checkSite,
}

/** POST /api/mobile/v1/do/<action> with {"args": [...]}: the action's own { ok, data } / { ok: false, error }. */
export async function POST(req: Request, ctx: { params: Promise<{ action: string }> }): Promise<Response> {
  const user = await mobileUser()
  if (user instanceof Response) return user
  const { action } = await ctx.params
  const fn = Object.hasOwn(ACTIONS, action) ? ACTIONS[action] : undefined
  if (!fn) return fail('Unknown action.', 404)
  const body = (await req.json().catch(() => null)) as { args?: unknown } | null
  const args = Array.isArray(body?.args) ? (body.args as never[]) : []
  if (args.length > 6) return fail('Too many arguments.')
  try {
    const r = (await fn(...args)) as { ok?: boolean; error?: string } | undefined
    if (r && r.ok === false) return fail(r.error ?? 'Something went wrong.', 400)
    return json({ ok: true, data: r && 'data' in r ? (r as { data: unknown }).data ?? null : null })
  } catch (err) {
    // the action wanted to send the browser to sign-in or "not allowed": answer in JSON instead
    const digest = typeof err === 'object' && err !== null ? String((err as { digest?: unknown }).digest ?? '') : ''
    if (digest.startsWith('NEXT_REDIRECT')) return fail(digest.includes('/login') ? 'Please sign in again.' : 'You don’t have access to that.', digest.includes('/login') ? 401 : 403)
    if (digest === 'NEXT_NOT_FOUND') return fail('Not found.', 404)
    console.error('[mobile] action failed', action, err)
    return fail('Something went wrong. Please try again.', 500)
  }
}
