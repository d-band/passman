#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import * as prompts from 'prompts';
import { green, red, cyan } from 'chalk';
import { PassOptions, genPass } from './index';
import { gcmDecrypt, gcmEncrypt, genSeed } from './csprng';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require('../package.json');

interface Account {
  service: string;
  username?: string;
  password?: string;
  options?: PassOptions;
  createdAt: string;
}

interface PassmanConfig {
  password?: string;
  seed?: string;
  accounts: Account[];
}

const CONF_PATH = path.resolve('.passman.json');
const realm = (v: Account) => `${v.service}-${v.username || 'default'}`;
const onCancel = () => Promise.reject(new Error('Operation cancelled'));
const warning = (err: Error) => {
  console.log(red(err.message));
  process.exitCode = 1;
};

function getConfig(): PassmanConfig {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const config: PassmanConfig = require(CONF_PATH);
    return config;
  } catch (err) {
    throw new Error(
      `Config file not found. Initialize it with: ${cyan('passman init')}`
    );
  }
}

function saveConfig(config: PassmanConfig): void {
  const data = JSON.stringify(config, null, '  ');
  fs.writeFileSync(CONF_PATH, data, 'utf-8');
}

function showPass(password: string, username?: string) {
  if (username) {
    console.log(`Your username is: ${green(username)}`);
  }
  console.log(`Your password is: ${green(password)}`);
}

async function getPass(config: PassmanConfig, item: Account): Promise<string> {
  if (item.password) {
    showPass(item.password, item.username);
    return item.password;
  }
  let master = config.password;
  if (!master) {
    master = await inputPassword(false);
  }
  const pass = await genPass(master, realm(item), config.seed, item.options);
  showPass(pass, item.username);
  return pass;
}

async function inputPassword(repeat: boolean): Promise<string> {
  const pass = await prompts(
    {
      type: 'password',
      name: 'value',
      message: 'Master password',
      validate: (v) => {
        if (!v) return 'Master password required';
        return true;
      }
    },
    { onCancel }
  );
  if (repeat) {
    const pass2 = await prompts(
      {
        type: 'password',
        name: 'value',
        message: 'Repeat password'
      },
      { onCancel }
    );
    if (pass.value !== pass2.value) {
      throw new Error('Passwords do not match');
    }
  }
  return pass.value;
}

async function init(file?: string) {
  if (fs.existsSync(CONF_PATH)) {
    throw new Error('Config file already exists');
  }
  if (file) {
    if (!fs.existsSync(file)) {
      throw new Error('Encrypted config file not found');
    }
    const data = fs.readFileSync(file);
    const pass = await inputPassword(false);
    const buf = await gcmDecrypt(pass, data);
    const config: PassmanConfig = JSON.parse(
      buf.slice(12, -16).toString('utf-8')
    );
    return saveConfig(config);
  }
  const pass = await inputPassword(true);
  const config: PassmanConfig = {
    accounts: []
  };
  const isSeed = await prompts(
    {
      type: 'confirm',
      name: 'value',
      message: 'Do you want to use seed?',
      initial: true
    },
    { onCancel }
  );
  if (isSeed.value) {
    const seed = await genSeed(pass);
    config.seed = seed.toString('base64');
  }
  const isSave = await prompts(
    {
      type: 'confirm',
      name: 'value',
      message: 'Save master password locally?',
      initial: true
    },
    { onCancel }
  );
  if (isSave.value) {
    config.password = pass;
  }
  saveConfig(config);
}

function list(q: string) {
  try {
    const { accounts } = getConfig();
    const filtered = accounts.filter((v) => {
      if (!q) return true;
      return v.service.includes(q) || v.username?.includes(q);
    });
    console.log(
      `Accounts: ${green(`${filtered.length}/${accounts.length}`)}\n`
    );
    filtered.forEach((v) => {
      console.log(`  => ${cyan(v.service)} (${v.username || 'default'})`);
    });
    console.log();
  } catch (err) {
    warning(err);
  }
}

