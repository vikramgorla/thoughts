// Small rehype plugin (no dependencies):
// - external links get rel="noopener" (they still open in the same tab)
// - images load lazily and decode asynchronously
const SITE_HOST = 'thoughts.vikram-gorla.com';

export default function rehypeLinksImages() {
  return (tree) => {
    const walk = (node) => {
      if (node.type === 'element') {
        const p = (node.properties ||= {});
        if (node.tagName === 'a' && typeof p.href === 'string' && /^https?:\/\//i.test(p.href)) {
          let host = '';
          try { host = new URL(p.href).hostname; } catch {}
          if (host && host !== SITE_HOST) {
            const rel = new Set([].concat(p.rel || []));
            rel.add('noopener');
            p.rel = [...rel];
          }
        }
        if (node.tagName === 'img') {
          p.loading ??= 'lazy';
          p.decoding ??= 'async';
        }
      }
      if (node.children) node.children.forEach(walk);
    };
    walk(tree);
  };
}
