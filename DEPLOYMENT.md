# Deployment workflow — Peerless Connect frontend

How we ship changes from local development → **staging** (Vercel Preview) → **production** (Vercel Production).

| Branch | Vercel environment | URL |
|--------|-------------------|-----|
| `staging` | Preview | Staging domain or `*-git-staging-*.vercel.app` |
| `main` | Production | Production domain |
| `feature/*` | Preview (ephemeral) | Per-PR `*.vercel.app` URL |

**Repo:** `emateipeerless/PeerlessConnectV4`  
**App directory:** repository root (this project)

---

## One-time setup (each developer)

```bash
git clone https://github.com/emateipeerless/PeerlessConnectV4.git
cd PeerlessConnectV4
cp .env.example .env          # if .env.example exists; otherwise copy from team secrets
npm install
```

Local dev:

```bash
npm run dev                     # http://localhost:5178
```

---

## Standard release (feature → staging → production)

### Step 1 — Start from latest staging

```bash
git fetch origin
git checkout staging
git pull origin staging
```

### Step 2 — Create a feature branch

```bash
git checkout -b feature/short-description
```

Examples: `feature/sso-error-message`, `feature/dashboard-offline-banner`

### Step 3 — Develop and commit locally

```bash
# edit files, then:
npm run build                   # optional but recommended before push
git add .
git commit -m "Describe the change clearly"
```

### Step 4 — Push and open PR into staging

```bash
git push -u origin feature/short-description
```

On **GitHub**:

1. Open **Pull request** → base: **`staging`** ← compare: `feature/short-description`
2. Wait for **Vercel** check (Preview deployment URL in PR comments)
3. Review the preview URL; test login, SSO, devices as needed
4. **Merge** the PR (branch rules may require approval)

Merging to `staging` triggers a **Preview** deployment on the `staging` branch.

### Step 5 — QA on staging

Open your staging URL (custom domain or Vercel `git-staging` URL).

Verify:

- [ ] Standard login
- [ ] Microsoft SSO (if enabled)
- [ ] Folder sidebar / device dashboard
- [ ] Admin user creation (standard + SSO) if touched

### Step 6 — Promote staging to production

```bash
git fetch origin
git checkout staging
git pull origin staging
```

On **GitHub**:

1. Open **Pull request** → base: **`main`** ← compare: **`staging`**
2. Title example: `Release: <summary of changes>`
3. Review diff; confirm only intended changes
4. **Merge** the PR

Merging to `main` triggers a **Production** deployment.

### Step 7 — Production smoke test

After Vercel shows Production **Ready**:

- [ ] Open production domain
- [ ] Sign in (password + SSO)
- [ ] Open one device; confirm live data loads

---

## Quick command reference

```bash
# Where am I?
git status
git branch

# Sync before starting work
git fetch origin
git checkout staging && git pull origin staging

# New feature
git checkout -b feature/my-change

# Push feature branch
git push -u origin feature/my-change

# After PR merged on GitHub — update local branches
git checkout staging && git pull origin staging
git checkout main && git pull origin main
```

---

## Hotfix (urgent production fix)

Skip staging only for true emergencies; prefer staging when possible.

```bash
git fetch origin
git checkout main
git pull origin main
git checkout -b hotfix/short-description

# fix, commit
git add .
git commit -m "Hotfix: describe fix"
git push -u origin hotfix/short-description
```

1. PR **`hotfix/*` → `main`** — merge after review → Production deploys  
2. **Backport to staging** so branches do not diverge:

```bash
git checkout staging
git pull origin staging
git merge origin/main
git push origin staging
```

Or open PR **`main` → `staging`** on GitHub.

---

## Changing environment variables (Vercel)

`VITE_*` variables are embedded at **build time**. Changing them in Vercel does not affect live sites until redeploy.

1. **Vercel** → Project → **Settings** → **Environment Variables**
2. Edit **Production** and/or **Preview** values
3. Redeploy:
   - **Production:** Deployments → latest `main` → **⋯** → **Redeploy**
   - **Staging:** push any commit to `staging`, or Redeploy latest `staging` deployment

Update **Microsoft Entra** redirect URIs whenever production or staging domains change.

---

## Rollback production

**Option A — Revert on GitHub (preferred)**

```bash
git checkout main
git pull origin main
git log --oneline -5          # find bad commit
git revert <commit-sha>       # creates a new undo commit
git push origin main
```

**Option B — Vercel instant rollback**

1. **Deployments** → find last known-good **Production** deployment  
2. **⋯** → **Promote to Production**

Then fix forward on `staging` and merge to `main` when ready.

---

## What not to do

| Avoid | Why |
|-------|-----|
| `git push --force` to `main` or `staging` | Breaks team history; bypasses protection |
| Direct commits to `main` | Skips staging QA; blocked by branch rules |
| Commit `.env` | Secrets and URLs belong in Vercel + local only |
| Point Preview env vars at Production APIs long-term | Staging tests can affect real users/data |
| Merge `main` → `feature` without need | Creates messy history; pull `staging` instead |

---

## Branch rules (GitHub) — expected setup

| Branch | Rule |
|--------|------|
| `main` | PR required; no direct push |
| `staging` | PR required from feature branches (recommended) |

---

## Vercel checklist when something does not deploy

1. **Deployments** → filter **Preview** or **All** (not only Production)
2. Confirm push reached GitHub: `git log origin/staging -1`
3. New commit on branch (empty commit is fine for staging)
4. **Settings → Git** → Preview deployments enabled
5. **Settings → General** → Root Directory correct for repo layout

---

## AWS / backend note

Frontend deploys are independent of Lambda deploys. If you change `Lambdas/` code, deploy those to API Gateway separately. Keep **Production** and **Staging** API stages aligned with Vercel **Production** and **Preview** env vars.
