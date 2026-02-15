# git-sweepher CLI

Command-line tool for Git-Sweepher — scan, sync and manage your git repositories.

## Installation

```bash
# Install globally
npm install -g git-sweepher

# Or run directly with npx
npx git-sweepher
```

## Quick Start

```bash
# 1. Login with your dashboard credentials
git-sweepher login

# 2. Scan your projects directory
git-sweepher scan ~/Projects

# 3. Check status
git-sweepher status
```

## Commands

| Command | Description |
|---------|-------------|
| `login` | Login with email/password |
| `logout` | Clear saved credentials |
| `status` | Show auth status |
| `scan [path]` | Scan for git repos and sync to dashboard |
| `push <repo>` | Push repo to remote |
| `delete <repo>` | Delete local repo directory |
| `star <repo>` | Star a repository |
| `clone <repo>` | Clone from synced list |

## Development

```bash
cd cli
npm install
node bin/cli.js --help
```

## How it works

1. **Login** authenticates against the web dashboard's auth system
2. **Scan** walks directories to find `.git` folders, collects metadata (name, remote URL, sync status, size)
3. Sends data to the `/functions/v1/cli-sync` edge function
4. Dashboard displays results in real-time
