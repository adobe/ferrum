#! /usr/bin/env node
const { argv, exit } = require('process');
const jsdoc = require('jsdoc-api');
const MarkdownIt = new require('markdown-it')().disable('link');
const { flat, map, isdef } = require('./src');

const extractFromMarkdown = function *(md) {
  for (const {type, tag, info, content} of MarkdownIt.parse(md)) {
    if (type === 'fence' && tag === 'code' && !info.match(/noeval/)) {
      yield content;
    }
  }
};

const extractFromDoc = function *(doc) {
  if (!isdef(doc.comment)) {
    return;
  }

  const [desc, ...tags] = doc.comment
    .replace(/^\/\*\*\s*\n?/m, '')
    .replace(/^\s*\*( |$)/gm, '')
    .replace(/\n?\s*\*\/$/, '')
    .split(/^\s*@/mg);

  yield* extractFromMarkdown(desc);
  for (const tag of tags) {
    const [type, body] = tag.split(/\s\s*/);
    if (!isdef(body)) {
      continue;
    }

    if (type === 'example') {
      yield body;
    } else {
      yield* extractFromMarkdown(body);
    }
  }
};

const main = async (...files) => {
  const doc = await jsdoc.explain({ access: 'all', files });
  for (const example of flat(map(doc, extractFromDoc))) {
    console.log('---');
    console.log(example);
  }
};

const init = async () => {
  try {
    await main(...argv.slice(2));
  } catch (e) {
    console.error("FATAL: Uncaught exception: ", e);
    exit(1);
  }
};

init();
