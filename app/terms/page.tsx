'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { IganiLogo } from '@/components/IganiLogo'
import { StarryBackground } from '@/components/ui/starry-background'
import { SplashCursor } from '@/components/ui/splash-cursor'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { T } from '@/components/T'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-900 relative">
      <StarryBackground />
      
      {/* Splash Cursor Animation - Full Page */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <SplashCursor />
      </div>
      
      {/* Header with Back Button */}
      <Header
        showBackButton={true}
        backButtonText="Back to Home"
        backButtonHref="/"
      />

      {/* Main Content */}
      <div className="relative z-10 pt-32 pb-20 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-8 md:p-12 shadow-2xl shadow-slate-950/50">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4"><T>Terms of Service</T></h1>
            <p className="text-slate-400 mb-8"><T>Last updated: January 2025</T></p>

            <div className="space-y-8 text-slate-300">
              <section>
                <h2 className="text-2xl font-bold text-white mb-4"><T>Agreement to Terms</T></h2>
                <p className="leading-relaxed">
                  <T>By accessing or using Igani's services, you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access our services.</T>
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4"><T>Services Description</T></h2>
                <p className="leading-relaxed">
                  <T>Igani provides professional web development and design services, including but not limited to custom website development, UI/UX design, web applications, and related digital solutions. The specific scope of work will be defined in individual project agreements.</T>
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4"><T>Project Engagement</T></h2>
                <p className="leading-relaxed mb-4">
                  <T>When you engage our services:</T>
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><T>A detailed project proposal and agreement will be provided</T></li>
                  <li><T>Payment terms, deliverables, and timelines will be clearly defined</T></li>
                  <li><T>Both parties must agree to and sign the project agreement before work begins</T></li>
                  <li><T>Changes to the project scope may result in additional fees and timeline adjustments</T></li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4"><T>Payment Terms</T></h2>
                <p className="leading-relaxed mb-4">
                  <T>Unless otherwise specified in the project agreement:</T>
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><T>A deposit is typically required before project commencement</T></li>
                  <li><T>Payment milestones will be outlined in the project agreement</T></li>
                  <li><T>Final payment is due upon project completion and approval</T></li>
                  <li><T>Late payments may incur additional fees</T></li>
                  <li><T>All fees are non-refundable once work has commenced</T></li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4"><T>Intellectual Property</T></h2>
                <p className="leading-relaxed mb-4">
                  <T>Upon receipt of full payment:</T>
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><T>Ownership of the final deliverables transfers to the client</T></li>
                  <li><T>Igani retains the right to use the work in our portfolio and marketing materials</T></li>
                  <li><T>Any third-party materials used remain the property of their respective owners</T></li>
                  <li><T>Pre-existing Igani intellectual property and methodologies remain our property</T></li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4"><T>Client Responsibilities</T></h2>
                <p className="leading-relaxed mb-4">
                  <T>Clients are responsible for:</T>
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><T>Providing timely feedback and necessary materials</T></li>
                  <li><T>Ensuring all provided content is legally compliant and properly licensed</T></li>
                  <li><T>Maintaining communication throughout the project lifecycle</T></li>
                  <li><T>Providing access to necessary accounts, platforms, and resources</T></li>
                  <li><T>Timely review and approval of deliverables</T></li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4"><T>Revisions and Changes</T></h2>
                <p className="leading-relaxed">
                  <T>Each project includes a specified number of revision rounds as outlined in the agreement. Additional revisions beyond the agreed scope may incur additional charges. Significant changes to project requirements may require a new proposal and agreement.</T>
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4"><T>Warranties and Disclaimers</T></h2>
                <p className="leading-relaxed mb-4">
                  <T>Igani warrants that:</T>
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><T>Services will be performed in a professional and workmanlike manner</T></li>
                  <li><T>Deliverables will substantially conform to agreed specifications</T></li>
                  <li><T>We will not knowingly infringe on third-party intellectual property rights</T></li>
                </ul>
                <p className="leading-relaxed mt-4">
                  <T>However, we do not warrant that our services will be uninterrupted or error-free, or that deliverables will meet all client expectations not explicitly documented in the project agreement.</T>
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4"><T>Limitation of Liability</T></h2>
                <p className="leading-relaxed">
                  <T>To the maximum extent permitted by law, Igani shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues. Our total liability shall not exceed the total amount paid by the client for the specific project giving rise to the claim.</T>
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4"><T>Confidentiality</T></h2>
                <p className="leading-relaxed">
                  <T>Both parties agree to maintain the confidentiality of any proprietary or sensitive information shared during the course of the project. This obligation survives the termination of the project agreement.</T>
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4"><T>Termination</T></h2>
                <p className="leading-relaxed">
                  <T>Either party may terminate the project agreement with written notice. Upon termination, the client shall pay for all work completed to date. Igani retains the right to refuse service to anyone for any reason.</T>
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4"><T>Governing Law</T></h2>
                <p className="leading-relaxed">
                  <T>These terms shall be governed by and construed in accordance with the laws of Israel. Any disputes arising from these terms or our services shall be subject to the exclusive jurisdiction of the courts in Israel.</T>
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4"><T>Changes to Terms</T></h2>
                <p className="leading-relaxed">
                  <T>We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting to our website. Continued use of our services following any changes constitutes acceptance of the new terms.</T>
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4"><T>Contact Information</T></h2>
                <p className="leading-relaxed">
                  <T>For questions regarding these Terms of Service, please contact us:</T>
                </p>
                <div className="mt-4 p-4 bg-slate-900/60 rounded-xl border border-slate-700/50">
                  <p className="text-cyan-400 font-semibold"><T>Email:</T> info@igani.co</p>
                  <p className="text-slate-400 mt-2"><T>Phone:</T> +972 58 44 77757</p>
                  <p className="text-slate-400 mt-2"><T>Location:</T> Netanya, Israel</p>
                </div>
              </section>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="relative z-10">
        <Footer 
          siteName="IGANI" 
          tagline="Premium web development with a personal touch" 
        />
      </div>
    </div>
  )
}
