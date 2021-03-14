Passman
=======

> `passman` is a simple password manager. You only need one master password and supplied string (like URL) to generate passwords.

[![NPM version](https://img.shields.io/npm/v/passman.svg)](https://www.npmjs.com/package/passman)
[![NPM downloads](https://img.shields.io/npm/dm/passman.svg)](https://www.npmjs.com/package/passman)
[![Build Status](https://travis-ci.org/d-band/passman.svg?branch=master)](https://travis-ci.org/d-band/passman)
[![Coverage Status](https://coveralls.io/repos/github/d-band/passman/badge.svg?branch=master)](https://coveralls.io/github/d-band/passman?branch=master)
[![Dependency Status](https://david-dm.org/d-band/passman.svg)](https://david-dm.org/d-band/passman)

## Install

```bash
$ npm i passman -g
```

## Usage

```bash
# passman -h
Usage: passman [options] [command]

Options:
  -v, --version             output the version number
  -h, --help                display help for command

Commands:
  init [options]            init config file: .passman.json
  list|ls [query]           list accounts
  get <service>             get account
  add <service> [username]  add account
  backup [file]             backup data to file (default: passman.dat)
  help [command]            display help for command
```

## Documents

[Read full documents](d-band.github.io/passman/)

## Report a issue

* [All issues](https://github.com/d-band/passman/issues)
* [New issue](https://github.com/d-band/passman/issues/new)

## License

passman is available under the terms of the MIT License.
