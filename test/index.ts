import fs from 'fs';

import { parseEpub } from "../src";

async function test() {
  const epubs: string[] = [
    'Demon King Daimaou - Volume 01 [J-Novel Club][Kobo]',
    'Goblin Slayer - Volume 05 [Yen Press][KindleHQ]',
    'Log Horizon - Volume 11 [Yen Press][Kobo]',
    'Vampire Hunter D - Volume 25 - Undead Island [Dark Horse][Kobo]',
    'Forgotten Realms - Richard Lee Byers - [Brotherhood of the Griffon 04] - The Masked Witches (v5.0) (epub)',
    'Prophet of the Dead_ Forgotten Realms - Richard Lee Byers',
  ];

  for (const file_name of epubs) {
    const file_path = `/home/tkosminov/Документы/epub/${file_name}.epub`;

    const buffer = fs.readFileSync(file_path);

    const parsed_book = await parseEpub(buffer);

    fs.writeFile(`${__dirname}/${file_name}.json`, JSON.stringify(parsed_book, null, 2), 'utf8', () => {});
  }
}

test();
