import chalk from "chalk";
import ora from "ora";
import { execSync } from "node:child_process";

export async function cloneCommand(repo, options) {
  const spinner = ora(`Cloning ${repo}...`).start();

  // TODO: Fetch remote_url from dashboard API, then clone
  spinner.info(
    chalk.yellow("Clone from dashboard coming in next version.")
  );
  console.log(
    chalk.dim(`For now, use: git clone <remote-url> ${options.output || ""}`)
  );
}
