# AjeMarket — FINAL MVP

This is the complete mobile-first marketplace foundation.

## Business philosophy
AjeMarket is NOT an escrow, wallet or payment-holding service. Buyers find sellers, contact them, physically inspect/verify products and pay sellers directly.

## One-time deployment
1. Run `setup.sql` in Supabase SQL Editor. This intentionally recreates the AjeMarket application tables so the schema is consistent.
2. Upload all files in this folder to the ROOT of your GitHub repository.
3. Keep `index.html` at repository root.
4. GitHub Pages: Settings → Pages → Deploy from branch → main → / (root).
5. Wait for deployment.

## Included
- Marketplace home/search/category/sort
- Product detail pages
- Accounts and email/password authentication
- Seller listing form
- Product image upload to Supabase Storage
- Seller dashboard
- Favorites
- Product reporting
- Buyer/seller message data model
- Seller profile/verification fields
- Safety warning and safety/terms page
- Supabase RLS policies
- Mobile/PWA-ready layout

## Important
The browser uses only the Supabase publishable key. NEVER add a Supabase service_role/secret key to GitHub.

## Admin
`profiles.is_admin` is included for future moderation. Do not make yourself admin from the public browser. Set admin status securely in Supabase when you are ready for the admin dashboard.

## Current deliberate limitation
The message UI is a safe foundation; full real-time chat UI and push notifications are the next production hardening step. The core marketplace, accounts, listings, image storage, favorites, reports and security schema are included now.
