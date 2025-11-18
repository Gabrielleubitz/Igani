'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { IganiLogo } from '@/components/IganiLogo'
import { StarryBackground } from '@/components/ui/starry-background'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-900 relative">
      <StarryBackground />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-900/95 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="group cursor-pointer">
              <IganiLogo className="w-40 h-14" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 pt-32 pb-20 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-8 md:p-12 shadow-2xl shadow-slate-950/50">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Terms of Service</h1>
            <p className="text-slate-400 mb-8">Last updated: January 2025</p>

            <div className="space-y-8 text-slate-300">
              <section>
                <h2 className="text-2xl font-bold text-white mb-4">Agreement to Terms</h2>
                <p className="leading-relaxed">
                  By accessing or using Igani's services, you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access our services.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">Services Description</h2>
                <p className="leading-relaxed">
                  Igani provides professional web development and design services, including but not limited to custom website development, UI/UX design, web applications, and related digital solutions. The specific scope of work will be defined in individual project agreements.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">Project Engagement</h2>
                <p className="leading-relaxed mb-4">
                  When you engage our services:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>A detailed project proposal and agreement will be provided</li>
                  <li>Payment terms, deliverables, and timelines will be clearly defined</li>
                  <li>Both parties must agree to and sign the project agreement before work begins</li>
                  <li>Changes to the project scope may result in additional fees and timeline adjustments</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">Payment Terms</h2>
                <p className="leading-relaxed mb-4">
                  Unless otherwise specified in the project agreement:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>A deposit is typically required before project commencement</li>
                  <li>Payment milestones will be outlined in the project agreement</li>
                  <li>Final payment is due upon project completion and approval</li>
                  <li>Late payments may incur additional fees</li>
                  <li>All fees are non-refundable once work has commenced</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">Intellectual Property</h2>
                <p className="leading-relaxed mb-4">
                  Upon receipt of full payment:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Ownership of the final deliverables transfers to the client</li>
                  <li>Igani retains the right to use the work in our portfolio and marketing materials</li>
                  <li>Any third-party materials used remain the property of their respective owners</li>
                  <li>Pre-existing Igani intellectual property and methodologies remain our property</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">Client Responsibilities</h2>
                <p className="leading-relaxed mb-4">
                  Clients are responsible for:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Providing timely feedback and necessary materials</li>
                  <li>Ensuring all provided content is legally compliant and properly licensed</li>
                  <li>Maintaining communication throughout the project lifecycle</li>
                  <li>Providing access to necessary accounts, platforms, and resources</li>
                  <li>Timely review and approval of deliverables</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">Revisions and Changes</h2>
                <p className="leading-relaxed">
                  Each project includes a specified number of revision rounds as outlined in the agreement. Additional revisions beyond the agreed scope may incur additional charges. Significant changes to project requirements may require a new proposal and agreement.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">Warranties and Disclaimers</h2>
                <p className="leading-relaxed mb-4">
                  Igani warrants that:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Services will be performed in a professional and workmanlike manner</li>
                  <li>Deliverables will substantially conform to agreed specifications</li>
                  <li>We will not knowingly infringe on third-party intellectual property rights</li>
                </ul>
                <p className="leading-relaxed mt-4">
                  However, we do not warrant that our services will be uninterrupted or error-free, or that deliverables will meet all client expectations not explicitly documented in the project agreement.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">Limitation of Liability</h2>
                <p className="leading-relaxed">
                  To the maximum extent permitted by law, Igani shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues. Our total liability shall not exceed the total amount paid by the client for the specific project giving rise to the claim.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">Confidentiality</h2>
                <p className="leading-relaxed">
                  Both parties agree to maintain the confidentiality of any proprietary or sensitive information shared during the course of the project. This obligation survives the termination of the project agreement.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">Termination</h2>
                <p className="leading-relaxed">
                  Either party may terminate the project agreement with written notice. Upon termination, the client shall pay for all work completed to date. Igani retains the right to refuse service to anyone for any reason.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">Governing Law</h2>
                <p className="leading-relaxed">
                  These terms shall be governed by and construed in accordance with the laws of Israel. Any disputes arising from these terms or our services shall be subject to the exclusive jurisdiction of the courts in Israel.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">Changes to Terms</h2>
                <p className="leading-relaxed">
                  We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting to our website. Continued use of our services following any changes constitutes acceptance of the new terms.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">Contact Information</h2>
                <p className="leading-relaxed">
                  For questions regarding these Terms of Service, please contact us:
                </p>
                <div className="mt-4 p-4 bg-slate-900/60 rounded-xl border border-slate-700/50">
                  <p className="text-cyan-400 font-semibold">Email: hello@igani.com</p>
                  <p className="text-slate-400 mt-2">Phone: +972 58 44 77757</p>
                  <p className="text-slate-400 mt-2">Location: Netanya, Israel</p>
                </div>
              </section>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-700/50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-slate-500 text-sm">
            © 2025 Igani. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
