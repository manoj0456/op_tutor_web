# Deployment Guide — tutor.oppertunitypool.com

This app is a Next.js static export deployed to AWS S3 + CloudFront.

## Architecture

```
GitHub push to main
  → GitHub Actions (deploy.yml)
    → npm run build  →  out/
    → aws s3 sync out/ → s3://tutor-oppertunitypool-com  (us-east-2)
    → CloudFront invalidation  →  tutor.oppertunitypool.com
```

## Required GitHub Secrets

Set these in **Settings → Secrets and variables → Actions**:

| Secret | Value |
|--------|-------|
| `AWS_ACCESS_KEY_ID` | IAM user access key with S3 + CloudFront permissions |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret key |
| `ACM_CERTIFICATE_ARN` | ARN of a wildcard or exact ACM cert for `*.oppertunitypool.com` **in us-east-1** (CloudFront requires us-east-1) |
| `TUTOR_CLOUDFRONT_DISTRIBUTION_ID` | Distribution ID from step 3 below |

> **Note:** `ACM_CERTIFICATE_ARN` must be in **us-east-1** regardless of where your S3 bucket is. CloudFront only reads certs from us-east-1.  
> If TaskManager already has this secret as a wildcard cert, reuse the same ARN here.

## First-Time Setup

### Step 1 — Add secrets (except `TUTOR_CLOUDFRONT_DISTRIBUTION_ID`)

Add `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `ACM_CERTIFICATE_ARN` to GitHub secrets before running the infra workflow.

### Step 2 — Run `setup-infra.yml` once

In **Actions → Setup AWS Infrastructure (run once)** → **Run workflow**.

This will:
- Create S3 bucket `tutor-oppertunitypool-com` in `us-east-2`
- Configure it for static website hosting
- Verify the ACM certificate is valid
- Create a CloudFront distribution with HTTPS redirect

At the end of the run, the job log will print:
```
Distribution ID : E1XXXXXXXXXX
CloudFront Domain: dXXXXXXXXXXXXX.cloudfront.net
```

### Step 3 — Add the Distribution ID secret

Copy the `Distribution ID` from the setup job output and add it as:
```
TUTOR_CLOUDFRONT_DISTRIBUTION_ID = E1XXXXXXXXXX
```

### Step 4 — Add DNS record

In your DNS provider (or Route 53), add:

```
CNAME  tutor.oppertunitypool.com  →  dXXXXXXXXXXXXX.cloudfront.net
```

If using Route 53 with an Apex domain, use an **Alias A record** instead of CNAME.

### Step 5 — Push to main

Any push to `main` will now auto-build and deploy:
```bash
git push origin main
```

Wait ~10 minutes for CloudFront to propagate on first deploy.

## Ongoing Deploys

Every push to `main` triggers `deploy.yml`, which:
1. Builds the static export (`out/`)
2. Syncs to S3 (HTML files with `no-cache`, assets with 1-year immutable cache)
3. Invalidates the CloudFront cache so users see the new version immediately

## Local Build

```bash
npm install
npm run build
# Static output is in out/
```

## Notes

- S3 bucket: `tutor-oppertunitypool-com` in `us-east-2`
- CloudFront price class: `PriceClass_100` (US, Canada, Europe)
- 404 and 403 responses serve `/404.html` with HTTP 404
- `setup-infra.yml` is `workflow_dispatch` only — it never runs automatically
