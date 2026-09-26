// Lets tests import .md files as strings, like esbuild's text loader.
module.exports = {
  process(src) {
    return { code: 'module.exports = ' + JSON.stringify(src) + ';' };
  },
};
