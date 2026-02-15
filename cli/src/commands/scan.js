import chalk from "chalk";
import ora from "ora";
import { resolve } from "node:path";
import { findGitRepos } from "../scanner.js";
import { apiRequest } from "../api.js";

export async function scanCommand(path, options) {
  const targetPath = resolve(path || ".");
  const maxDepth = parseInt(options.maxDepth) || 5;

  console.log(chalk.bold(`\n📂 Scanning: ${targetPath}`));
  console.log(chalk.dim(`   Max depth: ${maxDepth}\n`));

  const scanSpinner = ora("Finding git repositories...").start();

  try {
    const repos = await findGitRepos(targetPath, maxDepth);

    if (repos.length === 0) {
      scanSpinner.warn("No git repositories found.");
      return;
    }

    scanSpinner.succeed(`Found ${chalk.bold(repos.length)} repositories`);

    // Display found repos
    console.log("");
    for (const repo of repos) {
      const statusColor =
        repo.sync_status === "synced"
          ? chalk.green
          : repo.sync_status === "dirty"
            ? chalk.yellow
            : chalk.gray;

      console.log(
        `  ${statusColor("●")} ${chalk.bold(repo.name)} ${chalk.dim(repo.local_path)}`
      );
      if (repo.remote_url) {
        console.log(`    ${chalk.dim(repo.remote_url)}`);
      }
    }

    // Sync to dashboard
    console.log("");
    const syncSpinner = ora("Syncing to dashboard...").start();

    const result = await apiRequest("cli-sync", { repositories: repos });

    if (result.errors?.length) {
      syncSpinner.warn(
        `Synced ${result.upserted}/${result.total} repos (${result.errors.length} errors)`
      );
      for (const err of result.errors) {
        console.log(chalk.red(`  ✗ ${err}`));
      }
    } else {
      syncSpinner.succeed(
        chalk.green(`Synced ${result.upserted}/${result.total} repositories to dashboard`)
      );
    }
  } catch (err) {
    scanSpinner.fail(chalk.red(err.message));
    process.exit(1);
  }
}
