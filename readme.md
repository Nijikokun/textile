## Textile.js

  Converts textile documents to HTML.

## Install

    $ npm install textilejs

## Usage

```js
textile = require('textilejs'); // for node, others require the file.
textile(source, { /* options */ });
```

## Options

  - `wrapBlocks` **boolean**
    - `true` _default_ wraps basic blocks in paragraph tags.
    - `false` disables wrapping blocks in paragraph tags.
  - `highlight` **function** `function (code) { return yourHighlighter(code); }`
    - Allows highlighting of code if you wish using your own custom highlighting script.
    - _default_ no highlighting.
  - `escapeSequence` **string**
    - Allows to set custom formatting escape sequence - textile formatting will be disabled for a string, contained between two such tokens.
    - _default_ is `==`

## History

  Prior names include: `textiled` by Yulian Kuncheff, `jstextile` by Christian Perfect. 
  Both of these versions include bugs, bad coding habits and slight issues, not to knock them as without them this wouldn't exist. 

  With nothing in my pockets, I developed this version while sitting at Mashape offices, and some at a small quaint cafe named South Beach Cafe; 
  Fueled by expresso and motivated by a nice little band accidentally stumbled upon through spotify called Delta Spirit
