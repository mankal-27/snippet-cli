#!/usr/bin/env node
const { Command } = require('commander');
const fs = require('fs');
const os = require('os');
const path = require('path');
const chalk = require('chalk');
const axios = require('axios');
const clipboardy = require('clipboardy');
const inquirer = require('inquirer');

const program = new Command();
const CONFIG_PATH = path.join(os.homedir(), '.snippet-cli.json');

// --- Native Config Management ---
function getConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    } catch (e) {
      return {}; // If file is corrupted, return empty object
    }
  }
  return {};
}

function updateConfig(newValues) {
  const current = getConfig();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({ ...current, ...newValues }, null, 2));
}

// 1. Load Config & Set API URL
const configData = getConfig();
const API_URL = configData.apiUrl || 'http://localhost:3000/api';

// 2. Token Management
function saveToken(token) {
  updateConfig({ token });
  console.log(chalk.green('✅ Authentication successful! Token saved locally.'));
}

function getToken() {
  const token = getConfig().token;
  if (token) return token;
  console.log(chalk.red('❌ You are not logged in. Run: snip login <your-jwt>'));
  process.exit(1);
}

function getHeaders() {
  return { Authorization: `Bearer ${getToken()}` };
}

program.name('snip').description('A lightning-fast CLI for your personal code snippets').version('1.0.0');

program.command('login <token>').action(saveToken);

program.command('whoami').action(() => {
  if (getToken()) console.log(chalk.blue('ℹ️  You are logged in and ready to snip.'));
});

// 1. The Ultimate Save Command (Single + Bulk)
program
  .command('save [title] [code]')
  .description('Save a new snippet to your database')
  .option('-l, --language <type>', 'Specify the programming language', 'text')
  .option('-c, --clipboard', 'Pull a single snippet directly from your system clipboard')
  .option('-b, --bulk', 'Bulk import a cheat sheet from clipboard (Format: # Title \\n code)')
  .action(async (title, code, options) => {
    try {
      // --- THE BULK IMPORT LOGIC ---
      if (options.bulk) {
        const rawText = clipboardy.readSync();
        if (!rawText) return console.log(chalk.yellow('⚠️  Your clipboard is empty!'));

        // Split the copied text by double line breaks (empty lines)
        const blocks = rawText.split('\n\n');
        let successCount = 0;

        console.log(chalk.cyan(`\n📦 Processing ${blocks.length} snippets from clipboard...\n`));

        for (const block of blocks) {
          const lines = block.split('\n');
          // Find the line that starts with '#' to use as the title
          const titleLine = lines.find(l => l.trim().startsWith('#'));
          
          if (!titleLine) continue; // Skip blocks that don't follow the format

          const blockTitle = titleLine.replace('#', '').trim();
          // Extract the actual code by filtering out the comment line
          const blockCode = lines.filter(l => !l.trim().startsWith('#')).join('\n').trim();

          if (blockTitle && blockCode) {
            await axios.post(`${API_URL}/snippets`, { 
              title: blockTitle, 
              code_content: blockCode, 
              language: options.language || 'bash'
            }, { headers: getHeaders() });
            
            console.log(chalk.green(`✅ Saved: ${blockTitle}`));
            successCount++;
          }
        }
        console.log(chalk.cyan(`\n🎉 Successfully bulk imported ${successCount} individual snippets!\n`));
        return;
      }

      // --- THE NORMAL SINGLE SAVE LOGIC ---
      if (!title) {
        return console.log(chalk.red('❌ You must provide a "title" unless you are using the --bulk flag.'));
      }

      let finalCode = code;
      if (options.clipboard) {
        finalCode = clipboardy.readSync();
        if (!finalCode) return console.log(chalk.yellow('⚠️  Your clipboard is empty!'));
      } else if (!finalCode) {
        return console.log(chalk.red('❌ Provide the code block in quotes, or use the -c flag.'));
      }

      await axios.post(`${API_URL}/snippets`, { 
        title: title, 
        code_content: finalCode, 
        language: options.language 
      }, { headers: getHeaders() });

      console.log(chalk.green(`✅ Snippet "${title}" saved successfully!`));

    } catch (error) {
      console.error(chalk.red('❌ Failed to save snippet(s):'), error.response?.data?.message || error.message);
    }
  });

// 2. The Updated Search Command
program
  .command('search <query>')
  .description('Fuzzy search your snippets and copy the best match to your clipboard')
  .action(async (query) => {
    try {
      const response = await axios.get(`${API_URL}/search?q=${encodeURIComponent(query)}`, {
        headers: getHeaders()
      });

      const results = response.data.results;

      // Scenario A: No results
      if (results.length === 0) {
        console.log(chalk.yellow(`⚠️  No snippets found matching "${query}".`));
        return;
      }

      // Scenario B: Exactly 1 result (Skip the menu, just copy it)
      if (results.length === 1) {
        const bestMatch = results[0];
        clipboardy.writeSync(bestMatch.code_content);
        console.log(chalk.cyan(`\n🔍 Found: ${chalk.bold(bestMatch.title)}`));
        console.log(chalk.green('📋 Copied to clipboard!\n'));
        return;
      }

      // Scenario C: Multiple results! (Show the interactive menu)
      console.log(chalk.cyan(`\n🔍 Found ${results.length} matches for "${query}":\n`));

      // Format the choices for Inquirer
      const choices = results.map(snippet => ({
        name: `${snippet.title} ${chalk.gray(`[${snippet.language}]`)}`, // What the user sees
        value: snippet.code_content // What gets returned when they select it
      }));

      const answer = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedSnippet',
          message: 'Use arrow keys to select a snippet to copy:',
          choices: choices,
          pageSize: 10 // Show up to 10 options before scrolling
        }
      ]);

      // Copy the selected value to the clipboard
      clipboardy.writeSync(answer.selectedSnippet);
      
      console.log(chalk.gray('\n----------------------------------------'));
      console.log(chalk.white(answer.selectedSnippet));
      console.log(chalk.gray('----------------------------------------'));
      console.log(chalk.green('📋 Copied to clipboard!\n'));

    } catch (error) {
      console.error(chalk.red('❌ Search failed:'), error.response?.data?.message || error.message);
    }
  });

// 3. The Config Command
program
  .command('config <url>')
  .description('Set the backend API URL')
  .action((url) => {
    updateConfig({ apiUrl: url });
    console.log(chalk.green(`✅ API URL set to: ${url}`));
  });
  
program.parse(process.argv);