import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { signIn } from "../api.js";
import { saveTokens, getEmail } from "../config.js";

export async function loginCommand() {
  const currentEmail = getEmail();
  if (currentEmail) {
    console.log(chalk.dim(`Currently logged in as ${currentEmail}`));
  }

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "email",
      message: "Email:",
      default: currentEmail || undefined,
      validate: (v) => (v.includes("@") ? true : "Enter a valid email"),
    },
    {
      type: "password",
      name: "password",
      message: "Password:",
      mask: "•",
      validate: (v) => (v.length >= 6 ? true : "Password must be at least 6 characters"),
    },
  ]);

  const spinner = ora("Logging in...").start();

  try {
    const { accessToken, refreshToken, email } = await signIn(
      answers.email,
      answers.password
    );
    saveTokens(accessToken, refreshToken, email);
    spinner.succeed(chalk.green(`Logged in as ${email}`));
  } catch (err) {
    spinner.fail(chalk.red(err.message));
    process.exit(1);
  }
}
