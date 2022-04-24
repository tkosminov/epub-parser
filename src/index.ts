import AdmZip from 'adm-zip';
import xml2js, { ParserOptions } from 'xml2js';
import fs from 'fs';

type TTag = 'div' | 'a' | 'img' | 'image' | 'svg' | '__text__' | 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

// export interface IContainerJson {
//   container: {
//     $: {
//       version: string;
//       xmlns: string;
//     };
//     rootfiles: Array<{
//       rootfile: Array<{
//         $: {
//           'full-path': string;
//           'media-type': 'application/oebps-package+xml';
//         }
//       }>;
//     }>;
//   }
// }

// export interface ITocJson {
//   ncx: {
//     $: {
//       version: string;
//       'xml:lang': string;
//       xmlns: string;
//     };
//     head: Array<{
//       meta: Array<{
//         $: {
//           content: string;
//           name: string;
//         }
//       }>
//     }>;
//     docTitle: Array<{
//       text: string[];
//     }>;
//     navMap: Array<{
//       navPoint: Array<{
//         $: {
//           class: string;
//           id: string;
//           playOrder: string;
//         };
//         navLabel: Array<{
//           text: string[];
//         }>;
//         content: Array<{
//           $: {
//             src: string;
//           }
//         }>;
//       }>
//     }>
//   }
// }

export interface IParsedSectionChildren {
  type: 'image' | 'text';
  value: string;
  tag?: TTag;
  extend?: boolean;
  base64?: string;
}

export interface IContentItemJson {
  id: string;
  href: string;
  'media-type': 'image/jpeg' | 'application/xhtml+xml' | 'text/css';
  data?: IParsedSectionChildren[];
}

export interface IContentJson {
  package: {
    $: {
      version: string;
      'unique-identifier': string;
      xmlns: string;
    };
    metadata: Array<{
      $: {
        'xmlns:calibre': string;
        'xmlns:xsi': string;
        'xmlns:opf': string;
        'xmlns:dc': string;
        'xmlns:dcterms': string;
      };
      meta: Array<{
        $: {
          name: string;
          content: string;
        };
      }>;
      'dc:date': Array<
        | string
        | {
            _: string;
            $: {
              'opf:event': string;
              'xmlns:opf': string;
            };
          }
      >;
      'dc:title': string[];
      'dc:language': string[];
      'dc:creator': Array<{
        _: string;
        $: {
          'opf:role': string;
          'opf:file-as': string;
        };
      }>;
      'dc:contributor': Array<{
        _: string;
        $: {
          'opf:role': string;
        };
      }>;
      'dc:publisher': string[];
      'dc:identifier': Array<{
        _: string;
        $: {
          'opf:scheme'?: string;
          id?: string;
        };
      }>;
    }>;
    manifest: Array<{
      item: Array<{
        $: IContentItemJson;
      }>;
    }>;
    spine: Array<{
      $: {
        toc: string;
      };
      itemref: Array<{
        $: {
          idref: string;
          linear?: string;
        };
      }>;
    }>;
    guide: Array<{
      reference: Array<{
        $: {
          type: string;
          title: string;
          href: string;
        };
      }>;
    }>;
  };
}

export interface ISectionChildren {
  _: string;
  $: {
    src: string;
    class: string;
    alt?: string;
    'xlink:href'?: string;
  };
  '#name': TTag;
  $$?: ISectionChildren[];
}

export interface ISectionJson {
  html: {
    body: Array<{
      $$: ISectionChildren[];
    }>;
  };
}


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

    switch (children['#name']) {
      case 'div':
        if (children.$$?.length) {
          let extened_text = ''

          for (const child of children.$$) {
            this.parseSectionChildren(child).forEach((parsed_child) => {
              if (!['p', 'div', 'img', 'svg', 'image'].includes(parsed_child.tag)) {
                if (parsed_child.value?.length) {
                  extened_text += parsed_child.value
                }
              } else {
                if (extened_text.length) {
                  childrens.push({
                    type: 'text',
                    value: extened_text,
                    tag: children['#name'],
                  })
        
                  extened_text = ''
                }

                childrens.push(parsed_child)
              }
            });
          }

          if (extened_text.length) {
            childrens.push({
              type: 'text',
              value: extened_text,
              tag: children['#name'],
            })
  
            extened_text = ''
          }
        } else if (children._?.length) {
          childrens.push({
            type: 'text',
            value: children._,
            tag: children['#name'],
          });
        }
        break;
      case 'p':
        if (children.$$?.length) {
          let extened_text = ''
  
          for (const child of children.$$) {
            this.parseSectionChildren(child).forEach((parsed_child) => {
              if (parsed_child.type === 'image') {
                childrens.push(parsed_child)
              } else {
                if (parsed_child.value?.length) {
                  extened_text += parsed_child.value
                }
              }
            })
          }
  
          if (extened_text.length) {
            childrens.push({
              type: 'text',
              value: extened_text,
              tag: children['#name'],
            })
  
            extened_text = ''
          }
        } else if (children._?.length) {
          childrens.push({
            type: 'text',
            value: children._,
            tag: children['#name'],
          });
        }
        break;
      case 'svg':
        for (const child of children.$$) {
          childrens.push(...this.parseSectionChildren(child))
        }
      case 'img':
      case 'image':
        let value = children.$.src;

        if (children.$.hasOwnProperty('xlink:href')) {
          value = children.$['xlink:href']
        }

        if (value?.length) {
          childrens.push({
            type: 'image',
            value: value,
            tag: children['#name'],
          });
        }
        break;
      default:
        if (children._?.length) {
          childrens.push({
            type: 'text',
            value: children._,
            tag: children['#name'],
          });
        }
        break;
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
            tag: 'img',
          },
        ];
      }
    }

    for (const section of this.book_content.sections) {
      // if (section.href !== 'Text/part0000.xhtml') {
      //   continue
      // }

      const section_buffer = this.book_files.find((f) => f.path.includes(section.href)).data;
      const section_json = await this.convertXmlToJson<ISectionJson>(section_buffer, {
        preserveChildrenOrder: true,
        charsAsChildren: true,
        explicitChildren: true,
      });

      const section_content: IParsedSectionChildren[] = [];

      for (const body of section_json.html.body) {
        for (const block of body.$$) {
          const parsed_paragraph = this.parseSectionChildren(block);

          for (const el of parsed_paragraph) {
            if (el.value?.length) {
              if (el.type === 'image') {
                const image_file = this.book_files.find((f) => f.path.includes(el.value.split('../')[1]));

                if (image_file) {
                  el.base64 = this.toBase64(image_file.data, this.book_content.cover['media-type']);
                }
              }

              delete el.tag;

              section_content.push(el);
            }
          }
        }
      }

      section.data = section_content;
    }

    return this.book_content;
  }
}

async function test() {
  // const file_path = `${__dirname}/../Vampire_Hunter_D_24.epub`;
  const file_path = `${__dirname}/../Log_Horizon_01.epub`;
  const buffer = fs.readFileSync(file_path);

  const parsed_book = await new EPubParser(buffer).parse();

  fs.writeFile(`${__dirname}/myjsonfile.json`, JSON.stringify(parsed_book, null, 2), 'utf8', () => {});
}

test();
