"use strict";
/**
 * ## Textile.js
 *
 *   Converts Textile to HTML
 *
 * ## Usage
 *
 * ```js
 * textile = require('textile');
 * textile(source, options);
 * ```
 *
 * ## Options
 *
 *   - `wrapBlocks` **boolean**
 *     - `true` _default_ wraps basic blocks in paragraph tags.
 *     - `false` disables wrapping blocks in paragraph tags.
 *   - `highlight` **function** `function (code) { return yourHighlighter(code); }`
 *     - Allows highlighting of code if you wish using your own custom highlighting script.
 *     - _default_ no highlighting.
 *   - `escapeSequence` **string**
 *     - Allows to set custom formatting escape sequence - textile formatting will be disabled for a string, contained between two such tokens.
 *     - _default_ is `==`
 *
 * ## History
 *
 *   Prior names include: `textiled` by Yulian Kuncheff, `jstextile` by Christian Perfect.
 *   Both of these versions include bugs, bad coding habits and slight issues, not to knock them as without them this wouldn't exist.
 *
 *   With nothing in my pockets, I developed this version while sitting at Mashape offices, and some at a small quaint cafe named South Beach Cafe;
 *   Fueled by expresso and motivated by a nice little band accidentally stumbled upon through spotify called Delta Spirit
 *
 * @version 1.0.1
 * @author 2012 Nijiko Yonskai <nijikokun@gmail.com>
 * @copyright 2011 Christian Perfect
 * @copyright 2012 Yulian Kuncheff
 * @copyright 2012 Nijiko Yonskai
 * @license http://www.opensource.org/licenses/mit-license.html  MIT License
 */
