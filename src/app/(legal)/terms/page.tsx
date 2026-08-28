import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | The Asset Algorithm",
  description: "Terms of Service for The Asset Algorithm platform.",
};

export default function TermsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-xs text-muted-foreground">Last updated: May 2026</p>

      <h2 className="mt-8 text-lg font-semibold">1. Service Description</h2>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        The Asset Algorithm (&quot;Service&quot;), operated at assets.aismartr.com, is an
        AI-powered platform for business acquisition professionals. The Service provides deal
        sourcing, automated outreach, advisory analysis, relationship management, and related
        tools designed to streamline the acquisition process.
      </p>

      <h2 className="mt-8 text-lg font-semibold">2. Account Responsibilities</h2>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        You are responsible for maintaining the confidentiality of your account credentials and
        for all activity that occurs under your account. You must provide accurate, current, and
        complete information during registration and keep your account information up to date.
        You agree to notify us immediately of any unauthorized use of your account.
      </p>

      <h2 className="mt-8 text-lg font-semibold">3. Acceptable Use</h2>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        When using the Service, including its outreach automation features, you agree to:
      </p>
      <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground space-y-1">
        <li>Comply with all applicable laws, including CAN-SPAM, GDPR, and CCPA</li>
        <li>Not send unsolicited bulk messages or spam through the outreach tools</li>
        <li>Not use the platform to harass, mislead, or deceive any person or entity</li>
        <li>Not attempt to reverse-engineer, scrape, or misuse the AI systems</li>
        <li>Not share account access with unauthorized third parties</li>
        <li>Not use the Service for any illegal or fraudulent purpose</li>
      </ul>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        We reserve the right to suspend or terminate accounts that violate these terms or engage
        in activity that degrades the experience for other users.
      </p>

      <h2 className="mt-8 text-lg font-semibold">4. Subscription and Billing</h2>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        The Service is offered on a subscription basis with monthly and yearly billing options.
        Subscriptions auto-renew at the end of each billing period unless cancelled. You may
        cancel your subscription at any time through your account settings; cancellation takes
        effect at the end of the current billing period. Refunds are not provided for partial
        billing periods. We reserve the right to change pricing with 30 days&apos; notice.
      </p>

      <h2 className="mt-8 text-lg font-semibold">5. AI-Generated Content Disclaimer</h2>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        The Service uses artificial intelligence to generate deal analyses, outreach drafts,
        advisory insights, and other content. This AI-generated content is provided for
        informational purposes only and does not constitute financial, legal, investment, or
        professional advice. You should independently verify all information and consult
        qualified professionals before making acquisition decisions. We do not guarantee the
        accuracy, completeness, or suitability of AI-generated outputs.
      </p>

      <h2 className="mt-8 text-lg font-semibold">6. Data and Content Ownership</h2>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        You retain full ownership of all data, content, and materials you upload or input into
        the Service. By using the Service, you grant us a limited license to process your data
        solely for the purpose of providing and improving the Service. We do not sell your data
        to third parties. Upon account deletion, your data will be removed in accordance with
        our Privacy Policy.
      </p>

      <h2 className="mt-8 text-lg font-semibold">7. Limitation of Liability</h2>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        To the maximum extent permitted by law, The Asset Algorithm and its operators shall not
        be liable for any indirect, incidental, special, consequential, or punitive damages,
        including loss of profits, data, or business opportunities, arising from your use of
        the Service. Our total liability for any claim related to the Service shall not exceed
        the amount you paid us in the twelve months preceding the claim. The Service is provided
        &quot;as is&quot; without warranties of any kind, express or implied.
      </p>

      <h2 className="mt-8 text-lg font-semibold">8. Termination</h2>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        We may suspend or terminate your access to the Service at any time for violation of
        these Terms, non-payment, or at our discretion with reasonable notice. You may terminate
        your account at any time. Upon termination, your right to use the Service ceases
        immediately. Provisions that by their nature should survive termination (including
        limitation of liability and dispute resolution) will remain in effect.
      </p>

      <h2 className="mt-8 text-lg font-semibold">9. Changes to Terms</h2>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        We may update these Terms from time to time. We will notify you of material changes via
        email or through the Service at least 14 days before they take effect. Your continued
        use of the Service after the effective date constitutes acceptance of the updated Terms.
        If you do not agree to the changes, you must stop using the Service and cancel your
        subscription.
      </p>

      <h2 className="mt-8 text-lg font-semibold">10. Contact</h2>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        If you have questions about these Terms, please contact us at{" "}
        <a href="mailto:support@aismartr.com" className="text-foreground underline underline-offset-4">
          support@aismartr.com
        </a>.
      </p>
    </div>
  );
}
