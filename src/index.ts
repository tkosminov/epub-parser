import AdmZip from 'adm-zip';
import xml2js, { ParserOptions } from 'xml2js';
import fs from 'fs';

import { IContentItemJson, IContentJson, IParsedSectionChildren, ISectionChildren, ISectionJson } from './epub';

interface IUnzipFile {
  path: string;
  data: Buffer;
}

interface IBookContent {
  title: string;
  lang: string;
  author: string;
  publisher: string;
  cover: IContentItemJson;
  titlepage: IContentItemJson;
  sections: IContentItemJson[];
  images: IContentItemJson[];
  styles: IContentItemJson[];
  other: IContentItemJson[];
}

export class EPubParser {
  private book_files: IUnzipFile[] = [];
  private book_content: IBookContent = null;

  constructor(private readonly book: Buffer) {}

  private async unzip() {
    const zip = new AdmZip(this.book);
    const zip_entries = zip.getEntries();

    this.book_files = await Promise.all(
      zip_entries.map((zip_entry) => {
        return {
          path: zip_entry.entryName,
          data: zip_entry.getData(),
        } as IUnzipFile;
      })
    );
  }

  private async convertXmlToJson<T>(buffer: Buffer, options: ParserOptions = {}): Promise<T> {
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

  private toBase64(buffer: Buffer, mimetype: string) {
    return `data:${mimetype};base64,${buffer.toString('base64')}`;
  }

  // private async parseBookToc() {
  //   const toc_file = this.book_files.find((f) => f.path.includes('toc.ncx'))
  //   const toc_json = await this.convertXmlToJson<ITocJson>(toc_file.data);

  //   // ...
  // }

  // private async parseBookContainer() {
  //   const container_file = this.book_files.find((f) => f.path.includes('container.xml'))
  //   const container_json = await this.convertXmlToJson<IContainerJson>(container_file.data);

  //   // ...
  // }

  private async parseBookContent() {
    const content_file = this.book_files.find((f) => f.path.includes('content.opf'));
    const content_json = await this.convertXmlToJson<IContentJson>(content_file.data);

    const manifest = content_json.package.manifest[0];
    const metadata = content_json.package.metadata[0];

    let cover: IContentItemJson = null;
    let titlepage: IContentItemJson = null;
    const sections: IContentItemJson[] = [];
    const images: IContentItemJson[] = [];
    const styles: IContentItemJson[] = [];
    const other: IContentItemJson[] = [];

    for (const item of manifest.item) {
      if (item.$.id === 'cover') {
        cover = item.$;
      } else if (item.$.id === 'titlepage') {
        titlepage = item.$;
      } else if (item.$['media-type'] === 'application/xhtml+xml') {
        sections.push(item.$);
      } else if (item.$['media-type'] === 'image/jpeg') {
        images.push(item.$);
      } else if (item.$['media-type'] === 'text/css') {
        styles.push(item.$);
      } else {
        other.push(item.$);
      }
    }

    this.book_content = {
      title: metadata['dc:title']?.[0],
      lang: metadata['dc:language']?.[0],
      author: metadata['dc:creator']?.[0]?._,
      publisher: metadata['dc:publisher']?.[0],
      cover,
      titlepage,
      sections: sections.sort((a, b) => {
        if (a.href > b.href) {
          return 1;
        }

        if (a.href < b.href) {
          return -1;
        }

        return 0;
      }),
      images,
      styles,
      other,
    };
  }

  private parseSectionChildren(children: ISectionChildren): IParsedSectionChildren[] {
    const childrens: IParsedSectionChildren[] = [];

    if (children.$$?.length) {
      for (const child of children.$$) {
        childrens.push(...this.parseSectionChildren(child));
      }
    } else {
      switch (children['#name']) {
        case 'img':
          childrens.push({
            type: 'image',
            value: children.$.src,
          });
          break;
        default:
          if (children._?.length) {
            childrens.push({
              type: 'text',
              value: children._,
            });
          }
          break;
      }
    }

    return childrens.flat(Infinity);
  }

  public async parse() {
    await this.unzip();
    await this.parseBookContent();

    if (this.book_content.cover) {
      const cover_file = this.book_files.find((f) => f.path.includes(this.book_content.cover.href));

      if (cover_file) {
        this.book_content.cover.data = [
          {
            type: 'image',
            value: this.book_content.cover.href,
            base64: this.toBase64(cover_file.data, this.book_content.cover['media-type']),
          },
        ];
      }
    }

    for (const section of this.book_content.sections) {
      const section_buffer = this.book_files.find((f) => f.path.includes(section.href)).data;
      const section_json = await this.convertXmlToJson<ISectionJson>(section_buffer, {
        preserveChildrenOrder: true,
        charsAsChildren: true,
        explicitChildren: true,
      });

      const section_content: IParsedSectionChildren[] = [];

      for (const body of section_json.html.body) {
        for (const paragraph of body.$$) {
          const parsed_paragraph = this.parseSectionChildren(paragraph);

          const res = parsed_paragraph.reduce(
            (acc, curr) => {
              if (curr.type === 'image') {
                const image_file = this.book_files.find((f) => f.path.includes(curr.value.split('../')[1]));

                if (image_file) {
                  curr.base64 = this.toBase64(image_file.data, this.book_content.cover['media-type']);
                }

                acc.images.push(curr);
              } else {
                acc.text.value += curr.value;
              }

              return acc;
            },
            { images: [], text: { value: '', type: 'text' } }
          );

          section_content.push(...res.images);

          if (res.text.value.length) {
            section_content.push(res.text as IParsedSectionChildren);
          }
        }
      }

      section.data = section_content.filter((a) => a.value?.length);
    }

    return this.book_content;
  }
}

async function test() {
  const file_path = `${__dirname}/../Vampire_Hunter_D_24.epub`;
  const buffer = fs.readFileSync(file_path);

  const parsed_book = await new EPubParser(buffer).parse();

  fs.writeFile(`${__dirname}/myjsonfile.json`, JSON.stringify(parsed_book, null, 2), 'utf8', () => {});
}

test();
