# Deployment Guide — stratAI Web

Push to GitHub → auto-deploy on DigitalOcean App Platform as a static site.
Zero-maintenance. HTTPS included. Deploys on every push.

---

## Prerequisites

Before you start, make sure you have:

- **Git** installed (`git --version`)
- **Node.js 18+** (`node --version`)
- **pnpm** installed (`npm install -g pnpm`, then `pnpm --version`)
- A **GitHub** account
- A **DigitalOcean** account (free trial works fine)

---

## Part 1: Push to GitHub

### 1.1 Create the repository on GitHub

1. Go to [github.com/new](https://github.com/new)
2. Repository name: **stratAI**
3. Owner: **AlchemicFlare**
4. Set to **Public** (or Private — your choice)
5. Do **NOT** initialize with README, .gitignore, or license (you already have these)
6. Click **Create repository**

GitHub will show you a page with push instructions. Keep it open.

### 1.2 Initialize and push from your local machine

Open a terminal in the **project root** (the folder containing `package.json`):

```bash
# Navigate to the project
cd /path/to/stratai-web

# Initialize git
git init

# Add all files
git add .

# Verify what is staged (node_modules should NOT be listed)
git status

# Commit
git commit -m "feat: stratAI web application — AI-powered drill core annotation"

# Set the default branch to main
git branch -M main

# Add your remote (use your actual repository URL)
git remote add origin https://github.com/AlchemicFlare/stratAI.git

# Push
git push -u origin main
```

If you are using SSH instead of HTTPS for GitHub authentication:

```bash
git remote add origin git@github.com:AlchemicFlare/stratAI.git
```

### 1.3 Verify

Visit `https://github.com/AlchemicFlare/stratAI` — you should see all your files, the README rendered, and your initial commit.

### Troubleshooting: GitHub authentication

If `git push` asks for a password, GitHub no longer accepts passwords over HTTPS. You need a **Personal Access Token (PAT)**:

1. Go to **GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)**
2. Click **Generate new token (classic)**
3. Give it a name like `stratAI-deploy`
4. Select scope: **repo** (full access to private repos)
5. Click **Generate token** and **copy** it immediately
6. When git asks for your password, paste the **token** (not your GitHub password)

Alternatively, set up SSH keys:

```bash
ssh-keygen -t ed25519 -C "your-email@example.com"
cat ~/.ssh/id_ed25519.pub
# Copy the output → GitHub → Settings → SSH Keys → New SSH Key → paste → save
```

---

## Part 2: Deploy on DigitalOcean App Platform

### 2.1 Create the app

