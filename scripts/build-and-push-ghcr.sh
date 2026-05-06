#!/usr/bin/env bash
set -euo pipefail

IMAGE_REGISTRY="${IMAGE_REGISTRY:-ghcr.io}"
IMAGE_OWNER="${IMAGE_OWNER:-duanhejin}"
IMAGE_NAME="${IMAGE_NAME:-super-agent-console}"
IMAGE_PLATFORM="${IMAGE_PLATFORM:-linux/amd64}"
GITHUB_USERNAME="${GITHUB_USERNAME:-DuanHejin}"

REMOTE_IMAGE="${IMAGE_REGISTRY}/${IMAGE_OWNER}/${IMAGE_NAME}"

read_package_version() {
  node -p "require('./package.json').version"
}

increment_version() {
  local version="$1"
  local major minor patch

  IFS='.' read -r major minor patch <<<"${version}"

  if [[ ! "${major}" =~ ^[0-9]+$ || ! "${minor}" =~ ^[0-9]+$ || ! "${patch}" =~ ^[0-9]+$ ]]; then
    echo "Invalid semver version: ${version}" >&2
    exit 1
  fi

  if (( patch >= 99 )); then
    minor=$((minor + 1))
    patch=0
  else
    patch=$((patch + 1))
  fi

  printf '%s.%s.%s\n' "${major}" "${minor}" "${patch}"
}

resolve_latest_remote_version() {
  local token="$1"
  local tags_url

  tags_url="https://api.github.com/users/${GITHUB_USERNAME}/packages/container/${IMAGE_NAME}/versions?per_page=100"

  curl -fsSL \
    -H "Authorization: Bearer ${token}" \
    -H "Accept: application/vnd.github+json" \
    "${tags_url}" |
    node -e "
      let input = '';
      process.stdin.on('data', chunk => input += chunk);
      process.stdin.on('end', () => {
        const versions = JSON.parse(input);
        const tags = versions
          .flatMap(version => version.metadata?.container?.tags || [])
          .filter(tag => /^\\d+\\.\\d+\\.\\d+$/.test(tag))
          .sort((a, b) => {
            const av = a.split('.').map(Number);
            const bv = b.split('.').map(Number);
            return av[0] - bv[0] || av[1] - bv[1] || av[2] - bv[2];
          });

        if (tags.length > 0) {
          process.stdout.write(tags[tags.length - 1]);
        }
      });
    "
}

if ! command -v docker >/dev/null 2>&1; then
  echo "docker command not found. Install Docker CLI and start a Docker daemon first." >&2
  exit 1
fi

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "GITHUB_TOKEN is required. Export a GitHub token with write:packages before running." >&2
  exit 1
fi

if [[ -z "${IMAGE_TAG:-}" ]]; then
  echo "Resolving next image tag..."
  latest_remote_version="$(resolve_latest_remote_version "${GITHUB_TOKEN}" || true)"

  if [[ -n "${latest_remote_version}" ]]; then
    IMAGE_TAG="$(increment_version "${latest_remote_version}")"
    echo "Latest remote semver tag: ${latest_remote_version}"
  else
    base_version="$(read_package_version)"
    IMAGE_TAG="$(increment_version "${base_version}")"
    echo "No remote semver tag found. Base package version: ${base_version}"
  fi
else
  echo "Using explicit IMAGE_TAG=${IMAGE_TAG}"
fi

echo "Resolved image tag: ${IMAGE_TAG}"

echo "Logging in to ${IMAGE_REGISTRY} as ${GITHUB_USERNAME}..."
printf '%s' "${GITHUB_TOKEN}" | docker login "${IMAGE_REGISTRY}" -u "${GITHUB_USERNAME}" --password-stdin

echo "Building ${REMOTE_IMAGE}:${IMAGE_TAG} for ${IMAGE_PLATFORM}..."
docker build \
  --platform "${IMAGE_PLATFORM}" \
  -t "${IMAGE_NAME}:${IMAGE_TAG}" \
  -t "${IMAGE_NAME}:latest" \
  .

echo "Tagging image..."
docker tag "${IMAGE_NAME}:${IMAGE_TAG}" "${REMOTE_IMAGE}:${IMAGE_TAG}"
docker tag "${IMAGE_NAME}:${IMAGE_TAG}" "${REMOTE_IMAGE}:latest"

echo "Pushing ${REMOTE_IMAGE}:${IMAGE_TAG}..."
docker push "${REMOTE_IMAGE}:${IMAGE_TAG}"

echo "Pushing ${REMOTE_IMAGE}:latest..."
docker push "${REMOTE_IMAGE}:latest"

cat <<EOF

Done.

Pushed:
  ${REMOTE_IMAGE}:${IMAGE_TAG}
  ${REMOTE_IMAGE}:latest

K3S update example:
  kubectl set image deployment/my-web-app my-web-app=${REMOTE_IMAGE}:${IMAGE_TAG} -n default

EOF
