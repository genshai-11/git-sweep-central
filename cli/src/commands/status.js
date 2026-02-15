import chalk from "chalk";
import { getEmail, getAccessToken, getSupabaseUrl } from "../config.js";

export async function statusCommand() {
  const email = getEmail();
  const token = getAccessToken();

  console.log(chalk.bold("\n🔧 Git-Sweepher CLI Status\n"));

  if (email && token) {
    console.log(`  ${chalk.green("●")} Logged in as ${chalk.bold(email)}`);
  } else {
    console.log(`  ${chalk.red("●")} Not logged in`);
    console.log(chalk.dim("  Run: git-sweepher login"));
  }

  console.log(`  ${chalk.dim("API:")} ${getSupabaseUrl()}`);
  console.log("");
}
