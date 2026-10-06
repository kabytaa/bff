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
      <p className="eyebrow">TableCards development preview</p>
      <h1 id="policy-title">{title}</h1>
      <p className="notice">
        Updated October 6, 2026. This is a development preview, not a commercial
        launch. Checkout is a clearly labelled no-charge simulation.
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
            them.
          </p>
          <h2>Where data goes</h2>
          <p>
            The web application and session gateway run on Cloudflare; the
            product and shared authentication backends use Convex. Google is an
            enabled sign-in provider. Development background generation is
            deterministic test artwork, not a paid image-generation call. The
            image-generation request uses your design prompt, not your guest
            list.
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
          <h2>Development data and requests</h2>
          <p>
            Use synthetic guest names where possible. Archiving a project hides
            it from active projects; it is not deletion. Development data can
            remain until operator cleanup. Automated retention, self-service
            deletion and a public support channel are not yet provided. Contact
            the person who invited you to this preview for a data request. Do
            not upload sensitive personal or payment information.
          </p>
        </>
      ) : kind === 'terms' ? (
        <>
          <h2>PDF only — you arrange printing</h2>
          <p>
            TableCards creates downloadable place-card PDFs. We do not supply
            paper, printing, shipping or reprints. Print at actual size / 100%,
            check the calibration square and confirm your printer can handle the
            selected paper and margins before printing a full event.
          </p>
          <h2>No-charge preview</h2>
          <p>
            Prices shown describe proposed offers. This Build 3 preview uses
            shared mock checkout and does not collect payment or start a real
            paid subscription. Mock renewal and AI allowances simulate
            successful payments for testing; they are not a promise of free
            ongoing commercial access.
          </p>
          <h2>Your content</h2>
          <p>
            Upload only artwork you have permission to use, and provide guest
            information you are authorized to process. Review spelling, table
            assignments and readability before export. Preview features may
            change and development data should not be your only copy.
          </p>
          <h2>Before commercial launch</h2>
          <p>
            Verified seller details, commercial terms, payment-provider
            disclosures, applicable cancellation and refund arrangements, and a
            working public support channel must be established before real paid
            checkout is enabled. This preview page does not claim that those
            checks are complete.
          </p>
        </>
      ) : (
        <>
          <h2>Preview help</h2>
          <p>
            For this development preview, contact the operator who gave you
            access. Include the page, the action you tried and any short error
            reference. Never send a session cookie, access token, payment
            details or a private guest list.
          </p>
          <p>
            A public support email and two-way support workflow are not
            configured yet. They will be published before customer launch; this
            page intentionally does not show an unmonitored or invented address.
          </p>
        </>
      )}
      <p>
        <Link to="/">Back to TableCards</Link>
      </p>
    </main>
  );
}
