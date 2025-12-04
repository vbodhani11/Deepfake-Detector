Dev-only: Skip login instructions

To enable skip-login behavior for local development (the app will behave as if a user is authenticated):

1. Create a `.env` file inside the `UI` folder (next to `package.json`).

2. Add the following variables:

VITE_SKIP_LOGIN=true
VITE_SKIP_LOGIN_TOKEN=dev-skip-token

3. Restart the Vite dev server (stop and start). The app's `AuthProvider` will place a mock token in localStorage and set a small dev user object.

Notes:
- This is strictly for local development. Do NOT enable in production.
- If you want a different mock token or email, change `VITE_SKIP_LOGIN_TOKEN` or edit `AuthContext.tsx`.
