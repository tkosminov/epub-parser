import fs from 'fs';

import { parseEpub } from "../src";

async function test() {
  for (const file_name of ['Goblin_Slayer_Volume_10']) {
    const file_path = `${__dirname}/../samples/${file_name}.epub`;

    const buffer = fs.readFileSync(file_path);

    const parsed_book = await parseEpub(buffer);

    fs.writeFile(`${__dirname}/${file_name}.json`, JSON.stringify(parsed_book, null, 2), 'utf8', () => {});
  }
}

test();
