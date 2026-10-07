import { OFFER_CATALOG, type OfferId } from '@tablecards/core/catalog';
import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PublicSessionAction } from '../public-session-action';

const offerFeatures: Record<OfferId, readonly string[]> = {
  free: ['25 cards', '1 active project', '3 designs', '1 AI batch'],
  event_pass: ['500 cards', 'All designs', 'Artwork upload', '2 AI batches'],
  planner_pro: [
    '25 active projects',
    'Reusable presets',
    'Uploads',
    '10 AI batches monthly',
  ],
  studio: [
    '100 active projects',
    'Up to 5 members',
    'Shared presets',
    '30 AI batches monthly',
  ],
};

const offerActions: Record<OfferId, string> = {
  free: 'Create free PDF',
  event_pass: 'Finish one event',
  planner_pro: 'Start Planner Pro',
  studio: 'Start Studio',
};

export function Component() {
  const location = useLocation();
  useEffect(() => {
    const section =
      location.hash.slice(1) ||
      new URLSearchParams(location.search).get('section');
    if (section && ['pricing', 'how-it-works', 'faq'].includes(section))
      document.getElementById(section)?.scrollIntoView({ block: 'start' });
  }, [location.hash, location.search]);
  return (
    <main className="landing-page" id="public-content" tabIndex={-1}>
      <section className="hero" aria-labelledby="landing-title">
        <div className="hero-copy">
          <p className="eyebrow">Your guest list, ready for the table</p>
          <h1 id="landing-title">
            Place cards that print <em>right</em> the first time.
          </h1>
          <p className="hero-lead">
            Import names, preview every folded card, then download a precise PDF
            to print at home or at the print shop you choose.
          </p>
          <div className="hero-actions">
            <Link className="button" to="/create">
              Create free — up to 25 cards
            </Link>
            <PublicSessionAction
              className="secondary-button"
              signedInLabel="Open Projects"
            />
          </div>
          <p className="muted">Digital PDF only. No printing or shipping.</p>
        </div>
        <div className="hero-art" aria-label="Example folded place cards">
          <div className="linen" />
          <div className="place-card place-card-back">
            <span>Table 12</span>
            <strong>Lin Manuel</strong>
          </div>
          <div className="place-card place-card-front">
            <span>Table 12 · Vegan</span>
            <strong>Ada Lovelace</strong>
            <i aria-hidden="true">✦</i>
          </div>
        </div>
      </section>

      <section className="how-section" id="how-it-works">
        <div className="section-intro centered">
          <p className="eyebrow">No layout wrestling</p>
          <h2>From spreadsheet to scissors in three steps</h2>
        </div>
        <div className="how-grid">
          {[
            ['01', 'Bring the list', 'Paste names or upload CSV/XLSX.'],
            ['02', 'Inspect every sheet', 'Check names, folds and page count.'],
            [
              '03',
              'Download the PDF',
              'Print at Actual Size wherever you choose.',
            ],
          ].map(([number, title, copy]) => (
            <article key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="pricing-section" id="pricing">
        <div className="section-intro centered">
          <p className="eyebrow">Simple pilot pricing</p>
          <h2>Start free, then pay for the workflow you need</h2>
          <p className="notice">
            Preview checkout is a no-charge simulation. Prices shown describe
            proposed offers, not a live charge or paid subscription.
          </p>
        </div>
        <div className="pricing-grid">
          {(Object.keys(OFFER_CATALOG) as OfferId[]).map((offerId) => {
            const offer = OFFER_CATALOG[offerId];
            return (
              <article className="price-card" key={offerId}>
                <h3>{offer.name}</h3>
                <p className="price">
                  <strong>${offer.priceUsd}</strong>
                  <span>
                    {offer.billing === 'monthly'
                      ? '/ month'
                      : offer.billing === 'one_time'
                        ? 'one time'
                        : 'forever'}
                  </span>
                </p>
                <ul>
                  {offerFeatures[offerId].map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                {offerId === 'free' ? (
                  <Link className="secondary-button" to="/create">
                    {offerActions[offerId]}
                  </Link>
                ) : (
                  <PublicSessionAction
                    className="secondary-button"
                    intent="continue"
                    returnPath={`/settings?offer=${offerId}`}
                    destination={`/settings?offer=${offerId}`}
                    signedInLabel={offerActions[offerId]}
                    signedOutLabel={offerActions[offerId]}
                  />
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="faq-section" id="faq">
        <div className="section-intro">
          <p className="eyebrow">Good to know</p>
          <h2>Before you print</h2>
        </div>
        <div className="faq-list">
          <details open>
            <summary>Do you mail printed cards?</summary>
            <p>
              No. TableCards creates a downloadable PDF for independent
              printing.
            </p>
          </details>
          <details>
            <summary>Can I try it without an account?</summary>
            <p>
              Yes. Import, design and preview first. Sign in only to save or
              export.
            </p>
          </details>
          <details>
            <summary>Does AI see my guest list?</summary>
            <p>
              No. AI receives your visual style description and, if you choose
              one, a resized company/style reference image—not your guest list.
            </p>
          </details>
        </div>
      </section>
    </main>
  );
}
