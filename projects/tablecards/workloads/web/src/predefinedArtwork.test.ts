import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { DESIGN_IDS, getDesignDefinition } from '@tablecards/core';
import { imageSize } from 'image-size';
import { describe, expect, it } from 'vitest';

describe('predefined artwork catalog', () => {
  it.each(DESIGN_IDS)(
    '%s points to its exact reviewed 7:4 JPEG',
    async (id) => {
      const design = getDesignDefinition(id);
      const bytes = await readFile(
        resolve(
          'projects/tablecards/workloads/web/public',
          design.artwork.publicPath.slice(1),
        ),
      );
      const dimensions = imageSize(bytes);

      expect(dimensions).toMatchObject({
        type: 'jpg',
        width: design.artwork.width,
        height: design.artwork.height,
      });
      expect(dimensions.width * 4).toBe(dimensions.height * 7);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(
        design.artwork.sha256,
      );
    },
  );
});
