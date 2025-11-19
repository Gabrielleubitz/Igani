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

export default function PrivacyPage() {
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
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4"><T>Privacy Policy</T></h1>
            <p className="text-slate-400 mb-8"><T>Last updated: January 2025</T></p>

            <div className="space-y-8 text-slate-300">
              <section>
                <h2 className="text-2xl font-bold text-white mb-4"><T>Introduction</T></h2>
                <p className="leading-relaxed">
                  <T>At Igani, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our services.</T>
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4"><T>Information We Collect</T></h2>
                <p className="leading-relaxed mb-4">
                  <T>We collect information that you provide directly to us, including:</T>
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><T>Name and contact information (email address, phone number)</T></li>
                  <li><T>Project details and business requirements</T></li>
                  <li><T>Communication preferences</T></li>
                  <li><T>Any other information you choose to provide</T></li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4"><T>How We Use Your Information</T></h2>
                <p className="leading-relaxed mb-4">
                  <T>We use the information we collect to:</T>
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><T>Respond to your inquiries and provide customer support</T></li>
                  <li><T>Process your requests and deliver our services</T></li>
                  <li><T>Send you updates about your projects</T></li>
                  <li><T>Improve our website and services</T></li>
                  <li><T>Comply with legal obligations</T></li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4"><T>Data Security</T></h2>
                <p className="leading-relaxed">
                  <T>We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.</T>
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4"><T>Information Sharing</T></h2>
                <p className="leading-relaxed">
                  <T>We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:</T>
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
                  <li><T>With your explicit consent</T></li>
                  <li><T>To comply with legal obligations</T></li>
                  <li><T>To protect our rights and prevent fraud</T></li>
                  <li><T>With service providers who assist in our operations (under strict confidentiality agreements)</T></li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4"><T>Cookies and Tracking</T></h2>
                <p className="leading-relaxed">
                  <T>Our website may use cookies and similar tracking technologies to enhance your browsing experience. You can control cookie settings through your browser preferences.</T>
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4"><T>Your Rights</T></h2>
                <p className="leading-relaxed mb-4">
                  <T>You have the right to:</T>
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><T>Access the personal information we hold about you</T></li>
                  <li><T>Request correction of inaccurate information</T></li>
                  <li><T>Request deletion of your personal information</T></li>
                  <li><T>Opt-out of marketing communications</T></li>
                  <li><T>Lodge a complaint with a supervisory authority</T></li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4"><T>Changes to This Policy</T></h2>
                <p className="leading-relaxed">
                  <T>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.</T>
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4"><T>Contact Us</T></h2>
                <p className="leading-relaxed">
                  <T>If you have any questions about this Privacy Policy or our data practices, please contact us at:</T>
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
