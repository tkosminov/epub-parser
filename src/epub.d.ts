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
  };
  '#name': 'div' | 'a' | 'img' | '__text__' | 'span';
  $$?: ISectionChildren[];
}

export interface ISectionJson {
  html: {
    body: Array<{
      $$: ISectionChildren[];
    }>;
  };
}
