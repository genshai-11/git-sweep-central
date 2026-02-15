import chalk from "chalk";
import { clearTokens } from "../config.js";

export async function logoutCommand() {
  clearTokens();
  console.log(chalk.green("✓ Logged out successfully"));
}
