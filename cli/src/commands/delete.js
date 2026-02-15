import chalk from "chalk";
import inquirer from "inquirer";
import ora from "ora";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";

export async function deleteCommand(repo, options) {
  const repoPath = resolve(repo);

  if (!options.force) {
    const { confirm } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: chalk.yellow(
          `Delete local directory "${repoPath}"? (remote will be kept)`
        ),
        default: false,
      },
    ]);

    if (!confirm) {
      console.log(chalk.dim("Cancelled."));
      return;
    }
  }

  const spinner = ora(`Deleting ${repoPath}...`).start();

  try {
    await rm(repoPath, { recursive: true, force: true });
    spinner.succeed(chalk.green(`Deleted ${repoPath}`));
  } catch (err) {
    spinner.fail(chalk.red(`Failed: ${err.message}`));
    process.exit(1);
  }
}
