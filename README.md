# ⚡ Snip CLI

A lightning-fast, keyboard-first command-line interface for your personal code snippets. 

Built for developers who want to stay in their flow state. `snip` allows you to save multi-line code blocks directly from your system clipboard, and uses an interactive menu to fuzzy-search your database and instantly copy the results back to your clipboard.

## 🛠 Built With
* **Node.js**
* **Commander.js** (Command-line framework)
* **Inquirer** (Interactive terminal menus)
* **Clipboardy** (System clipboard integration)
* **Axios** (HTTP client)

## 📦 Installation

*(Note: This CLI requires the Snippet Search backend API to be running).*

Install the package globally via NPM:
```bash
npm i dev-snip-cli
```
## ⚙️ Configuration (Required)

By default, this CLI connects to `http://localhost:3000`. To use this tool, you must have the [Snippet Search Backend](https://github.com/mankal-27/snippet-search-mvp) running.

#### TODO
backend need to be hosted on a different port or a remote server, configure the CLI before starting:
```bash
snip config <url>
# Example: snip config [https://my-api.railway.app/api](https://my-api.railway.app/api)
```



## 🚀 Usage

### 1. Authentication
Link the CLI to your backend by saving your JWT token locally (stored safely in ~/.snippet-cli.json):
```
snip login <your-jwt-token>
```
Verify your login status:
```
snip whoami
```

### 2. Saving Snippets
Save a simple snippet directly from your terminal:
```
snip save "Git Undo" "git reset --soft HEAD~1" -l bash
```
#### Pull from Clipboard (-c):
Copy a block of code in your editor, then run this to instantly save it without fighting terminal string formatting:
```
snip save "My Awesome Component" -c -l javascript
```

#### Bulk Import (-b):
Copy a Markdown-style cheat sheet to your clipboard (formatted with # Title followed by the code block), and bulk-import them as individual, searchable database records:
```
snip save --bulk -l bash
```

### 3. Searching & Copying
Fuzzy search your entire snippet database. If multiple results are found, an interactive menu will appear. Use your arrow keys to select the best match, and the code will automatically be copied to your system clipboard!
```
snip search "docker"
```

## 📜 License
MIT
