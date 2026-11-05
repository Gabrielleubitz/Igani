import { T } from '@/components/T'
import { NewSiteShell } from '@/components/newsite/NewSiteShell'
import { GABRIEL_PHONE, formatPhone } from '@/lib/siteSocial'

export default function PrivacyPage() {
  return (
    <NewSiteShell>
      <article className="lg">
        <p className="crumbs"><a href="/">Home</a> <span>/</span> Privacy Policy</p>
        <h1><T>Privacy Policy</T></h1>
            <p><T>Last updated: January 2025</T></p>

            <section>
                <h2><T>Introduction</T></h2>
                <p>
                  <T>At Igani, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our services.</T>
                </p>
              </section>

              <section>
                <h2><T>Information We Collect</T></h2>
                <p>
                  <T>We collect information that you provide directly to us, including:</T>
                </p>
                <ul>
                  <li><T>Name and contact information (email address, phone number)</T></li>
                  <li><T>Project details and business requirements</T></li>
                  <li><T>Communication preferences</T></li>
                  <li><T>Any other information you choose to provide</T></li>
                </ul>
              </section>

              <section>
                <h2><T>How We Use Your Information</T></h2>
                <p>
                  <T>We use the information we collect to:</T>
                </p>
                <ul>
                  <li><T>Respond to your inquiries and provide customer support</T></li>
                  <li><T>Process your requests and deliver our services</T></li>
                  <li><T>Send you updates about your projects</T></li>
                  <li><T>Improve our website and services</T></li>
                  <li><T>Comply with legal obligations</T></li>
                </ul>
              </section>

              <section>
                <h2><T>Data Security</T></h2>
                <p>
                  <T>We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.</T>
                </p>
              </section>

              <section>
                <h2><T>Information Sharing</T></h2>
                <p>
                  <T>We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:</T>
                </p>
                <ul>
                  <li><T>With your explicit consent</T></li>
                  <li><T>To comply with legal obligations</T></li>
                  <li><T>To protect our rights and prevent fraud</T></li>
                  <li><T>With service providers who assist in our operations (under strict confidentiality agreements)</T></li>
                </ul>
              </section>

              <section>
                <h2><T>Cookies and Tracking</T></h2>
                <p>
                  <T>Our website may use cookies and similar tracking technologies to enhance your browsing experience. You can control cookie settings through your browser preferences.</T>
                </p>
              </section>

              <section>
                <h2><T>Your Rights</T></h2>
                <p>
                  <T>You have the right to:</T>
                </p>
                <ul>
                  <li><T>Access the personal information we hold about you</T></li>
                  <li><T>Request correction of inaccurate information</T></li>
                  <li><T>Request deletion of your personal information</T></li>
                  <li><T>Opt-out of marketing communications</T></li>
                  <li><T>Lodge a complaint with a supervisory authority</T></li>
                </ul>
              </section>

              <section>
                <h2><T>Changes to This Policy</T></h2>
                <p>
                  <T>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.</T>
                </p>
              </section>

              <section>
                <h2><T>Contact Us</T></h2>
                <p>
                  <T>If you have any questions about this Privacy Policy or our data practices, please contact us at:</T>
                </p>
                <div className="lg__box"><p><T>Email:</T> info@igani.co</p>
                  <p><T>Phone:</T> {formatPhone(GABRIEL_PHONE)}</p>
                  <p><T>Location:</T> Netanya, Israel</p>
                </div>
              </section>
            
      </article>
    </NewSiteShell>
  )
}
