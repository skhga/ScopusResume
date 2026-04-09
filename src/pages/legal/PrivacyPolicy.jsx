// src/pages/legal/PrivacyPolicy.jsx
import { Link } from 'react-router-dom';
import Footer from '../../components/layout/Footer';
import logo from '../../assets/logo.png';

const PRIVACY_EMAIL = 'privacy@scopusresume.com';

function Section({ title, children }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold text-gray-900 mb-3">{title}</h2>
      <div className="text-gray-600 leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Minimal header */}
      <header className="border-b border-gray-100 px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-2" aria-label="Go to homepage">
            <img src={logo} alt="ScopusResume logo" style={{ height: 28, width: 'auto' }} />
            <span className="text-base font-extrabold text-gray-900">
              Scopus<span className="text-brand-600">Resume</span>
            </span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-16">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-gray-400 mb-12">Last updated: April 9, 2026</p>

        <Section title="Introduction">
          <p>
            ScopusResume ("we", "us", or "our") operates the ScopusResume resume
            builder service. This Privacy Policy explains how we collect, use, and
            protect your personal information when you use our service.
          </p>
          <p>
            By using ScopusResume, you agree to the collection and use of information
            in accordance with this policy.
          </p>
        </Section>

        <Section title="Information We Collect">
          <p>We collect the following information when you use ScopusResume:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>
              <span className="font-medium text-gray-800">Account data</span> — your
              email address and name, provided when you sign up.
            </li>
            <li>
              <span className="font-medium text-gray-800">Resume content</span> — the
              text and information you enter into the resume builder. This is stored
              solely to provide the service to you.
            </li>
            <li>
              <span className="font-medium text-gray-800">Session cookies</span> —
              strictly necessary cookies set when you log in. These expire on logout
              or after 7 days of inactivity.
            </li>
          </ul>
        </Section>

        <Section title="How We Use Your Information">
          <p>We use your information only to operate and improve ScopusResume:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>To authenticate you and maintain your session</li>
            <li>To store and retrieve your resume data</li>
            <li>To provide AI-powered resume tailoring features</li>
          </ul>
          <p>
            We do <span className="font-medium text-gray-800">not</span> sell, rent,
            or share your personal data with third parties for marketing or advertising
            purposes.
          </p>
        </Section>

        <Section title="Cookies">
          <p>
            ScopusResume uses only <span className="font-medium text-gray-800">strictly
            necessary</span> session cookies. These cookies are required for the service
            to function — they keep you logged in between page visits.
          </p>
          <p>
            We do not use analytics cookies, advertising cookies, or any third-party
            tracking scripts.
          </p>
          <p>
            To remove cookies, open your browser settings and clear cookies for{' '}
            <span className="font-medium text-gray-800">scopusresume.com</span>. This
            will sign you out of the service.
          </p>
        </Section>

        <Section title="Your Rights — GDPR (EU Residents)">
          <p>If you are located in the European Union, you have the following rights:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li><span className="font-medium text-gray-800">Access</span> — request a copy of the personal data we hold about you</li>
            <li><span className="font-medium text-gray-800">Rectification</span> — request correction of inaccurate data</li>
            <li><span className="font-medium text-gray-800">Erasure</span> — request deletion of your personal data</li>
            <li><span className="font-medium text-gray-800">Portability</span> — request your data in a machine-readable format</li>
          </ul>
          <p>
            To exercise any of these rights, email us at{' '}
            <a href={`mailto:${PRIVACY_EMAIL}`} className="text-brand-600 hover:text-brand-700 underline underline-offset-2">
              {PRIVACY_EMAIL}
            </a>
            . We will respond within 30 days.
          </p>
        </Section>

        <Section title="Your Rights — CCPA (California Residents)">
          <p>If you are a California resident, you have the following rights:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li><span className="font-medium text-gray-800">Right to know</span> — request information about the personal data we collect and how we use it</li>
            <li><span className="font-medium text-gray-800">Right to delete</span> — request deletion of your personal data</li>
          </ul>
          <p className="font-medium text-gray-800">
            We do not sell your personal information.
          </p>
          <p>
            To exercise your rights under CCPA, email{' '}
            <a href={`mailto:${PRIVACY_EMAIL}`} className="text-brand-600 hover:text-brand-700 underline underline-offset-2">
              {PRIVACY_EMAIL}
            </a>
            .
          </p>
        </Section>

        <Section title="Data Retention">
          <p>
            We retain your personal data for as long as your account is active. If you
            delete your account, we will delete your personal data within 30 days of
            your request.
          </p>
        </Section>

        <Section title="Security">
          <p>
            We protect your data using industry-standard encryption in transit (HTTPS)
            and at rest. While we take reasonable steps to secure your information, no
            method of transmission over the internet is 100% secure.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            For privacy-related questions or requests, contact us at{' '}
            <a href={`mailto:${PRIVACY_EMAIL}`} className="text-brand-600 hover:text-brand-700 font-medium underline underline-offset-2">
              {PRIVACY_EMAIL}
            </a>
            .
          </p>
        </Section>
      </main>

      <Footer />
    </div>
  );
}