1. Log in to [cloud.digitalocean.com](https://cloud.digitalocean.com)
2. Go to **Apps** in the left sidebar (or navigate to `cloud.digitalocean.com/apps`)
3. Click **Create App**
4. Choose **GitHub** as the source
5. If this is your first time, click **Connect GitHub Account** and authorize DigitalOcean
6. Select repository: **AlchemicFlare/stratAI**
7. Branch: **main**
8. Check **Autodeploy** (should be on by default)
9. Click **Next**

### 2.2 Configure the build

DigitalOcean will auto-detect a Node.js project. Change the resource type to **Static Site**:

1. Click on the detected component (it may say "Web Service" — change it)
2. Set **Type** to: **Static Site**
3. Set these values:

| Setting              | Value              |
|----------------------|--------------------|
| **Build Command**    | `npm run build`    |
| **Output Directory** | `dist`             |

> **Note:** Even though the project uses pnpm locally, DigitalOcean will auto-detect the `pnpm-lock.yaml` and install dependencies with pnpm. The `npm run build` command still works because it just invokes the `build` script from package.json regardless of package manager. If you run into any issues, you can change the build command to `pnpm install && pnpm run build`.

4. Click **Next**

### 2.3 Environment variables (optional)

For this static site, you do not need any environment variables. Click **Next**.

### 2.4 Pick your plan

1. Select **Starter** plan (static sites are included in the free tier — $0/month for static sites)
2. Region: pick whichever is closest to your users (e.g., **Frankfurt** for DACH market)
3. Click **Next**

### 2.5 Review and deploy

1. Review all settings
2. App name will be auto-generated — you can change it to `stratai` for a cleaner URL
3. Click **Create Resources**

DigitalOcean will now:
- Clone your repo
- Install dependencies (auto-detects pnpm)
- Run `npm run build` (which runs `tsc -b && vite build`)
- Serve the `dist/` folder
- Provision HTTPS automatically

First deploy takes 2–4 minutes. You will see a live build log.

### 2.6 Your live URL

Once deployed, you will get a URL like:

```
https://stratai-xxxxx.ondigitalocean.app
```

This is your live site. HTTPS is already active and managed by DigitalOcean.

---

## Part 3: Custom Domain (Optional)

If you want `app.stratai.io` or similar:

1. In your App settings, go to **Settings → Domains**
2. Click **Add Domain**
3. Enter your domain: `app.stratai.io`
4. DigitalOcean will show you a CNAME record to add
5. Go to your DNS provider and add:

```
Type:  CNAME
Name:  app
Value: stratai-xxxxx.ondigitalocean.app.
TTL:   300
```

6. Wait for DNS propagation (5 min to 24 hours)
7. DigitalOcean auto-provisions a Let's Encrypt SSL certificate

For an apex domain (`stratai.io` without subdomain), you will need to use DigitalOcean's DNS service or a provider that supports ALIAS/ANAME records.

---

## Part 4: What Happens on Every Push

Once set up, the workflow is completely hands-off:

```
You push to main → GitHub notifies DigitalOcean → Build triggers → Site updates
```

The full cycle from push to live takes about 90–120 seconds.

### How it works

1. You run `git push origin main`
2. DigitalOcean receives a webhook from GitHub
3. It pulls the latest code
4. Runs the build command
5. Deploys the new `dist/` output
6. Zero-downtime swap (old version serves until new is ready)

You never need to touch DigitalOcean again unless you want to change settings.

---

## Daily Workflow

```bash
# Make changes to your code
# ...

# Stage, commit, push
git add .
git commit -m "feat: add hyperspectral overlay toggle"
git push

# Done. Site updates in ~2 minutes automatically.
```

For a more disciplined workflow with feature branches:

```bash
# Create a feature branch
git checkout -b feature/voice-commands

# Work on it...
git add .
git commit -m "feat: implement voice command parser"
git push -u origin feature/voice-commands

# Create a Pull Request on GitHub
# Merge PR into main → auto-deploys
```

---

## Build Verification

To verify the build works locally before pushing:

```bash
pnpm install
pnpm run build
pnpm run preview
```

This serves the production build at `http://localhost:4173`. If it works locally, it will work on DigitalOcean.

---

## Cost

| Resource          | Cost        |
|-------------------|-------------|
| GitHub (public)   | Free        |
| GitHub (private)  | Free        |
| DO Static Site    | $0/month    |
| DO Custom Domain  | $0 extra    |
| HTTPS Certificate | Included    |

Total: **$0/month** for a static site deployment.

If you later need a backend (API, database), DigitalOcean App Platform web services start at $5/month.

---

## Troubleshooting

### Build fails with "command not found: pnpm"

DigitalOcean should auto-detect pnpm from your lock file. If it does not:

1. Go to **App Settings → App Spec**
2. Set the build command to:

```
corepack enable && pnpm install && pnpm run build
```

### Build fails with TypeScript errors

Run locally first to catch errors:

```bash
npx tsc --noEmit
```

Fix any errors before pushing.

### Site shows blank page

Check that the **Output Directory** is set to `dist` (not `build`, not `public`).

### Old version still showing

Hard-refresh with `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac) to bypass the browser cache.

### Deploy is stuck

Go to **Apps → your app → Activity** tab to see the build log. Common issues:
- Dependency install timeout (retry usually fixes it)
- Node version mismatch (add `engines` field to package.json — already done)
