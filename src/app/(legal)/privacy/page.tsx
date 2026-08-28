import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | The Asset Algorithm",
  description: "Privacy Policy for The Asset Algorithm platform.",
};

export default function PrivacyPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-xs text-muted-foreground">Last updated: May 2026</p>

      <h2 className="mt-8 text-lg font-semibold">1. Information We Collect</h2>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        We collect information you provide directly when using The Asset Algorithm:
      </p>
      <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground space-y-1">
        <li><strong>Account information:</strong> name, email address, password, and billing details</li>
        <li><strong>Business data:</strong> company information, contact details, deal criteria, and acquisition targets you input into the platform</li>
        <li><strong>Outreach content:</strong> messages, templates, and communication preferences you configure</li>
        <li><strong>Usage data:</strong> how you interact with the Service, features used, pages visited, and session duration</li>
        <li><strong>Device information:</strong> browser type, operating system, and IP address</li>
      </ul>

      <h2 className="mt-8 text-lg font-semibold">2. How We Use Your Data</h2>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        We use the information we collect to:
      </p>
      <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground space-y-1">
        <li>Provide, maintain, and improve the Service</li>
        <li>Process your data through AI models to generate deal analyses and recommendations</li>
        <li>Send outreach communications on your behalf as configured</li>
        <li>Process payments and manage your subscription</li>
        <li>Send transactional emails (account confirmations, billing receipts, security alerts)</li>
        <li>Analyze usage patterns to improve product features and performance</li>
        <li>Detect and prevent fraud, abuse, or security incidents</li>
      </ul>

      <h2 className="mt-8 text-lg font-semibold">3. Third-Party Services</h2>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        We use the following third-party services to operate the platform:
      </p>
      <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground space-y-1">
        <li><strong>Supabase:</strong> database hosting, authentication, and file storage</li>
        <li><strong>Stripe:</strong> payment processing and subscription management</li>
        <li><strong>Anthropic:</strong> AI model provider for analysis and content generation</li>
        <li><strong>Resend:</strong> transactional and outreach email delivery</li>
        <li><strong>Twilio:</strong> SMS and voice communication services</li>
        <li><strong>PostHog:</strong> product analytics and usage tracking</li>
      </ul>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        Each third-party provider processes data in accordance with their own privacy policies.
        We only share the minimum data necessary for each service to function.
      </p>

      <h2 className="mt-8 text-lg font-semibold">4. AI Data Processing</h2>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        When you use AI-powered features, your business data and queries are sent to Anthropic
        for processing. This data is used solely to generate responses for you and is not used
        to train Anthropic&apos;s models. We do not store AI conversation logs beyond what is
        necessary to provide the Service. You can request deletion of your processed data at
        any time.
      </p>

      <h2 className="mt-8 text-lg font-semibold">5. Data Retention</h2>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        We retain your account data for as long as your account is active. If you delete your
        account, we will remove your personal data within 30 days, except where retention is
        required by law (e.g., billing records for tax purposes). Usage analytics are retained
        in anonymized form and are not linked back to individual accounts after deletion.
      </p>

      <h2 className="mt-8 text-lg font-semibold">6. Data Security</h2>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        We implement industry-standard security measures to protect your data:
      </p>
      <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground space-y-1">
        <li>Encryption in transit (TLS) and at rest</li>
        <li>Row-level security (RLS) policies ensuring data isolation between accounts</li>
        <li>Regular security audits and vulnerability assessments</li>
        <li>Strict access controls limiting employee access to production data</li>
        <li>Automated monitoring for suspicious activity</li>
      </ul>

      <h2 className="mt-8 text-lg font-semibold">7. Your Rights</h2>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        Depending on your jurisdiction, you may have the following rights regarding your data:
      </p>
      <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground space-y-1">
        <li><strong>Access:</strong> request a copy of the personal data we hold about you</li>
        <li><strong>Correction:</strong> request correction of inaccurate or incomplete data</li>
        <li><strong>Deletion:</strong> request deletion of your personal data</li>
        <li><strong>Export:</strong> receive your data in a structured, machine-readable format</li>
        <li><strong>Objection:</strong> object to certain types of data processing</li>
      </ul>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        To exercise any of these rights, contact us at the email below. We will respond within
        30 days.
      </p>

      <h2 className="mt-8 text-lg font-semibold">8. Cookies</h2>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        We use minimal cookies strictly necessary for the Service to function. This includes
        an authentication session cookie to keep you signed in. We do not use third-party
        advertising cookies or cross-site tracking cookies. PostHog analytics uses first-party
        cookies that do not track you across other websites.
      </p>

      <h2 className="mt-8 text-lg font-semibold">9. Children&apos;s Privacy</h2>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        The Service is not intended for individuals under 18 years of age. We do not knowingly
        collect personal data from children. If we become aware that a user is under 18, we
        will promptly delete their account and associated data.
      </p>

      <h2 className="mt-8 text-lg font-semibold">10. Changes to This Policy</h2>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        We may update this Privacy Policy from time to time. We will notify you of material
        changes via email or through the Service at least 14 days before they take effect.
        Your continued use of the Service after the effective date constitutes acceptance of
        the updated policy.
      </p>

      <h2 className="mt-8 text-lg font-semibold">11. Contact</h2>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        For privacy-related inquiries or to exercise your data rights, contact us at{" "}
        <a href="mailto:privacy@aismartr.com" className="text-foreground underline underline-offset-4">
          privacy@aismartr.com
        </a>.
      </p>
    </div>
  );
}
