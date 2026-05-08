---
name: github-pr-release
description: Project-specific GitHub PR workflow for Super Agent Console. Use when Codex is asked to create a pull request from any development branch to `release`, review PR readiness, merge a PR, or validate the release workflow, especially when changes should trigger GitHub Actions Docker build, GHCR push, and K3S rollout.
---

# GitHub PR Release

## Overview

Use this skill to move project changes from the current development branch into `release` through a controlled PR flow. The release branch triggers `.github/workflows/release-docker-k3s.yml`, which builds a Docker image, pushes it to GHCR, and updates the K3S Deployment.

## Branch Model

- Development branch: the current non-`release` branch unless the user names a specific branch.
- Release branch: `release`
- Main branch: keep as project baseline unless the user explicitly asks to use it.

## Before Creating A PR

1. Check the working tree with `git status --short`.
2. Resolve the source branch:
   - Use the current branch by default.
   - Use the user-provided branch if they name one.
   - Do not use `release` as the source branch.
3. Run the lightweight checks relevant to the change:
   - `bash -n scripts/build-and-push-ghcr.sh` when deployment scripts change.
   - Parse `.github/workflows/release-docker-k3s.yml` as YAML when workflow changes.
   - `npm run build` when frontend, Nuxt config, server API, or Docker build inputs change.
4. Ensure no secrets are committed:
   - No GitHub token.
   - No SSH private key.
   - No `.env`.
   - No K3S kubeconfig.
5. Update `timeline.md` only for project-related changes. Do not record Git push failures, auth checks, or network retries.

## Create PR

Use GitHub CLI when available:

```bash
SOURCE_BRANCH="${SOURCE_BRANCH:-$(git branch --show-current)}"
test "$SOURCE_BRANCH" != "release"

gh pr create \
  --base release \
  --head "$SOURCE_BRANCH" \
  --title "ci(release): automate ghcr k3s deployment" \
  --body "Summary:
- Update release CI/CD workflow
- Build and push Docker image to GHCR
- Roll out image to K3S deployment

Validation:
- bash -n scripts/build-and-push-ghcr.sh
- workflow YAML parse
- npm run build"
```

If `gh` is unavailable or auth fails, provide the user with the GitHub compare URL:

```txt
https://github.com/DuanHejin/super-agent-console/compare/release...<source-branch>
```

## Review PR Readiness

Review in this order:

1. Confirm PR base is `release` and head is the intended development branch.
2. Check changed files for CI/CD risk:
   - `.github/workflows/release-docker-k3s.yml`
   - `scripts/build-and-push-ghcr.sh`
   - `Dockerfile`
   - `docs/deploy-ghcr-k3s.md`
3. Verify required GitHub Secrets are documented or configured:
   - `GHCR_TOKEN`
   - `K3S_SSH_HOST`
   - `K3S_SSH_PORT`
   - `K3S_SSH_USER`
   - `K3S_SSH_PRIVATE_KEY`
4. Confirm deployment defaults match the server:
   - namespace: `default`
   - deployment: `my-web-app`
   - container: `my-web-app`
   - service: `my-web-svc`
   - container port: `3000`
5. Do not approve or merge if checks fail, if secrets appear in the diff, or if the release target is wrong.

## Merge PR

Only merge when the user explicitly asks to merge or when the user has clearly authorized the merge in the current task.

Before merge:

1. Check PR status:
   ```bash
   gh pr checks <PR_NUMBER>
   gh pr view <PR_NUMBER> --json mergeStateStatus,reviewDecision
   ```
2. Prefer squash merge unless the user asks otherwise:
   ```bash
   gh pr merge <PR_NUMBER> --squash --delete-branch=false
   ```
3. Keep the source branch if the user wants it as a long-lived branch.

After merge:

1. Watch the release workflow:
   ```bash
   gh run list --branch release --limit 5
   gh run watch <RUN_ID>
   ```
2. If the workflow fails, summarize the failing job and log lines. Do not retry repeatedly without a concrete fix.

## K3S Release Expectations

Successful release should:

- Build a new GHCR image tag with auto-incremented semver.
- Push both the versioned tag and `latest`.
- SSH into the K3S server.
- Patch Deployment container port to `3000` when needed.
- Patch Service targetPort on `my-web-svc` to `3000` when needed.
- Update `deployment/my-web-app` container `my-web-app` to the versioned image.
- Complete `kubectl rollout status`.

## Safety Rules

- Do not commit or print tokens, private keys, kubeconfigs, or `.env` contents.
- Do not merge directly to `release` without user authorization.
- Do not force-push unless the user explicitly asks.
- Do not record push/auth/network failures in `timeline.md`.