(function (root, name, factory) {
  if (typeof exports === 'object') module.exports = factory();
  else if (typeof define === 'function' && define.amd) define(factory);
  else root[name] = factory();
}(this, 'textile', function () {
  function TextileConverter (src, options) {
    this.osrc = this.src = src;
    this.options = {};
    this.options.wrapBlocks = options && options.wrapBlocks !== undefined ? options.wrapBlocks : true;
    this.options.highlight = options && options.highlight !== undefined && typeof options.highlight === 'function' ? options.highlight : function (code) {
      return code;
    };
    this.options.escapeSequence = options && options.escapeSequence !== undefined ? options.escapeSequence : '==';
    this.out = '';
    this.footnotes = [];
  }

  TextileConverter.prototype = {
    regexpEscape: function (s) {
      // escape special regexp symbols
      return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    },

    convert: function () {
      var i;
      var escSeq = this.regexpEscape(this.options.escapeSequence);
      var escapeSeqReplacer =  new RegExp(escSeq + "((?:.|\n)*?)" + escSeq, "g");

      this.src = this.src.replace(/^\n+/,'');

      // set escaping for all that must be escaped
      this.src = this.src.replace(escapeSeqReplacer, "$`<notextile>$1</notextile>$'");

      while (this.src.length) {
        for (i = 0; i < blockTypes.length; i++) {
          if (blockTypes[i].match.apply(this)) {
            blockTypes[i].run.apply(this);
            break;
          }
        }

        if (i === blockTypes.length)
          throw(new Error(
            "Error - couldn't match any block type for:\n\n" + this.src
          ));

        this.out += '\n\n';
        this.src = this.src.replace(/^\n+/,'');
      }

      return this.out.trim();
    },

    getBlock: function () {
      var i, block;
      i = this.src.search('\n\n');
      if (i ==- 1) i = this.src.length;
      block = this.src.slice(0,i).trim();
      this.src = this.src.slice(i+2);
      return block;
    },

    getLine: function () {
      var i = this.src.search('\n'), line;
      if (i ==- 1) i = this.src.length;
      line = this.src.slice(0,i).trim();
      this.src = this.src.slice(i+1);
      return line;
    },

    footnoteID: function (n) {
      if (!this.footnotes[n])
        this.footnotes[n] = 'fn' + (Math.random() + '').slice(2) + (new Date()).getTime();

      return this.footnotes[n];
    },

    convertSpan: function (span) {
      var nspan = [span], i, j, res;

      //do phrase modifiers
      for (i = 0; i < phraseTypes.length; i++) {
        for (j = 0; j < nspan.length; j += 2) {
          res = phraseTypes[i].call(this, nspan[j]);

          if (res.length) {
            nspan[j] = '';
            nspan = this.joinPhraseBits(nspan, res, j+1);
          }
        }
      }

      //convert glyphs
      for (i = 0;i < nspan.length; i += 2) {
        nspan[i] = this.convertGlyphs(nspan[i]);
      }

      return nspan.join('');
    },

    joinPhraseBits: function (arr1,arr2,index) {
      if (!arr1.length) return arr2;
      index = Math.min(index, arr1.length);

      if (index % 2) {
        arr1[index-1] += arr2[0];
        arr2 = arr2.slice(1);
      }

      if (arr2.length % 2 && index < arr1.length &&  arr2.length>1) {
        arr1[index] += arr2[arr2.length-1];
        arr2 = arr2.slice(0, -1);
      }

      return arr1.slice(0, index).concat(arr2, arr1.slice(index));
    },

    convertGlyphs: function (txt) {
      var i, bits;
      for (i = 0; i < glyphRules.length; i++) {
        txt = txt.replace(glyphRules[i][0], glyphRules[i][1]);
      }

      //escape < and >
      bits = txt.split(/(<[^<]+?>)/);
      for (i = 0; i < bits.length; i += 2)
        bits[i] = bits[i].replace('<','&#60;').replace('>','&#62;');

      txt = bits.join('');
      return txt;
    },

    makeTag: function (tagName,attr) {
      var open = '<' + tagName, single, close;

      for (var x in attr)
        if (attr.hasOwnProperty(x))
          if (attr[x])
            open += ' ' + x + '="' + attr[x] + '"';

      single = open + ' />';
      open += '>';
      close = '</' + tagName + '>';

      return {
        single: single,
        open: open,
        close: close,
        name: tagName
      };
    }
  };

  /**
   * Takes in raw textile source and outputs as html.
   *
   * @param  {String} src     Textile source to be converted
   * @param  {Object} options Options object *optional*
   * @return {String}         HTML Output
   */
  var textile = function (src, options) {
    var tc = new TextileConverter(src, options);
    return tc.convert();
  };

  var phraseTypes = textile.phraseTypes = [];
  var blockTypes = textile.blockTypes = [];
  var para = TextileConverter.prototype.makeTag('p');
  var blocks = ['h1','h2','h3','h4','h5','h6','p','div'];

  // Regular Expressions
  var re = {};

  re.attr = {
    expr: /((?:<|>|=|<>|\(+(?!\w)|\)+|(?:\([^#\)]*(?:#(?:[a-zA-Z]+[_a-zA-Z0-9\-:.]*))?\))|\{.*?\}|\[.*?\])+)/,
    align: {
      expr: /<>|<|>|=/,
      values: {
        "<": "left",
        ">": "right",
        "<>": "justify",
        "=": "center"
      }
    },

    padding: {
      left: /\(/g,
      right: /\)/g
    },

    selector: {
      multiple: /\(([^\(#\)]*)(?:#([a-zA-Z]+[_a-zA-Z0-9\-:.]*))?\)/g,
      single: new RegExp((/\(([^\(#\)]*)(?:#([a-zA-Z]+[_a-zA-Z0-9\-:.]*))?\)/g).source)
    },

    style: /\{(.*?)\}/,
    language: /\[(.*?)\]/
  };

  re.tags = {
    simple: /<[^<]+?>/g,
    inline: 'a abbr acronym b bdo big br cite code dfn em i img input kbd label q samp select small span strong sub sup textarea tt var notextile'.split(' ')
  };

  re.punctuation = {
    expr: /[!\"#$%&\'()*+,\-.\/:;<=>?@\[\\\]\^_`{|}~]/,
    string: '\\.,"\'?!;:'
  };

  re.phrase = {
    alt: /(?:^|([\s(>])|\[|\{)==(.*?)==(?:([\s)])|$|\]\})?/gm,
    caps: /<span class="caps">([A-Z][A-Z'\-]+[A-Z])<\/span>|\b([A-Z][A-Z'\-]+[A-Z])(?=[\s.,\)>]|$)/gm,
    code: /(?:^|([\s(>])|\[|\{)@(.*?)@(?:([\s)])|$|\]|\})?/gm,
    footnote: /(^|\S)\[(\d+)\]([\s\.,;:?!'"]|$)/g,
    html: /<code>((?:.|\n)*?)<\/code>/gm,
    raw: /<notextile>((?:.|\n)*?)<\/notextile>/gm
  };

  re.block = {
    single: new RegExp('^(' + blocks.join('|') + ')' + re.attr.expr.source + '?.(.)? '),
    multiple: new RegExp('^[a-zA-Z][a-zA-Z0-9]*' + re.attr.expr.source + '?\\.+ '),
    quote: new RegExp('^bq'+re.attr.expr.source+'?\\.(\\.)?(?::(\\S+))? '),
    code: new RegExp('^bc'+re.attr.expr.source+'?\\.(\\.)? ')
  };

  re.link = /(?:^|([\s(>])|\[|\{)"(.*?)(?:\((.*)\))?":(\S+?)(?:$|([\s),!?;]|\.(?:$|\s))|\]|\})/g;
  re.image = /(?:^|([\s(>])|\[|\{)!(.*?)(?:\((.*)\))?!(?::(\S+))?(?:$|([\s)])|\]|\})/g;

  re.list = {
    expr: new RegExp('^([\\*\\#]+)' + re.attr.expr.source + '? '),
    item: TextileConverter.prototype.makeTag('li')
  };

  re.table = {
    expr: new RegExp('^(table' + re.attr.expr.source + '?\\. *\\n)?((' + re.attr.expr.source + '?\\. )?\\|.*\\|\\n?)+(?:\\n\\n|$)'),
    row: new RegExp('^(?:' + re.attr.expr.source + '?\\. )?\\|.*\\|(?:\\n|$)'),
    cell: new RegExp('^(_)?(\\^|-|~)?(?:\\\\(\\d+))?(?:/(\\d+))?' + re.attr.expr.source + '?\\. ')
  };

  re.footnote = new RegExp('^fn(\\d+)' + re.attr.expr.source + '?\\.(\\.)? ');
  re.pre = new RegExp('^pre' + re.attr.expr.source + '?\\.(\\.)? ');
  re.raw = new RegExp('^notextile' + re.attr.expr.source + '?\\.(\\.)? ');

  re.html = {
    pre: /^<pre((?:\s+\w+(?:\s*=\s*(?:".*?"|'.*?'|[^'">\s]+))?)+\s*|\s*)>((?:.|\n(?!\n))*)<\/pre>(?:\n\n|$)/,
    expr: /^<(\w+)((\s+\w+(\s*=\s*(?:".*?"|'.*?'|[^'">\s]+))?)+\s*|\s*)>(.|\n(?!\n))*<\/\1>(\n\n|$)/
  };

  // Regular Expressions
  var glyphRules = [
    [ // Newlines
      new RegExp("(\\n|\\r\\n)(?! )", 'g'),
      "<br />$1"
    ],

    [ // Apostrophes
      new RegExp("(\\w)'(\\w)", 'g'),
      "$1&#8217;$2"
    ],

    [ // Abbreviated Years
      new RegExp("(\\s)'(\\d+\\w?)\b(?!')", 'g'),
      "$1&#8217;$2"
    ],

    [ // Single Closing Quote
      new RegExp("(\\S)\'(?=\\s|"+re.punctuation.expr.source+"|<|$)",'g'),
      "$1&#8217;"
    ],

    [ // Single Quote Opening
      new RegExp("'", 'g'),
      "&#8216;"
    ],

    [ // Double Closing Quote
      new RegExp('(\\S)"(?=\\s|'+re.punctuation.expr.source+'|<|$)','g'),
      "$1&#8221;"
    ],

    [ // Double quote opening
      new RegExp("\"", 'g'),
      "&#8220;"
    ],

    [ // Acronym with a definition
      new RegExp("\\b([A-Z][A-Z0-9]{2,})\\b(?:\\(([^\\)]*)\\))", 'g'),
      "<acronym title=\"$2\"><span class=\"caps\">$1</span></acronym>"
    ],

    [ // Ellipses
      new RegExp("\\b( ?)\\.{3}", 'g'),
      "$1&#8230;"
    ],

    [ // EM Dash
      new RegExp("(\\s?)--(\\s?)", 'g'),
      "$1&#8212;$2"
    ],

    [ // EN Dash
      new RegExp("(\\s?)-(?:\\s|$)", 'g'),
      " &#8211; "
    ],

    [ // Times Symbol
      new RegExp("(\\d)( ?)x( ?)(?=\\d)", 'g'),
      "$1$2&#215;$3"
    ],

    [ // Trademark Sign
      new RegExp("\\(TM\\)", 'gi'),
      "&#8482;"
    ],

    [ // Registered Trademark Sign
      new RegExp("\\(R\\)", 'gi'),
      "&#174;"
    ],

    [ // Copyright Sign
      new RegExp("\\(C\\)", 'gi'),
      "&#169;"
    ]
  ];

  //parse an attribute-modifier string into an attributes object
  function getAttributes (attr) {
    var opt = {
      style: ''
    };

    if (!attr) return opt;
    var paddingLeft = 0, paddingRight = 0, m, style, n, j = 0;

    if (m = re.attr.style.exec(attr)) {
      style = m[1];

      if (style.length && !/;$/.test(style))
        style += ';';

      opt['style'] = style;
    }

    if (m = attr.match(re.attr.padding.left))
      paddingLeft += m.length;

    if (m = attr.match(re.attr.padding.right))
      paddingRight += m.length;

    if (m = attr.match(re.attr.selector.multiple)) {
      n = m.length;
      // for (var j=0;j<n && m[j].length==2;j++) {}

      if (j < n && m[j].length == 2) j = n + 1;
      if (j < n) {
        m = re.attr.selector.single.exec(m[j]);

        if (m[1] || m[2]) paddingLeft -= (n - j), paddingRight -= (n - j);
        if (m[1]) opt['class'] = m[1];
        if (m[2]) opt.id = m[2];
      }
    }

    if (m = re.attr.language.exec(attr))
      opt['lang'] = m[1];

    if (paddingLeft > 0)
      opt['style'] += 'padding-left:' + paddingLeft + 'em;';

    if (paddingRight > 0)
      opt['style'] += 'padding-right:' + paddingRight + 'em;';

    if (m = re.attr.align.expr.exec(attr))
      opt['style'] += 'text-align:' + re.attr.align.values[m[0]] + ';';

    return opt;
  }

  function makeNormalPhraseType (start,tagName,protectContents) {
    return function (text) {
      var out = [], m, pre, post, attr, tag, bit, content;
      var res = new RegExp(
        '(?:^|\\{|\\[|([' + re.punctuation.string +
          ']|\\s|>))' + start +
          '(?:' + re.attr.expr.source +
          ' ?)?([^\\s' + start +
          ']+|\\S[^' + start +
          '\\n]*[^\\s' + start +
          '\\n])' + start +
          '(?:$|[\\]}]|(' + re.punctuation.expr.source +
        '{1,2}|\\s))', 'g'
      );

      while (m = res.exec(text)) {
        pre = m[1] || '';
        post = m[4] || '';
        attr = getAttributes(m[2]);
        tag = this.makeTag(tagName, attr);
        bit = [text.slice(0,m.index) + pre,post];

        if (protectContents) {
          content = this.escapeHTML(m[3]);
          bit.splice(1, 0, tag.open + content + tag.close);
        } else bit.splice(1, 0, tag.open, m[3], tag.close);

        out = this.joinPhraseBits(out, bit, out.length);
        text = text.slice(res.lastIndex);
        res.lastIndex = 0;
      }

      if (out.length) out[out.length-1]+=text;
      return out;
    };
  }

  // Todo: Move these .push elements to an object and iterate.
  phraseTypes.push(makeNormalPhraseType('\\*\\*', 'b'));
  phraseTypes.push(makeNormalPhraseType('__',     'i'));
  phraseTypes.push(makeNormalPhraseType('\\*',    'strong'));
  phraseTypes.push(makeNormalPhraseType('_',      'em'));
  phraseTypes.push(makeNormalPhraseType('\\?\\?', 'cite'));
  phraseTypes.push(makeNormalPhraseType('\\-',    'del'));
  phraseTypes.push(makeNormalPhraseType('\\+',    'ins'));
  phraseTypes.push(makeNormalPhraseType('\\%',    'span'));
  phraseTypes.push(makeNormalPhraseType('~',      'sub'));
  phraseTypes.push(makeNormalPhraseType('\\^',    'sup'));
  phraseTypes.push(function (text) {
    var out = [], m, pre, post, bit;

    while (m = re.phrase.code.exec(text)) {
      pre = m[1] || '';
      post = m[3] || '';
      bit = [text.slice(0, m.index) + pre, '<code>' + this.escapeHTML(m[2]) + '</code>',post];
      out = this.joinPhraseBits(out,bit,out.length);
      text = text.slice(re.phrase.code.lastIndex);
      re.phrase.code.lastIndex = 0;
    }

    if (out.length) out[out.length-1] += text;
    return out;
  });

  phraseTypes.push(function (text) {
    var out = [], m, pre, post, bit;

    while (m = re.phrase.alt.exec(text)) {
      pre = m[1] || '';
      post = m[3] || '';
      bit = [text.slice(0,m.index)+pre,m[2],post];
      out = this.joinPhraseBits(out,bit,out.length);
      text = text.slice(re.phrase.alt.lastIndex);
      re.phrase.alt.lastIndex = 0;
    }

    if (out.length) out[out.length-1] += text;
    return out;
  });

  phraseTypes.push(function (text) {
    var out = [], m, pre, post, attr, tag, bit;

    while (m = re.link.exec(text)) {
      pre = m[1] || '';
      post = m[5] || '';

      attr = {
        href: m[4],
        title: m[3]
      };

      tag = this.makeTag('a',attr);
      bit = [text.slice(0,m.index)+pre,tag.open,m[2],tag.close,post];
      out = this.joinPhraseBits(out,bit,out.length);
      text = text.slice(re.link.lastIndex);
      re.link.lastIndex = 0;
    }

    if (out.length) out[out.length-1] += text;
    return out;
  });

  phraseTypes.push(function (text) {
    var out = [], m, pre, post, attr, img, tag, bit;

    while (m = re.image.exec(text)) {
      pre = m[1] || '';
      post = m[5] || '';

      attr = {
        src: m[2],
        title: m[3],
        alt: m[3]
      };

      img = this.makeTag('img',attr).single;

      if (m[4]) {
        tag = this.makeTag('a',{href:m[4]});
        img = tag.open+img+tag.close;
      }

      bit = [text.slice(0,m.index)+pre,img,post];
      out = this.joinPhraseBits(out,bit,out.length);
      text = text.slice(re.image.lastIndex);
      re.image.lastIndex = 0;
    }

    if (out.length) out[out.length-1] += text;
    return out;
  });

  phraseTypes.push(function (text) {
    var out = [], m, pre, post, fn, tag, bit;

    while (m = re.phrase.footnote.exec(text)) {
      pre = m[1] || '';
      post = m[3] || '';
      fn = this.footnoteID(m[2]);
      tag = this.makeTag('a',{href:'#'+fn});
      bit = [text.slice(0,m.index)+pre,'<sup class="footnote">'+tag.open+m[2]+tag.close+'</sup>',post];
      out = this.joinPhraseBits(out,bit,out.length);
      text = text.slice(re.phrase.footnote.lastIndex);
      re.phrase.footnote.lastIndex = 0;
    }

    if (out.length) out[out.length-1] += text;
    return out;
  });

  phraseTypes.push(function (span) {
    var m, nspan = [], bit, tag;

    while (m = re.phrase.html.exec(span)) {
      bit = span.slice(0,m.index);
      tag = '<code>'+this.escapeHTML(m[1])+'</code>';
      span = span.slice(re.phrase.html.lastIndex);
      bit = this.convertGlyphs(bit);
      nspan = this.joinPhraseBits(nspan,[bit,tag],nspan.length+1);
      re.phrase.html.lastIndex = 0;
    }

    if (nspan.length) nspan.push(span);
    return nspan;
  });

  phraseTypes.push(function (span) {
    var m, nspan = [], bit, tag;

    while (m = re.phrase.raw.exec(span)) {
      bit = span.slice(0,m.index);
      tag = m[1];
      span = span.slice(re.phrase.raw.lastIndex);
      bit = this.convertGlyphs(bit);
      nspan = this.joinPhraseBits(nspan,[bit,tag],nspan.length+1);
      re.phrase.raw.lastIndex = 0;
    }

    if (nspan.length) nspan.push(span);
    return nspan;
  });

  phraseTypes.push(function (span) {
    var m, nspan = [], bit, tag;

    while (m = re.phrase.caps.exec(span)) {
      bit = span.slice(0,m.index);
      span = span.slice(re.phrase.caps.lastIndex);
      bit = this.convertGlyphs(bit);
      tag = m[1] ? m[0] : '<span class="caps">' + m[2] + '</span>';
      nspan = this.joinPhraseBits(nspan,[bit,tag],nspan.length+1);
      re.phrase.caps.lastIndex = 0;
    }

    if (nspan.length) nspan.push(span);
    return nspan;
  });

  //separate out HTML tags so they don't get escaped
  //this should be the last phrase type
  phraseTypes.push(function (span) {
    var m, nspan = [], bit, tag;

    while (m = re.tags.simple.exec(span)) {
      bit = span.slice(0,m.index);
      tag = span.slice(m.index,re.tags.simple.lastIndex);
      span = span.slice(re.tags.simple.lastIndex);
      bit = this.convertGlyphs(bit);
      nspan = this.joinPhraseBits(nspan, [bit, tag], nspan.length + 1);
      re.tags.simple.lastIndex = 0;
    }

    if (nspan.length) nspan.push(span);
    return nspan;
  });

  var list = {
    match: function () {
      return re.list.expr.test(this.src);
    },

    run: function () {
      var m, line, attr, level = 0, tag, tags = [], tagName, llevel, listType = '', o;

      while (m = this.src.match(re.list.expr)) {
        m = this.src.match(re.list.expr);
        listType = m[1];
        tagName = listType[listType.length-1] === '#' ? 'ol' : 'ul';
        llevel = listType.length;

        while (llevel < level) {
          this.out += re.list.item.close + '\n' + tag.close;
          o = tags.pop() || {level: 0};
          level = o.level;
          tag = o.tag;
        }

        if (llevel === level && tag && tagName !== tag.name) {
          this.out += re.list.item.close + tag.close + '\n';
          o = tags.pop() || {level: 0};
          level = o.level;
          tag = o.tag;
        }

        //definitely in a state where either current line is deeper nesting or same level as previous <li>
        if (level > 0) {
          if (llevel === level)
            this.out += re.list.item.close;

          this.out += '\n';
        }

        if (llevel > level || m[2]) {
          if (tag)
            tags.push({level: level, tag: tag});

          attr = getAttributes(m[2]);
          tag = this.makeTag(tagName,attr);
          level = llevel;
          this.out += tag.open + '\n';
        }

        this.src = this.src.slice(m[0].length);
        line = this.getLine();
        line = this.convertSpan(line);
        this.out += re.list.item.open + line;
      }

      this.out += re.list.item.close + '\n';

      while (tags.length) {
        this.out += tag.close + re.list.item.close + '\n';
        tag = tags.pop().tag;
      }

      this.out += tag.close;
    }
  };

  var table = {
    match: function () { return re.table.expr.test(this.src); },
    run: function () {
      var m = re.table.expr.exec(this.src);
      var attr, tableTag, rowTag, line, cells, l, cell, tagName, tag, i;

      if (m[1]) {
        attr = getAttributes(m[2]);
        tableTag = this.makeTag('table',attr);
        this.getLine();
      } else tableTag = this.makeTag('table');

      this.out += tableTag.open+'\n';
      while (m = re.table.row.exec(this.src)) {
        if (m[1]) {
          attr = getAttributes(m[1]);
          rowTag = this.makeTag('tr',attr);
        } else rowTag = this.makeTag('tr');

        this.out += rowTag.open+'\n';
        line = this.getLine();
        cells = line.split('|');
        l = cells.length;

        for (i = 1; i < (l - 1); i++) {
          cell = cells[i];

          if (m = re.table.cell.exec(cell)) {
            cell = cell.slice(m[0].length);
            attr = getAttributes(m[5]);
            tagName = m[1] ? 'th' : 'td';

            switch (m[2]) {
              case '^': attr.style += 'vertical-align:top;'; break;
              case '-': attr.style += 'vertical-align:middle;'; break;
              case '~': attr.style += 'vertical-align:bottom;'; break;
            }

            if (m[3]) attr.colspan = m[3];
            if (m[4]) attr.rowspan = m[4];
            tag = this.makeTag(tagName,attr);
          } else tag = this.makeTag('td');
          cell = this.convertSpan(cell);
          this.out += tag.open + cell + tag.close + '\n';
        }

        this.out += rowTag.close + '\n';
      }

      this.out += tableTag.close;
    }
  };

  var footnote = {
    match: function () {
      return re.footnote.test(this.src);
    },

    run: function () {
      var m, n, attr, tag, carryon, block;
      m = this.src.match(re.footnote);
      n = parseInt(m[1], 10);
      attr = getAttributes(m[2]);
      attr.id = this.footnoteID(n);
      attr['class'] = 'footnote';
      tag = this.makeTag('p',attr);
      carryon = m[3] !== undefined;
      this.src = this.src.slice(m[0].length);
      block = this.convertSpan(this.getBlock());
      this.out += tag.open+'<sup>' + n + '</sup> ' + block + tag.close;

      if (carryon) {
        block = undefined;
        while (this.src.length && !re.block.multiple.test(this.src)) {
          block = this.convertSpan(this.getBlock());
          this.out += '\n' + tag.open + block + tag.close;
        }
      }
    }
  };

  var blockquote = {
    match: function () {
      return re.block.quote.test(this.src);
    },

    run: function () {
      var m, attr, tag, btag, carryon, block;
      m = this.src.match(re.block.quote);
      attr = getAttributes(m[1]);
      tag = this.makeTag('p',attr);
      if (m[3]) if (attr) attr.cite = m[3];
      btag = this.makeTag('blockquote',attr);
      carryon = m[2] !== undefined;
      this.src = this.src.slice(m[0].length);
      block = this.getBlock();
      block = this.convertSpan(block);
      this.out += btag.open + '\n' + tag.open + block + tag.close;

      if (carryon) {
        block = undefined;
        while (this.src.length && !re.block.multiple.test(this.src)) {
          block = this.convertSpan(this.getBlock());
          this.out += '\n' + tag.open + block + tag.close;
        }
      }

      this.out += '\n' + btag.close;
    }
  };

  var blockcode = {
    match: function () {
      return re.block.code.test(this.src);
    },

    run: function () {
      var m, attr, tag, btag, carryon, block;
      m = this.src.match(re.block.code);
      attr = getAttributes(m[1]);
      tag = this.makeTag('code',attr);
      if (m[3]) if(attr) attr.cite = m[3];
      btag = this.makeTag('pre',attr);
      carryon = m[2] !== undefined;
      this.src = this.src.slice(m[0].length);
      block = this.options.highlight(this.escapeHTML(this.getBlock()));
      this.out += btag.open + tag.open + block + '\n' + tag.close;

      if (carryon) {
        block = undefined;
        while (this.src.length && !re.block.multiple.test(this.src)) {
          block = this.options.highlight(this.escapeHTML(this.getBlock()));
          this.out += '\n' + tag.open + block + '\n' + tag.close;
        }
      }

      this.out += btag.close;
    }
  };

  var preBlock = {
    match: function () {
      return re.pre.test(this.src);
    },

    run: function () {
      var m, attr, tag, carryon, block;
      m = re.pre.exec(this.src);
      this.src = this.src.slice(m[0].length);
      attr = getAttributes(m[1]);
      tag = this.makeTag('pre',attr);
      carryon = m[2] !== undefined;
      block = this.getBlock();

      if (carryon) while (this.src.length && !re.block.multiple.test(this.src)) {
        block += '\n\n' + this.getBlock();
      }

      block = this.escapeHTML(block);
      this.out += tag.open + block + '\n' + tag.close;
    }
  };

  var notextile = {
    match: function () {
      return re.raw.test(this.src);
    },

    run: function () {
      var m, carryon, block;
      m = this.src.match(re.raw);
      carryon = m[2] !== undefined;
      this.src = this.src.slice(m[0].length);
      block = this.getBlock();
      this.out += block;

      if (carryon) {
        block = undefined;
        while (this.src.length && !re.block.multiple.test(this.src)) {
          block = this.getBlock();
          this.out += '\n\n' + block;
        }
      }
    }
  };

  var normalBlock = {
    match: function () {
      return re.block.single.test(this.src);
    },

    run: function () {
      var m, n, tagName, attr, tag, carryon, block;
      m = this.src.match(re.block.single);
      tagName = m[1];
      attr = getAttributes(m[2]);
      tag = this.makeTag(tagName,attr);
      carryon = m[3] !== undefined;
      this.src = this.src.slice(m[0].length);
      block = this.convertSpan(this.getBlock());
      this.out += tag.open + block + tag.close;

      if (carryon) {
        block = undefined;
        while (this.src.length && !re.block.multiple.test(this.src)) {
          block = this.convertSpan(this.getBlock());
          this.out += '\n' + tag.open + block + tag.close;
        }
      }
    }
  };

  var preHTMLBlock = {
    match: function () {
      return re.html.pre.test(this.src);
    },

    run: function () {
      var m, attr, code;
      m = re.html.pre.exec(this.src);
      this.src = this.src.slice(m[0].length);
      attr = m[1];
      code = this.escapeHTML(m[2]);
      this.out += '<pre' + attr + '>' + this.options.highlight(code) + '</pre>';
    }
  };

  var htmlBlock = {
    match: function () {
      var m = this.src.match(re.html.expr);
      if (m) return re.tags.inline.indexOf(m[1])==-1;
    },

    run: function () {
      var html = re.html.expr.exec(this.src)[0].trim();
      this.src = this.src.slice(html.length);
      this.out += html;
    }
  };

  var nowrapBlock = {
    match: function () {
      return this.src.match(/^ /);
    },

    run: function () {
      var block = this.convertSpan(this.getBlock());
      this.out += block;
    }
  };

  var plainBlock = {
    match: function () {
      return true;
    },

    run: function () {
      var block = this.convertSpan(this.getBlock());

      if (this.options.wrapBlocks)
        block = para.open + block + para.close;

      this.out += block;
    }
  };

  blockTypes.push(list);
  blockTypes.push(table);
  blockTypes.push(footnote);
  blockTypes.push(blockquote);
  blockTypes.push(blockcode);
  blockTypes.push(preBlock);
  blockTypes.push(notextile);
  blockTypes.push(normalBlock);
  blockTypes.push(preHTMLBlock);
  blockTypes.push(htmlBlock);
  blockTypes.push(nowrapBlock);
  blockTypes.push(plainBlock);

  //HTML characters should be escaped
  var htmlEscapes = [
    '&', '&#38;',
    '<', '&#60;',
    '>', '&#62;',
    "'", '&#39;',
    '"', '&#34;'
  ];

  var i;
  for (i = 0; i < htmlEscapes.length; i += 2)
    htmlEscapes[i] = new RegExp(htmlEscapes[i],'g');
  TextileConverter.prototype.escapeHTML = function (html) {
    for (i = 0; i < htmlEscapes.length; i += 2)
      html = html.replace(htmlEscapes[i],htmlEscapes[i+1]);
    return html;
  };

  return textile;
}));
