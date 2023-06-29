#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
let argv = process.argv.slice(2);

// note: injected @ build
declare const VERSION: string;

if (argv.includes('-h') || argv.includes('--help')) {
	let msg = '';
	msg += '\n  Usage\n    $ tsm [options] -- <command>\n';
	msg += '\n  Options';
	msg += `\n    --tsmconfig    Configuration file path (default: tsm.js)`;
	msg += `\n    --quiet        Silence all terminal messages`;
	msg += `\n    --version      Displays current version`;
	msg += '\n    --help         Displays this message\n';
	msg += '\n  Examples';
	msg += '\n    $ tsm server.ts';
	msg += '\n    $ node -r tsm input.jsx';
	msg += '\n    $ node --loader tsm input.jsx';
	msg += '\n    $ NO_COLOR=1 tsm input.jsx --trace-warnings';
	msg += '\n    $ tsm server.tsx --tsmconfig tsm.mjs\n';
	console.log(msg);
	process.exit(0);
}

if (argv.includes('-v') || argv.includes('--version')) {
	console.log(`tsm, v${VERSION}`);
	process.exit(0);
}

function isSelfOrSubdirectory(parent: string, child: string): boolean {
	if (path.resolve(parent) === path.resolve(child)) return true;
  const relative = path.relative(parent, child);
  return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function getScriptPath(): string | undefined {
	if (argv.length === 0) return undefined;
	const {npm_command, npm_lifecycle_event, npm_package_json} = process.env;
	if (npm_command && npm_lifecycle_event && npm_package_json && fs.existsSync(npm_package_json)) {
		let json: any;
		try {
			json = JSON.parse(fs.readFileSync(npm_package_json).toString());
		} catch (e) {}

		const configPath = json && json?.tsm?.path;
		if (!configPath) return undefined;
		if (!isSelfOrSubdirectory(process.cwd(), configPath)) {
			console.warn("[tsm] configPath outside working directory, exiting. ");
			throw process.exit(1);
		}

		const suffixes = ['ts', 'js'];
		const prefixes = ['', 'm', 'c'];
		for (const suffix of suffixes) {
			for (const prefix of prefixes) {
				const filename = npm_lifecycle_event + `.${prefix}${suffix}`;
				const pathname = path.join(path.dirname(npm_package_json), configPath, filename);
				if (fs.existsSync(pathname)) return pathname;
			}
		}
	}
}

const scriptPath = getScriptPath();

let { URL, pathToFileURL } = require('url') as typeof import('url');
if (scriptPath) argv = [...argv, scriptPath];
argv = ['--enable-source-maps', '--loader', new URL('loader.mjs', pathToFileURL(__filename)).href, ...argv];
console.log('argv', argv);
require('child_process').spawn('node', argv, { stdio: 'inherit' }).on('exit', process.exit);
