/**
 * Production API + invite links (Application LB → Cloud Run).
 * See Backend/docs/LOAD_BALANCER_DOMAIN.md
 */
export const GCP_PUBLIC_ORIGIN = "https://api.mipadel.co.uk";

/** Site + API host for this release. */
export const PRODUCTION_ORIGIN = GCP_PUBLIC_ORIGIN;

export const API_BASE_URL = `${PRODUCTION_ORIGIN}/api`;

/** HTTPS links in Share / WhatsApp / SMS (opens invite landing → app). */
export const INVITE_LINK_ORIGIN = PRODUCTION_ORIGIN;

/** Marketing domain (Stripe return URLs, branding). */
export const APP_ORIGIN = "https://mipadel.co.uk";
