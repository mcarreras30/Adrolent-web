# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Adrolent Óptica, an optical shop in Adrogué, Argentina. The public storefront (`index.html`, ~1.5MB) is a single static HTML file — markup, CSS, JS, and several product images as inline base64 `data:` URIs all live in one file, with an in-memory, hardcoded catalog (no CMS, no database). Alongside it, the repo now also has a small **Vercel** deployment surface: a private admin panel (`admin/`) backed by Supabase, and a couple of Node serverless functions (`api/`) that handle real Mercado Pago payments. There is no bundler and no test suite. All copy is in Spanish (Argentina).

## Working with this file

- `index.html` itself still has no build/lint/dev-server step — open it directly in a browser, or serve the directory with any static file server (e.g. `python3 -m http.server`). The repo as a whole, however, now has a root `package.json` (`mercadopago`, `@supabase/supabase-js`) that Vercel installs to run the functions in `api/` — `vercel dev` is the way to exercise the full stack (static pages + serverless functions) locally.
- `index.html` is huge but mostly line-structured: `<style>` spans roughly lines 11–511, the HTML body starts at line 514, and the single `<script>` block starts around line 947. A handful of individual lines (embedded base64 images) are 30k–440k characters long — avoid `cat`/`Read`-ing the whole file at once or grepping without a length filter; e.g. `awk 'length<300'` on a range is a good way to inspect structure without dumping image data into context.
- When adding a product image, prefer linking an external URL (as most `PRODS`/`CATS` entries do) over inlining another base64 blob, to keep the file size manageable — but follow the existing pattern (`LIQUIDOS_IMGS`) if inlining is truly needed for offline/local images.

## Page architecture

Everything is client-side, in-memory, and re-rendered via direct DOM manipulation (no framework, no virtual DOM, no persistence — the cart resets on page reload).

**Sections** (each a `<section id="...">`, navigable via the sticky quick-nav and `sc(id)` smooth-scroll helper): `hero`, `catalogo`, `local`, `obras` (obras sociales / insurance), `resenas`, `nosotros`, `contacto`.

**Catalog / cart data model** (all defined as JS consts near the top of the script):
- `CATS` — the 5 top-level catalog categories (receta, sol, contacto, liquidos, accesorios) shown as cards.
- `PRODS` — flat list of simple products (frames, sunglasses, accessories), each with `id`, `cat`, `price`, `img`.
- `LENTES_BRANDS` — contact lens brands, each containing a nested `productos` list (used for the "Lentes de Contacto" category, which has a brand → product drill-down instead of a flat grid).
- `LIQUIDOS_BRANDS` — contact lens solution brands, same nested shape, images resolved via the `LIQUIDOS_IMGS` base64 map.
- `selCat` / `cart` — the only real mutable state. `cart` is an array of `{id, nm, price, qty, ...}`.

**Render flow**: selecting a category (`selectCat`) calls the matching renderer (`renderProds`, `renderLentesContacto`, `renderLiquidos`), which injects HTML via template literals into `#cat-grid` / `#prod-area` / `#pgrid`. Adding an item (`addCart` / `addLenteCart` / `addLiqCart`) pushes into `cart`, then `updateBadge()` + `renderDrawer()` re-render the cart badge and slide-out drawer from scratch — there's no diffing, just full re-renders of the relevant container.

**Checkout flow** is a 4-step modal (`ck-overlay`) driven by `ckStep` (0=datos, 1=envío, 2=pago, 3=confirmación): `openCheckout` → `ckNext(from)` validates the current panel's required fields, advances `ckStep`, and calls `showPanel(n)`. On the payment step (`pay-opt` buttons: efectivo/transferencia/mercadopago/debito/credito), `efectivo` still builds a WhatsApp message via `buildConfirmation()` + `sendPedidoWa()` and advances to the confirmation panel, exactly as before. Every other option calls `iniciarPagoMercadoPago()`, which `fetch`es `/api/crear-preferencia` and does a full-page redirect (`window.location.href`) to the returned Mercado Pago `init_point` — the confirmation panel is never shown for these, since the browser navigates away to Mercado Pago's hosted Checkout Pro page and later lands on `gracias.html`.

**Everything non-payment funnels to WhatsApp**: there's no backend for orders placed in cash. The "obras sociales" (health insurance) coverage form (`submitOS`) and the general contact CTA (`openWa`) still end by opening a `wa.me/541140901495?text=...` deep link with a pre-filled message.

**Other notable behaviors**:
- Scroll-triggered reveal animations use a single shared `IntersectionObserver` (`ro`) applied to all `.rv` elements.
- The obras sociales form supports attaching a photo of the insurance card (`showCredPreview`), previewed client-side via `FileReader`; nothing is uploaded anywhere, it's only shown in-page before the WhatsApp handoff.
- Prices are formatted with `toLocaleString('es-AR')` throughout — keep this when touching any price-rendering code.
- **The public catalog (`CATS`/`PRODS`/`LENTES_BRANDS`/`LIQUIDOS_BRANDS`) is not connected to Supabase.** It's still 100% hardcoded JS in `index.html`. Products added/edited via the admin panel (`admin/`, which manages Supabase's `productos` table) do not appear on the storefront — those are two separate, currently-unlinked catalogs.

## Admin panel (`admin/index.html`)

Self-contained single file (same pattern as `index.html`), served at `/admin`. Login-gated with Supabase Auth (email+password, no signup screen — admin users are created manually in the Supabase dashboard). Once logged in it has two tabs:
- **Productos**: CRUD over Supabase's `productos` table, including photo upload to the `productos-fotos` Storage bucket.
- **Estadísticas**: read-only aggregates computed client-side from the `pedidos` table (revenue, order counts by `estado`, average ticket, best-sellers ranked from the `productos` jsonb column on each pedido).

The Supabase anon key is embedded in this file by design — real write protection comes from Supabase RLS (`productos` restricts insert/update/delete to `authenticated`), not from the login screen. See `supabase/*.sql` for the RLS/storage policies this depends on.

## Mercado Pago integration (`api/`)

Two Vercel serverless functions back the real payment flow (see `mercadopago npm` SDK v2):
- **`api/crear-preferencia.js`**: takes the cart + buyer info from the checkout modal, creates a Mercado Pago Checkout Pro preference (using `MP_ACCESS_TOKEN`), and returns `init_point` for the frontend to redirect to. The cart snapshot (`productos`, `cliente_nombre`, `cliente_telefono`, `metodo_pago`) travels in the preference's `metadata` so the webhook can read it back later without any shared state between the two functions. There is no server-side price catalog to validate against (the storefront's catalog is hardcoded JS, not in Supabase), so this function trusts the prices the client sends — a known, accepted limitation.
- **`api/webhook-pago.js`**: Mercado Pago's notification endpoint. Never trusts the webhook payload's status — always re-fetches the payment from `GET /v1/payments/{id}` with `MP_ACCESS_TOKEN` before acting. Only `approved` payments get inserted into Supabase's `pedidos` table (via the `service_role` key, which bypasses RLS — never expose this key client-side), and only once per `mp_payment_id` (deduped against a unique column added by `supabase/pedidos_mp_payment_id.sql`, since Mercado Pago can and does redeliver the same notification).

`gracias.html` is the plain post-payment landing page all three `back_urls` (success/failure/pending) point to; it reads Mercado Pago's own `collection_status`/`payment_id` query params to decide what message to show, and does not itself call Supabase or Mercado Pago — the webhook is what actually confirms and records the order server-to-server.
