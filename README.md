# Detaillo Auto Detailing Studio Billing Web App

This project is a Firebase Hosting + Firestore billing app for Detaillo Auto Detailing Studio. It is built with plain HTML, CSS, and JavaScript and is designed for easy invoice generation, GST-aware billing, printing, PDF export, and reporting.

Live app:
- https://detailloautodetailingstudio.web.app

## Features
- Create invoices and quotations for cars and bikes
- Capture customer name, mobile, optional GSTIN, vehicle details, delivery date, and payment mode
- Add services from the in-app rate card or custom line items
- Apply discount, GST, round-off, received amount, and balance calculations
- Print directly or export as PDF
- Share the bill through WhatsApp with a customer message
- View daily, monthly, and custom-date reports
- Export reports to Excel with summary and billing sheets

## Project structure
```
public/
  index.html
  css/styles.css
  js/app.js
  js/store.js
  js/seed.js
  js/config.js          # Firebase client config (do not commit real keys)
  img/
firebase.json
firestore.rules
firestore.indexes.json
.firebaserc
README.md
.gitignore
```

## Local setup
1. Create a Firebase project in the Firebase Console.
2. Enable Firebase Authentication using Email/Password.
3. Create a Firestore database.
4. Add your Firebase web SDK config to `public/js/config.js`.
5. Update `.firebaserc` with your project ID.
6. Add staff email addresses to `firestore.rules`.
7. Deploy:

```bash
npm install -g firebase-tools
firebase login
firebase deploy
```

## Important security note
Do not commit Firebase API keys or project secrets.
The app stores Firebase config in `public/js/config.js`, and that file is ignored by Git via `.gitignore`.

## Local development
- Open the app directly in a browser, or
- Run:

```bash
firebase emulators:start --only hosting
```

## Notes
- `public/js/config.js` contains client-side Firebase config only.
- The app is intended for staff-only use behind Firebase Authentication and Firestore rules.
- Invoice styling matches the studio quotation / tax-invoice pad format used by the business.
- GST and contact details should be updated in the studio settings screen or the seed data before publishing.
