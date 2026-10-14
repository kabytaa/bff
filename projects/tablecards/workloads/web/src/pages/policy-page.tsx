import { Link } from 'react-router-dom';

type PolicyKind = 'contact' | 'privacy' | 'terms';

export function PolicyPage({ kind }: { readonly kind: PolicyKind }) {
  const title = {
    contact: 'Contact',
    privacy: 'Privacy',
    terms: 'Terms of use',
  }[kind];
  return (
    <main
      id="public-content"
      tabIndex={-1}
      className="app-page policy-page"
      aria-labelledby="policy-title"
    >
      <p className="eyebrow">TableCards no-charge preview</p>
      <h1 id="policy-title">{title}</h1>
      <p className="notice">
        Updated October 14, 2026. This is a no-charge preview, not a commercial
        launch. No-charge test checkout is limited to operator-designated test
        users in test-only workspaces.
      </p>
      {kind === 'privacy' ? (
        <>
          <h2>What the app stores</h2>
          <p>
            Signing in uses the shared Tofler authentication service. It stores
            your verified identity, workspace memberships and session
            information. Saved projects store their event title, guest names,
            table labels, markers, design choices and uploaded artwork.
            Generated backgrounds and PDFs are also stored so you can return to
            them. Help conversations, submitted support messages, feedback,
            permitted screenshots and limited product activity events are stored
            to answer questions and investigate problems.
          </p>
          <h2>Where data goes</h2>
          <p>
            The web application and session gateway run on Cloudflare; the
            product and shared authentication backends use Convex. Google is an
            enabled sign-in provider. Background generation uses Cloudflare
            Workers AI with a daily usage cap. Cloudflare receives your style
            prompt and, if selected, a resized reference image. Guest lists and
            account details are not automatically attached. The reference image
            is used for generation, not saved as a separate library asset.
            Development also offers an explicitly labelled test-fixture engine
            that makes no AI calls.
          </p>
          <p>
            AI help sends your question, relevant conversation history, assigned
            product guidance and permitted customer context to Cloudflare. AI
            can make mistakes; review its advice. Support email is sent and
            received through Resend. Only PNG/JPEG attachments are supported;
            Cloudflare processes them into private previews. We do not offer
            original attachments as downloads. Do not include a private guest
            list, passwords or payment details in help or support.
          </p>
          <h2>Your session and files</h2>
          <p>
            A secure session cookie keeps you signed in; short-lived credentials
            authorize workspace operations. Account selection and unfinished
            guest-list drafts use storage in this browser tab. New private
            artwork and PDF requests require an authorized current workspace and
            an active session. Downloads already saved to your device are under
            your control. Some older development files were served through
            bearer links; those links cannot be retroactively revoked without
            replacing or deleting the underlying files.
          </p>
          <h2>Preview data and requests</h2>
          <p>
            Use synthetic guest names where possible. Archiving a project hides
            it from active projects; it is not deletion. Preview data can remain
            until operator cleanup. Automated retention, self-service deletion
            are not yet provided. Use <Link to="/contact">Contact</Link> for a
            data request. Do not upload sensitive personal or payment
            information.
          </p>
        </>
      ) : kind === 'terms' ? (
        <>
          <h2>PDF only — you arrange printing</h2>
          <p>
            TableCards creates downloadable place-card PDFs. We do not supply
            paper, printing, shipping or reprints. Print at actual size / 100%,
            use the separate print-test PDF to check its calibration square and
            confirm your printer can handle the selected paper and margins
            before printing a full event. Normal exports contain card sheets
            only, without a calibration page.
          </p>
          <h2>No-charge preview</h2>
          <p>
            Prices shown describe proposed offers. Shared test checkout is
            available only to designated test users in test-only workspaces. It
            does not collect payment or start a real paid subscription. Mock
            renewal and AI allowances simulate successful payments for testing;
            they are not a promise of free ongoing commercial access.
          </p>
          <h2>Your content</h2>
          <p>
            Upload only artwork you have permission to use, and provide guest
            information you are authorized to process. Review spelling, table
            assignments and readability before export. Preview features may
            change and preview data should not be your only copy.
          </p>
          <h2>Before commercial launch</h2>
          <p>
            Verified seller details, commercial terms, payment-provider
            disclosures, applicable cancellation and refund arrangements, and a
            customer-launch support arrangements must be established before real
            paid checkout is enabled. This preview page does not claim that
            those checks are complete.
          </p>
        </>
      ) : (
        <>
          <h2>Preview help</h2>
          <p>
            For this no-charge preview, use Help or the Contact page. Include
            the page, the action you tried and any short error reference. Never
            send a session cookie, access token, payment details or a private
            guest list.
          </p>
          <p>
            Signed-in customers can submit a question, problem or feedback;
            signed-out visitors can use the configured email contact shown
            there. Follow-up is by email. AI support suggestions are reviewed by
            an operator before sending; no response-time guarantee is made.
          </p>
          <p>
            <Link to="/contact">Contact support or send feedback</Link>
          </p>
        </>
      )}
      <p>
        <Link to="/">Back to TableCards</Link>
      </p>
    </main>
  );
}
