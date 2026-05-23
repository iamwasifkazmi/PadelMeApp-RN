/**
 * Production API + invite links use Cloud Run until mipadel.co.uk DNS is configured.
 * See Backend/docs/DOMAIN.md
 */
export const GCP_PUBLIC_ORIGIN =
  "https://padelme-backend-781275999853.europe-west2.run.app";

/** Site + API host for this release. */
export const PRODUCTION_ORIGIN = GCP_PUBLIC_ORIGIN;

export const API_BASE_URL = `${PRODUCTION_ORIGIN}/api`;

/** HTTPS links in Share / WhatsApp / SMS (opens invite landing → app). */
export const INVITE_LINK_ORIGIN = PRODUCTION_ORIGIN;

/** Marketing domain (future). */
export const APP_ORIGIN = "https://mipadel.co.uk";
