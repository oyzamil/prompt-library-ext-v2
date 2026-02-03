#!/usr/bin/env bun
import { execSync } from 'child_process';

const [, , cmd, ...args]: string[] = process.argv;

const run = (command: string): Buffer | undefined => {
  try {
    const output = execSync(command, { stdio: 'inherit' });
    return output;
  } catch (err) {
    console.error('Error executing command:', (err as Error).message);
  }
};

switch (cmd) {
  case 'remove-git':
    console.log('Removing Git from this project...');
    run('powershell -Command "Remove-Item -Recurse -Force .git"');
    break;
  
  case 'change-repo':
    if (!args[0]) {
      console.error('Please provide a new repo URL!');
      process.exit(1);
    }
    console.log(`Changing Git remote to ${args[0]}...`);
    run(`git remote set-url origin ${args[0]}`);
    break;
  
  case 'show-git':
    console.log('Current Git info:');
    run('git remote -v');
    run('git branch --show-current');
    run('git status');
    break;
  
  case 'add-git':
    const commitMsg: string = args.join(' ') || 'Commit';
    console.log('Adding all changes, committing, and pushing...');
    run('git add .');
    run(`git commit -m "${commitMsg}"`);
    run('git push -u origin main');
    break;
  
  default:
    console.log(`
Usage:
  remove-git          Remove Git from project
  change-repo URL     Change Git remote to new URL
  show-git            Show repo info
  add-git [message]   Add all, commit, and push
    `);
}