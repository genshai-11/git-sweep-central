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
  .command("scan-all")
  .description("Scan ALL common project directories on your computer")
  .option("-d, --max-depth <n>", "Max depth for recursive scan", "5")
  .action(async (options) => {
    const os = await import("node:os");
    const { existsSync } = await import("node:fs");
    const { join } = await import("node:path");
    const home = os.homedir();

    // Common project directories
    const candidates = [
      join(home, "Projects"),
      join(home, "projects"),
      join(home, "Developer"),
      join(home, "dev"),
      join(home, "Dev"),
      join(home, "Code"),
      join(home, "code"),
      join(home, "workspace"),
      join(home, "Workspace"),
      join(home, "repos"),
      join(home, "Repos"),
      join(home, "src"),
      join(home, "git"),
      join(home, "GitHub"),
      join(home, "Documents", "Projects"),
      join(home, "Documents", "GitHub"),
      join(home, "Desktop"),
    ];

    const existing = candidates.filter((p) => {
      try { return existsSync(p); } catch { return false; }
    });

    if (existing.length === 0) {
      console.log(chalk.yellow("\n⚠  No common project directories found. Try: git-sweepher scan <path>"));
      return;
    }

    console.log(chalk.bold(`\n🔍 Scanning ${existing.length} directories on your computer...\n`));
    for (const dir of existing) {
      console.log(chalk.dim(`  → ${dir}`));
    }
    console.log("");

    // Scan each directory
    for (const dir of existing) {
      await scanCommand(dir, { maxDepth: options.maxDepth, recursive: true });
    }

    console.log(chalk.green.bold("\n✅ Full scan complete!\n"));
  });

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
