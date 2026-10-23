# De-Boyz Foods

Groceries and hot Ghanaian meals, ordered online (guest checkout, pay on delivery or pay now with MTN MoMo, Telecel Cash or AirtelTigo Money).

**Stack:** React 18 + Vite + Tailwind + lucide-react · Express (ESM) · PostgreSQL (Neon) · JWT auth · Multer → Cloudinary · Resend · MTN MoMo API · Paystack (Telecel, AirtelTigo)

## Run locally

```bash
npm install
cp .env.example .env        # then fill in DATABASE_URL and JWT_SECRET at minimum
npm run db:schema           # creates the tables in Neon
npm run seed                # creates the admin user + starter grocery categories
npm run dev:all             # API on :4000, web on http://localhost:5173
```

Sign in at `/login` with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from your `.env`, then open `/admin`.

Without `RESEND_API_KEY`, verification and reset emails are printed in the API terminal.
Without Cloudinary keys, image upload returns a clear 503 and everything else still works.

## Folder map

```
client/                 React app (Vite root)
  src/api.js            every frontend -> backend call
  src/context/          Auth + Cart state
  src/pages/            Home, Groceries, Food, Cart (checkout), OrderDone, auth pages, admin/
  public/images/        drop groceries.jpg and food.jpg here for the home hero cards
server/
  index.js              Express app, serves client/dist in production
  config.js             env parsing
  db/                   db.js (pool), schema.sql, store.js (ALL SQL), seed.js, migrate.js
  routes/               auth, catalog, orders, payments, uploads
  middleware/           auth (JWT), upload (Multer), error
  services/             cloudinary, email (Resend), payments (router), mtnmomo (MTN, direct), gateway (Telecel + AirtelTigo via Paystack), momo (networks + number helpers)
render.yaml             one Render web service
```

## Deploy to Render

1. Push to GitHub, then in Render choose **New > Blueprint** and select the repo (it reads `render.yaml`).
2. Fill the `sync: false` env vars. Set `CLIENT_ORIGIN` to your Render URL (used in email links).
3. Run `npm run db:schema` and `npm run seed` once against your Neon database (locally is fine).
4. Health check: `/api/health`.

## Pay now with mobile money

The customer picks their network (MTN, Telecel or AirtelTigo) and enters their number. The prefix pre-selects a network, but the customer's choice wins because numbers can be ported between networks. Their phone gets a PIN prompt and the page polls until the provider confirms. `server/services/payments.js` routes each network to its provider.

### MTN MoMo (direct, no payment aggregator)

Calls MTN's MoMo Collections API ("Request to Pay") straight from the server.

- `MOMO_ENV=mock` (default locally): no MTN account needed. Auto-approves 8 seconds after the prompt so you can test the screens.
- `MOMO_ENV=sandbox`: sign up at momodeveloper.mtn.com, subscribe to **Collections**, put the Primary key in `MOMO_SUBSCRIPTION_KEY`, then run `npm run momo:sandbox` and paste the printed API user and key into `.env`. The sandbox sends no real prompts.
- `MOMO_ENV=production`: needs MTN Ghana to approve your business for live collections. They give you the production subscription key, API user and key. Set `MOMO_CALLBACK_URL` to `https://<your-app>.onrender.com/api/payments/momo/callback` (it must match what you register with MTN).

### Telecel Cash and AirtelTigo Money (via Paystack)

Telecel and AirtelTigo don't offer an open, self-serve collections API like MTN's, so these two go through Paystack's Charge API (`server/services/gateway.js`). MTN stays direct.

- Needs a Paystack account registered in Ghana. Put its secret key in `PAYSTACK_SECRET_KEY`. Use a `sk_test_...` key first, then switch to `sk_live_...`. Check Paystack's pricing page for the current mobile money fee.
- Without the key, the two networks appear as "Unavailable" at checkout and customers use MTN, cash or MoMo on delivery.
- **Telecel** asks for a voucher code: the customer dials `*110#` to generate it and enters it on the pay page, then the payment completes. **AirtelTigo** normally just sends an approval prompt. The pay page handles whichever step Paystack asks for (prompt or code) on either network.
- `MOMO_ENV=mock` simulates both networks with no keys (Telecel accepts any 4-8 digit code; payments auto-approve 8 seconds later).
- Payment status is confirmed by asking Paystack directly (`/transaction/verify`) while the customer's page polls. No webhook is required, and the amount and currency (GHS) must match the order.
- Run `npm run db:schema` once after updating. It adds the `payment_network` column (safe to re-run).

## Notes

- Prices are always re-read from the database at checkout; the client never sets them.
- A payment only counts as paid after the server asks the provider (MTN or Paystack) directly and the amount and currency match.
- Only one `.env` at the project root is used by both the API and Vite (`VITE_` vars).