async function get(q: string) {
  const config = getConfig();
  const accounts = config.accounts.filter((v) => {
    if (!q) return true;
    return v.service.includes(q) || v.username?.includes(q);
  });
  if (!accounts.length) {
    throw new Error('Account not found');
  }
  let index = 0;
  if (accounts.length > 1) {
    const res = await prompts(
      {
        type: 'select',
        name: 'value',
        message: 'Choose account',
        choices: accounts.map((v, i) => ({
          value: i,
          title: `${v.service} (${v.username || 'default'})`
        })),
        initial: 0
      },
      { onCancel }
    );
    index = res.value;
  }
  await getPass(config, accounts[index]);
}

async function add(service: string, username: string) {
  const config = getConfig();
  const account: Account = {
    service,
    username,
    createdAt: new Date().toISOString()
  };
  const item = config.accounts.find((v) => realm(v) === realm(account));
  if (item) {
    const reset = await prompts(
      {
        type: 'confirm',
        name: 'value',
        message: 'Account already exists. Do you want to reset?',
        initial: false
      },
      { onCancel }
    );
    if (!reset.value) {
      return;
    }
  }
  const options = item?.options;
  account.options = await prompts(
    [
      {
        type: 'number',
        name: 'length',
        message: 'Length of password',
        initial: options ? options.length : 10
      },
      {
        type: 'number',
        name: 'uppers',
        message: 'How many uppers at least?',
        initial: options ? options.uppers : 3
      },
      {
        type: 'number',
        name: 'lowers',
        message: 'How many lowers at least?',
        initial: options ? options.lowers : 3
      },
      {
        type: 'number',
        name: 'digits',
        message: 'How many digits at least?',
        initial: options ? options.digits : 1
      },
      {
        type: 'number',
        name: 'symbols',
        message: 'How many symbols at least?',
        initial: options ? options.symbols : 1
      }
    ],
    { onCancel }
  );
  const pass = await getPass(config, account);
  const isSave = await prompts(
    {
      type: 'confirm',
      name: 'value',
      message: 'Save the password locally?',
      initial: true
    },
    { onCancel }
  );
  if (isSave.value) {
    account.password = pass;
  }
  if (item) {
    const i = config.accounts.indexOf(item);
    config.accounts.splice(i, 1);
  }
  config.accounts.unshift(account);
  saveConfig(config);
}

async function backup(file?: string) {
  if (!file) {
    file = 'passman.dat';
  }
  if (fs.existsSync(file)) {
    throw new Error('Backup file already exists');
  }
  const config = getConfig();
  const pass = await inputPassword(false);
  if (config.password && config.password !== pass) {
    throw new Error('Master password not matched with saved');
  }
  if (config.seed) {
    try {
      await gcmDecrypt(pass, config.seed);
    } catch (err) {
      throw new Error('Master password not matched with seed');
    }
  }
  for (const item of config.accounts) {
    if (item.password) {
      const pwd = await genPass(pass, realm(item), config.seed, item.options);
      if (item.password !== pwd) {
        throw new Error('Master password not matched with saved account');
      }
    }
  }
  const data = JSON.stringify(config, null, '  ');
  const encrypted = await gcmEncrypt(pass, data);
  fs.writeFileSync(file, encrypted);
  console.log(
    `\n${green('Backup successful to:')}\n${cyan.underline(
      path.resolve(file)
    )}\n`
  );
}

const program = new Command();
program.version(version, '-v, --version');

program
  .command('init')
  .description('init config file: .passman.json')
  .option('-f --file <file>', 'init with backup file')
  .action((opts) => init(opts.file).catch(warning));

program
  .command('list [query]')
  .alias('ls')
  .description('list accounts')
  .action((query) => list(query));

program
  .command('get <service>', { isDefault: true })
  .description('get account password')
  .action((query) => get(query).catch(warning));

program
  .command('add <service> [username]')
  .description('add account')
  .action((service, username) => add(service, username).catch(warning));

program
  .command('backup [file]')
  .description('backup data to file (default: passman.dat)')
  .action((file) => backup(file).catch(warning));

program.parse();
