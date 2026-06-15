import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readdirSync, renameSync, rmSync, existsSync } from 'fs';
import { render } from 'ejs';
import tailwindcss from '@tailwindcss/vite';

const pages = Object.fromEntries(
  readdirSync('src/pages')
    .filter(f => f.endsWith('.html'))
    .map(file => {
      const name = file.replace('.html', '');
      return [name, resolve(__dirname, 'src/pages', file)];
    })
);

const pageFiles = readdirSync('src/pages').filter(f => f.endsWith('.html'));

function devServerRewrite() {
  return {
    name: 'dev-rewrite',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const urlPath = req.url === '/' ? '/index.html' : req.url;
        const pageFile = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
        if (pageFiles.includes(pageFile)) {
          req.url = '/src/pages/' + pageFile;
        }
        next();
      });
    }
  };
}

function ejsPlugin() {
  return {
    name: 'ejs',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        return render(html, { title: '' }, { filename: ctx.filename });
      }
    }
  };
}

function flattenHtmlOutput() {
  return {
    name: 'flatten-html',
    enforce: 'post',
    closeBundle() {
      const srcDir = resolve(__dirname, 'dist/src/pages');
      if (!existsSync(srcDir)) return;
      const files = readdirSync(srcDir).filter(f => f.endsWith('.html'));
      for (const file of files) {
        renameSync(resolve(srcDir, file), resolve(__dirname, 'dist', file));
      }
      rmSync(resolve(__dirname, 'dist/src/pages'), { recursive: true, force: true });
      const srcParent = resolve(__dirname, 'dist/src');
      if (existsSync(srcParent) && readdirSync(srcParent).length === 0) {
        rmSync(srcParent, { recursive: true, force: true });
      }
    }
  };
}

export default defineConfig({
  plugins: [
    devServerRewrite(),
    ejsPlugin(),
    tailwindcss(),
    flattenHtmlOutput(),
  ],
  build: {
    rollupOptions: { input: pages },
    outDir: 'dist',
    emptyOutDir: true,
  },
  publicDir: 'public',
});
