// Minimal esbuild plugin replicating the official build's CSS-modules handling:
// - maps each `.module.css` class name to itself (no localIdentName hashing)
// - injects the stylesheet as a <style> tag into document.head at runtime
// This matches lib/client.js, which inlines styles via createElement("style").
const fs = require('fs');

module.exports = {
  name: 'css-modules-inject',
  setup(build) {
    build.onLoad({ filter: /\.module\.css$/ }, (args) => {
      const source = fs.readFileSync(args.path, 'utf8');

      // Collect class names used in selectors (.name, ,.name, .a.b, [data-x] etc.)
      const names = [];
      const re = /(^|[,\s{>+~:)(])\.([A-Za-z0-9_\-\[\]=:#]+)/g;
      let m;
      while ((m = re.exec(source)) !== null) {
        if (names.indexOf(m[2]) === -1) names.push(m[2]);
      }
      const mapEntries = names.map((n) => `${JSON.stringify(n)}: ${JSON.stringify(n)}`).join(', ');

      // Emit JS that injects the style tag and exports the class-name map.
      const js = [
        'const __css__ = ' + JSON.stringify(source) + ';',
        '(function(){ try { if (typeof document !== "undefined") { var s = document.createElement("style"); s.setAttribute("data-weather-css","1"); s.textContent = __css__; (document.head || document.documentElement).appendChild(s); } } catch(e){} })();',
        'const classes = { ' + mapEntries + ' };',
        'export default classes;',
        '',
      ].join('\n');

      return { contents: js, loader: 'js' };
    });
  },
};
