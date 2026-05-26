# lab.

One day. One app. No excuses.

→ [lab.simonsangla.com](https://lab.simonsangla.com)

## How to ship

1. Create `apps/YYYY-MM-DD-app-name.html`
2. Add meta tags to `<head>`:

   ```html
   <meta name="app-name" content="...">
   <meta name="app-description" content="...">
   <meta name="app-tags" content="tag1,tag2">
   ```

3. `git add apps/YYYY-MM-DD-app-name.html && git commit -m "feat: day N — name" && git push`
4. GitHub Action regenerates `index.html` → Vercel deploys → done.

## Local preview

```sh
npm run gen
open index.html
```

## By

[Simon Sangla](https://simonsangla.com) — Snowflake Analytics Consultant who ships.
