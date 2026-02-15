#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { loginCommand } from "../src/commands/login.js";
import { scanCommand } from "../src/commands/scan.js";
import { pushCommand } from "../src/commands/push.js";
import { deleteCommand } from "../src/commands/delete.js";
import { starCommand } from "../src/commands/star.js";
import { cloneCommand } from "../src/commands/clone.js";
import { statusCommand } from "../src/commands/status.js";
import { logoutCommand } from "../src/commands/logout.js";

const program = new Command();

program
  .name("git-sweepher")
  .description("Scan, sync and manage your git repositories from the terminal")
  .version("1.0.0");

program
  .command("login")
  .description("Login with your Git-Sweepher dashboard credentials")
  .action(loginCommand);

program
  .command("logout")
  .description("Clear saved credentials")
  .action(logoutCommand);

program
  .command("status")
  .description("Show current auth status and config")
  .action(statusCommand);

program
  .command("scan")
  .description("Scan directories for git repositories and sync to dashboard")
  .argument("[path]", "Directory to scan", ".")
  .option("-r, --recursive", "Scan subdirectories recursively", true)
  .option("-d, --max-depth <n>", "Max depth for recursive scan", "5")
  .action(scanCommand);

program
  .command("push")
  .description("Push a repository to its remote")
  .argument("<repo>", "Repository name or path")
  .action(pushCommand);

program
  .command("delete")
  .description("Delete local repository (keeps remote)")
  .argument("<repo>", "Repository name or path")
  .option("-f, --force", "Skip confirmation prompt")
  .action(deleteCommand);

program
  .command("star")
  .description("Star/unstar a repository")
  .argument("<repo>", "Repository name")
  .option("-u, --unstar", "Remove star")
  .action(starCommand);

program
  .command("clone")
  .description("Clone a repository from your synced list")
  .argument("<repo>", "Repository name")
  .option("-o, --output <dir>", "Output directory")
  .action(cloneCommand);

program.parse();
