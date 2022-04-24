# simple-epub-parser

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
