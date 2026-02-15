import chalk from "chalk";
import ora from "ora";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

export async function pushCommand(repo) {
  const repoPath = resolve(repo);
  const spinner = ora(`Pushing ${repo}...`).start();

  try {
    const output = execSync("git push", {
      cwd: repoPath,
      encoding: "utf-8",
      timeout: 60000,
    });
    spinner.succeed(chalk.green(`Pushed ${repo} successfully`));
    if (output.trim()) console.log(chalk.dim(output.trim()));
  } catch (err) {
    spinner.fail(chalk.red(`Failed to push: ${err.message}`));
    process.exit(1);
  }
}
