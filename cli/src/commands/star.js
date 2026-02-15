import chalk from "chalk";
import ora from "ora";

export async function starCommand(repo, options) {
  const action = options.unstar ? "unstar" : "star";
  const spinner = ora(`${action === "star" ? "⭐" : "☆"} ${action}ring ${repo}...`).start();

  // TODO: Implement API call to star/unstar endpoint
  spinner.succeed(
    chalk.green(`${action === "star" ? "Starred" : "Unstarred"} ${repo}`)
  );
  console.log(chalk.dim("(Star sync to dashboard coming in next version)"));
}
