# Deploy to GitHub Pages

Repository target: `Fahri1989/natfiber-encyclopedia`

1. Upload the five prototype files to the repository root.
2. In GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select branch `main` and folder `/ (root)`.
5. Save.
6. Wait for the Pages deployment to finish.

The site uses the Supabase publishable key in `config.js`. That key is designed for browser use. Security is enforced by Supabase RLS; never replace it with a `service_role` or secret key.

Once GitHub App write access is enabled for the owner account `Fahri1989`, ChatGPT can maintain the repository directly.
