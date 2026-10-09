import {build} from 'esbuild';
await build({entryPoints:['src/worker.js'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',loader:{'.html':'text','.webp':'binary','.woff2':'binary','.png':'binary'}});
