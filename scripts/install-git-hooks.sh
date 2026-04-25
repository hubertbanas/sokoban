#!/usr/bin/env sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
REPO_ROOT="$(CDPATH= cd -- "${SCRIPT_DIR}/.." && pwd -P)"

cd "$REPO_ROOT"

if [ ! -f ".githooks/pre-commit" ]; then
  echo "Missing required hook: .githooks/pre-commit" >&2
  exit 1
fi

chmod +x .githooks/pre-commit

if command -v git >/dev/null 2>&1; then
  git config core.hooksPath .githooks
  echo "Installed repository hooks path: .githooks"
  echo "Pre-commit secret guard is now active."
  exit 0
fi

hooks_dir=""
if [ -d ".git/hooks" ]; then
  hooks_dir=".git/hooks"
elif [ -f ".git" ]; then
  git_dir_ref="$(sed -n 's/^gitdir: //p' .git | head -n 1)"
  if [ -n "$git_dir_ref" ]; then
    case "$git_dir_ref" in
      /*) git_dir="$git_dir_ref" ;;
      *) git_dir="$REPO_ROOT/$git_dir_ref" ;;
    esac
    if [ -d "$git_dir/hooks" ]; then
      hooks_dir="$git_dir/hooks"
    fi
  fi
fi

if [ -z "$hooks_dir" ]; then
  echo "git binary not found and hooks directory is unavailable." >&2
  echo "Run this command on the host (where git is installed) to finish hook setup." >&2
  exit 1
fi

mkdir -p "$hooks_dir"
cat > "$hooks_dir/pre-commit" <<EOF
#!/usr/bin/env sh
exec ./.githooks/pre-commit "\$@"
EOF
chmod +x "$hooks_dir/pre-commit"

echo "git binary not found; installed fallback hook shim at $hooks_dir/pre-commit"
echo "Pre-commit secret guard is now active."
