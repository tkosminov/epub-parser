import AdmZip from 'adm-zip';
import xml2js, { ParserOptions } from 'xml2js';

import { IUnzipFile } from '../types';

export async function unzip(book: Buffer) {
  const zip = new AdmZip(book);
  const zip_entries = zip.getEntries();

  return await Promise.all(
    zip_entries.map((zip_entry) => {
      return {
        path: zip_entry.entryName,
        data: zip_entry.getData(),
      } as IUnzipFile;
    })
  );
}

export async function convertXmlToJson<T>(buffer: Buffer, options: ParserOptions = {}): Promise<T> {
  const parser = new xml2js.Parser({ trim: true, ...options });

  return await new Promise((resolve, reject) => {
    parser.parseString(buffer.toString('utf-8'), (error: Error, result: Record<string, unknown>) => {
      if (error) {
        reject(error);
      }

      resolve(result as T);
    });
  });
}

export function toBase64(buffer: Buffer, mimetype: string) {
  return `data:${mimetype};base64,${buffer.toString('base64')}`;
}
