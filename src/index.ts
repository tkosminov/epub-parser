import { IContentItemJson, IContentJson, IParsedBook, IParsedContentItemJson, ISectionChildren, ISectionJson } from './types';
import { convertXmlToJson, toBase64, unzip } from './utils';

function parseSectionChildren(children: ISectionChildren) {
  const results: IParsedContentItemJson[] = [];

  switch (children['#name']) {
    case 'div':
      if (children.$$?.length) {
        let extened_text = '';

        for (const child of children.$$) {
          for (const el of parseSectionChildren(child)) {
            if (['img', 'image', 'div', 'p', 'svg'].includes(el.tag)) {
              if (extened_text.length) {
                results.push({
                  type: 'text',
                  value: extened_text,
                  tag: 'div',
                });

                extened_text = '';
              }

              results.push(el);
            } else if (el.value?.length) {
              extened_text += el.value;
            }
          }
        }

        if (extened_text.length) {
          results.push({
            type: 'text',
            value: extened_text,
            tag: children['#name'],
          });
        }
      } else if (children._?.length) {
        results.push({
          type: 'text',
          value: children._,
          tag: children['#name'],
        });
      }
      break;
    case 'p':
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      if (children.$$?.length) {
        let extened_text = '';

        for (const child of children.$$) {
          for (const el of parseSectionChildren(child)) {
            if (el.type === 'image') {
              results.push(el);
            } else if (el.value?.length) {
              extened_text += el.value;
            }
          }
        }

        if (extened_text.length) {
          results.push({
            type: 'text',
            value: extened_text,
            tag: children['#name'],
          });
        }
      } else if (children._?.length) {
        results.push({
          type: 'text',
          value: children._,
          tag: children['#name'],
        });
      }
      break;
    case 'svg':
      for (const child of children.$$) {
        results.push(...parseSectionChildren(child));
      }
      break;
    case 'image':
    case 'img':
      const value = children.$.src || children.$['xlink:href'];

      if (value.length) {
        results.push({
          type: 'image',
          value: value,
          tag: 'img',
        });
      }
      break;
    default:
      if (children._?.length) {
        results.push({
          type: 'text',
          value: children._,
          tag: children['#name'],
        });
      }
      break;
  }

  return results.flat(Infinity);
}

export async function parseEpub(book: Buffer) {
  const files = await unzip(book);

  const parsed_book: IParsedBook = {};

  const container_file = files.find((f) => f.path.includes('container.xml'));
  const container_file_json: any = await convertXmlToJson(container_file.data);

  const rootfile_path = container_file_json.container.rootfiles[0].rootfile[0].$['full-path'];

  const rootfile = files.find((f) => f.path.includes(rootfile_path));
  const rootfile_json = await convertXmlToJson<IContentJson>(rootfile.data);

  const manifest = rootfile_json.package.manifest[0];
  const metadata = rootfile_json.package.metadata[0];

  let cover: IContentItemJson;
  let titlepage: IContentItemJson;
  const sections: IContentItemJson[] = [];
  const images: IContentItemJson[] = [];
  const styles: IContentItemJson[] = [];
  const other: IContentItemJson[] = [];

  for (const item of manifest.item) {
    console.log(item.$.href);
    if (item.$.id === 'cover' || item.$.id === 'coverpage') {
      cover = item.$;
    } else if (item.$.id === 'titlepage') {
      titlepage = item.$;
    } else if (item.$['media-type'] === 'application/xhtml+xml') {
      sections.push(item.$);
    } else if (item.$['media-type'] === 'image/jpeg' || item.$['media-type'] === 'image/png') {
      images.push(item.$);
    } else if (item.$['media-type'] === 'text/css') {
      styles.push(item.$);
    } else {
      other.push(item.$);
    }
  }

  parsed_book.title = metadata['dc:title']?.[0];
  parsed_book.lang = metadata['dc:language']?.[0];
  parsed_book.author = metadata['dc:creator']?.[0]?._;
  parsed_book.publisher = metadata['dc:publisher']?.[0];
  parsed_book.cover = cover;
  parsed_book.sections = sections;

  if (parsed_book.cover) {
    const cover_file = files.find((f) => f.path.includes(parsed_book.cover.href));

    if (cover_file) {
      parsed_book.cover.parsed_data = [
        {
          type: 'image',
          value: parsed_book.cover.href,
          base64: toBase64(cover_file.data, 'image/jpeg'),
          tag: 'img',
        },
      ];
    }
  }

  for (const section of parsed_book.sections) {
    const section_file = files.find((f) => f.path.includes(section.href));
    const section_json = await convertXmlToJson<ISectionJson>(section_file.data, {
      preserveChildrenOrder: true,
      charsAsChildren: true,
      explicitChildren: true,
    });

    const section_data: IParsedContentItemJson[] = [];

    for (const body of section_json.html.body) {
      for (const tag of body.$$) {
        for (const el of parseSectionChildren(tag)) {
          if (el.value?.length) {
            if (el.type === 'image') {
              const image_file = files.find((f) => f.path.includes(el.value.split('../')[1]));

              if (image_file) {
                el.base64 = toBase64(image_file.data, 'image/jpeg');
              }
            }

            section_data.push(el);
          }
        }
      }
    }

    section.parsed_data = section_data;
  }

  return parsed_book;
}
