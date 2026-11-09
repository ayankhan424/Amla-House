# Amla House

An independent portfolio storefront concept for a Dabur Amla hair-care product edit in Pakistan. It is not operated, owned, or endorsed by Dabur. The site has no database, accounts, payment gateway, order processing, or live inventory.

## Stack

Next.js App Router, TypeScript, Tailwind CSS 4, React 19, Framer Motion, Lucide, React Hook Form, Zod, and Groq Cloud's Chat Completions API.

## Run locally

1. Install Node.js 20.9+.
2. Copy `.env.example` to `.env.local`.
3. Set `NEXT_PUBLIC_SITE_URL` to the local or deployed origin. Add a WhatsApp number in international digits without `+` (for example, the seller's real Pakistan business number) and a contact email when available. Do not use a made-up number.
4. Install and run:

   ```bash
   npm install
   npm run dev
   ```

5. Open `http://localhost:3000`.

To enable live Groq answers, set `GROQ_API_KEY` in `.env.local` and optionally select a supported `GROQ_MODEL`. The key is server-only. Without it, the consultant uses deterministic demo replies that are labelled as demo guidance.

## Configure business details

- `NEXT_PUBLIC_WHATSAPP_NUMBER`: one WhatsApp Business number for support and order drafts; digits only, country code included. Invalid or missing values disable direct links.
- `NEXT_PUBLIC_CONTACT_EMAIL`: general inquiry recipient. The form opens a prefilled mailto draft and does not claim the user sent it.
- `NEXT_PUBLIC_SITE_URL`: canonical site origin, used in metadata and sitemap. Change from the placeholder before deployment.
- `GROQ_API_KEY`: secret kept on the server. Never prefix it with `NEXT_PUBLIC_`.
- `GROQ_MODEL`: optional Groq model ID. Defaults to `openai/gpt-oss-120b`.

## Edit product data

Products live in `src/data/products.ts`. Each variant has a size and PKR price. All current prices have `estimated: true`, because the referenced official pages list sizes but do not give Pakistan retail prices. Edit price estimates or replace them after independent local confirmation. Product descriptions, sizes, ingredients and usage should be updated only from an authoritative source. The current Pakistan references confirm three hair oils. Shampoo is not included: the research surfaced no Pakistan-specific Dabur Amla shampoo product page or sizes, and shampoo listings from other countries are not assumed to apply to Pakistan.

Official references consulted:

- https://www.daburinternational.com/pak/product/dabur-amla-hair-oil
- https://www.daburinternational.com/pak/product/dabur-amla-sarson-hair-oil
- https://www.daburinternational.com/pak/product/dabur-roghan-e-badam-amla-hair-oil-for-strong-soft-and-shiny-hair

Product photos are referenced from the manufacturer or retailer/source recorded with each item in `src/data/products.ts`; the catalogue includes a mix of sources and should not be described as exclusively Pakistan-official imagery. Images load directly from those hosts without Next's image proxy, so a source can change or block embedding. Use appropriately authorized local assets in `public/images` if a source becomes unavailable.

## WhatsApp ordering

Cart and product page drafts encode the selected size, quantity, sample price and subtotal. Put the real business number in `.env.local` (or the hosting environment); `.env.example` keeps contact values blank. A WhatsApp message starts a conversation, not a completed transaction. Availability, delivery and payment are confirmed separately.

## Amla AI

The existing hair-care assistant is named Amla AI. With `GROQ_API_KEY` configured, it streams chat completions from Groq Cloud's documented API. The server supplies the live product catalogue, retailer price snapshots, sizes, and only verified usage/ingredient details. Product recommendation cards are resolved against catalogue IDs and use the matching catalogue image and cart action. User-provided email addresses and phone-like numbers in chat history are redacted before the conversation is sent to Groq.

Without a key, the API and interface label deterministic catalogue replies as demo guidance; they do not claim to be live AI responses. Input is bounded and validated, and the current rate limiter allows 12 requests per minute per client IP in each Node.js process. For a horizontally scaled production deployment, replace this in-memory limiter with a shared rate-limit store.

## Deploy to Vercel

1. Push the project to a Git provider and import it into Vercel.
2. Set the same variables from `.env.example` in Vercel Project Settings → Environment Variables. Add `GROQ_API_KEY` as a server environment variable only.
3. Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS origin and redeploy so canonical metadata and sitemap use it.
4. Build command is `npm run build`; output is managed by Next.js.

## Included

- Home, shop, product detail, about, contact, cart and wishlist routes.
- Search suggestions, category/size/price filters, fixed showcase ranking and price sorting.
- Persistent client cart, wishlist and theme preference.
- International WhatsApp order/support link validation and encoded drafts.
- Validated mailto contact form.
- Amla AI with streamed Groq replies, catalogue recommendations, cart actions, input limits, rate limiting, personal-data redaction, and explicit demo mode.
- Metadata, product structured data, sitemap, robots and web manifest.
- Responsive layout, keyboard labels, focus styles and reduced-motion support.

## Verification

Run `npm run typecheck`, `npm run lint`, and `npm run build`. Restart the dev server after changing `.env.local`. Browser interaction with the open development server may require a restart if its `.next` cache was overwritten by a production build.
