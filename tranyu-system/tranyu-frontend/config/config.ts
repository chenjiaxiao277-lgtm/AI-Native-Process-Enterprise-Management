import { defineConfig } from 'umi';
import routes from './routes';
import proxy from './proxy';

export default defineConfig({
  routes,
  npmClient: 'npm',
  history: { type: 'browser' },
  favicons: [],
  proxy: (proxy as any).dev,
});

