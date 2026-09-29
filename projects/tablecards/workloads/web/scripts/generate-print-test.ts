import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { renderTableCardsPdf } from '@tablecards/core';

const outputPath = resolve(
  process.argv[2] ??
    'dist/projects/tablecards/workloads/web/six-card-landscape-print-test.pdf',
);

const artwork = await readFile(
  resolve(
    'projects/tablecards/workloads/web/public/designs/predefined/v2/garden-sage.jpg',
  ),
);
const bytes = await renderTableCardsPdf(
  {
    title: 'Six-card landscape print test',
    designId: 'garden-sage',
    layoutId: 'landscape_6',
    guests: [
      { name: 'Olivia Bennett', table: 'TABLE 1' },
      { name: 'José García', table: 'TABLE 2' },
      { name: 'Zoë Martin', table: 'TABLE 3' },
      { name: 'François Bernard', table: 'TABLE 4' },
      { name: 'Anaïs Dubois', table: 'TABLE 5' },
      { name: 'Björn Hansen', table: 'TABLE 6' },
    ],
  },
  {
    backgroundImage: {
      bytes: new Uint8Array(artwork),
      mimeType: 'image/jpeg',
    },
  },
);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, bytes);
