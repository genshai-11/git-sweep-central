import { readdir, stat, access } from "node:fs/promises";
import { join, basename, resolve } from "node:path";
import { execSync } from "node:child_process";

/**
 * Recursively find all git repositories under a given path
 */
export async function findGitRepos(rootPath, maxDepth = 5) {
  const repos = [];
  const absoluteRoot = resolve(rootPath);

  async function walk(dir, depth) {
    if (depth > maxDepth) return;

    try {
      const gitDir = join(dir, ".git");
      try {
        await access(gitDir);
        // Found a .git directory — collect repo info
        repos.push(await collectRepoInfo(dir));
        return; // Don't recurse into git repos
      } catch {
        // No .git here, keep looking
      }

      const entries = await readdir(dir, { withFileTypes: true });
      const promises = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
        promises.push(walk(join(dir, entry.name), depth + 1));
      }

      await Promise.all(promises);
    } catch {
      // Permission denied or other error — skip
    }
  }

  await walk(absoluteRoot, 0);
  return repos;
}

/**
 * Collect metadata for a single git repository
 */
async function collectRepoInfo(repoPath) {
  const name = basename(repoPath);
  let remoteUrl = "";
  let account = "";
  let syncStatus = "unknown";

  try {
    remoteUrl = execSync("git remote get-url origin", {
      cwd: repoPath,
      encoding: "utf-8",
      timeout: 5000,
    }).trim();

    // Extract account from remote URL
    // https://github.com/user/repo.git → github/user
    // git@github.com:user/repo.git → github/user
    const httpsMatch = remoteUrl.match(/https?:\/\/([^/]+)\/([^/]+)\//);
    const sshMatch = remoteUrl.match(/@([^:]+):([^/]+)\//);
    if (httpsMatch) {
      account = `${httpsMatch[1].replace(".com", "")}/${httpsMatch[2]}`;
    } else if (sshMatch) {
      account = `${sshMatch[1].replace(".com", "")}/${sshMatch[2]}`;
    }
  } catch {
    // No remote configured
  }

  try {
    const statusOutput = execSync("git status --porcelain", {
      cwd: repoPath,
      encoding: "utf-8",
      timeout: 5000,
    }).trim();

    if (statusOutput.length === 0) {
      // Check if behind remote
      try {
        execSync("git fetch --dry-run 2>&1", {
          cwd: repoPath,
          encoding: "utf-8",
          timeout: 10000,
        });
        syncStatus = "synced";
      } catch {
        syncStatus = "synced"; // Assume synced if fetch fails (offline)
      }
    } else {
      syncStatus = "dirty";
    }
  } catch {
    syncStatus = "unknown";
  }

  // Get directory size (approximate)
  let sizeBytes = 0;
  try {
    const stats = await stat(repoPath);
    sizeBytes = stats.size; // This is just the directory entry size
    // For a better estimate, we count .git directory size
    try {
      const gitSize = execSync(
        process.platform === "win32"
          ? `powershell -command "(Get-ChildItem -Recurse '${join(repoPath, ".git")}' | Measure-Object -Property Length -Sum).Sum"`
          : `du -sb "${join(repoPath, ".git")}" | cut -f1`,
        { encoding: "utf-8", timeout: 10000 }
      ).trim();
      sizeBytes = parseInt(gitSize) || 0;
    } catch {
      // Fallback
    }
  } catch {
    // Skip
  }

  return {
    name,
    local_path: repoPath,
    remote_url: remoteUrl || null,
    account: account || null,
    sync_status: syncStatus,
    size_bytes: sizeBytes,
    exists_locally: true,
  };
}
