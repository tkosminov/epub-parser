export type TTag =
  | 'div'
  | 'a'
  | 'img'
  | 'image'
  | 'svg'
  | '__text__'
  | 'span'
  | 'p'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'section'
  | 'nav'
  | 'ol'
  | 'ul'
  | 'li';
export type TMedia = 'image/jpeg' | 'image/png' | 'application/xhtml+xml' | 'text/css';

export interface IContainerJson {
  container: {
    $: {
      version: string;
      xmlns: string;
    };
    rootfiles: Array<{
      rootfile: Array<{
        $: {
          'full-path': string;
          'media-type': TMedia;
        };
      }>;
    }>;
  };
}

export interface IParsedContentItemJson {
  type: 'image' | 'text';
  value: string;
  tag: TTag;
  base64?: string;
}

export interface IContentItemJson {
  id: string;
  href: string;
  'media-type': TMedia;
  parsed_data: IParsedContentItemJson[];
}

export interface IContentJsonMetadata {
  $: {
    'xmlns:calibre': string;
    'xmlns:xsi': string;
    'xmlns:opf': string;
    'xmlns:dc': string;
    'xmlns:dcterms': string;
  };
  meta?: Array<{
    $: {
      name: string;
      content: string;
    };
  }>;
  'opf:meta'?: Array<{
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
}

export interface IContentJson {
  package: {
    $: {
      version: string;
      'unique-identifier': string;
      xmlns: string;
    };
    metadata: IContentJsonMetadata[];
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

export interface IUnzipFile {
  path: string;
  data: Buffer;
}

export interface IParsedBook {
  title?: string;
  lang?: string;
  author?: string;
  publisher?: string;
  cover?: IContentItemJson;
  sections?: IContentItemJson[];
}
