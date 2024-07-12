# simple-epub-parser

<p align="center">
  <a href="https://www.npmjs.com/package/epub-parser-simple" target="_blank"><img src="https://img.shields.io/npm/v/epub-parser-simple.svg" alt="NPM Version"></a>
  <a href="https://www.npmjs.com/package/epub-parser-simple" target="_blank"><img src="https://img.shields.io/npm/l/epub-parser-simple.svg" alt="Package License"></a>
  <a href="https://www.npmjs.com/package/epub-parser-simple" target="_blank"><img src="https://img.shields.io/npm/dm/epub-parser-simple.svg" alt="NPM Downloads"></a>
</p>

## Description

The package exports a simple parser function which use epub file as input and output JavaScript object.

As it is written in TypeScript, types are already included in the package.

## Installation

```bash
npm i epub-parser-simple
```

## Usage

```ts
import fs from 'fs';

import { parseEpub } from 'epub-parser-simple'

const file_path = `${__dirname}/${file_name}.epub`;
const buffer = fs.readFileSync(file_path);

const parsed_book = await parseEpub(buffer)

fs.writeFile(`${__dirname}/${file_name}.json`, JSON.stringify(parsed_book, null, 2), 'utf8', () => {});
```
