import { imageSize } from 'image-size';
import { fail } from './productErrors';
import { validateArtworkPixels } from './validateArtwork';

export interface ReferenceImage {
  readonly bytes: ArrayBuffer;
  readonly mimeType: 'image/png' | 'image/jpeg';
}
export function validateReferenceImage(reference: ReferenceImage): void {
  try {
    const bytes = new Uint8Array(reference.bytes);
    if (bytes.length === 0 || bytes.length > 512 * 1024)
      throw new Error('Size');
    const size = imageSize(bytes);
    if (
      size.width > 512 ||
      size.height > 512 ||
      size.width < 1 ||
      size.height < 1 ||
      size.type !== (reference.mimeType === 'image/png' ? 'png' : 'jpg') ||
      (size.orientation !== undefined && size.orientation !== 1)
    )
      throw new Error('Dimensions');
    validateArtworkPixels(bytes, reference.mimeType, size.width, size.height);
  } catch {
    fail(
      'INVALID_INPUT',
      'Choose a static PNG or JPEG style reference, up to 512 × 512 pixels and 512 KiB.',
    );
  }
}

export async function cloudflareImages(
  prompt: string,
  reference?: ReferenceImage,
) {
  const address = process.env.TABLECARDS_CLOUDFLARE_AI_URL?.trim();
  const secret = process.env.TABLECARDS_CLOUDFLARE_AI_SECRET?.trim();
  if (!address || !secret || new URL(address).protocol !== 'https:')
    fail('PROVIDER_UNAVAILABLE', 'Image generation is unavailable');
  const images = [];
  // Bounded concurrency and fixed geometry/model keep the daily budget calculable.
  for (let pair = 0; pair < 2; pair += 1) {
    images.push(
      ...(await Promise.all(
        [0, 1].map(async (variant) => {
          const response = await fetch(address, {
            method: 'POST',
            redirect: 'error',
            signal: AbortSignal.timeout(65_000),
            headers: {
              authorization: `Bearer ${secret}`,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              prompt: `Flat print-ready 7:4 place-card background illustration, not a photograph of a card. Pure white paper with an empty white central 70% for readable names. Rich but restrained illustrated motifs near the corners only, no central objects, no text, letters, numbers, watermarks or borders. ${reference ? 'Use image 0 as inspiration for its company palette, icon and visual style; adapt its motifs to the corners, not as a central logo. ' : ''}Style request: ${prompt}. Variation ${pair * 2 + variant + 1}: ${['delicate watercolor', 'airy hand-painted detail', 'refined botanical illustration', 'elegant minimal ornament'][pair * 2 + variant]}.`,
              seed: Math.floor(Math.random() * 2_147_483_647),
              ...(reference
                ? {
                    reference: {
                      mimeType: reference.mimeType,
                      base64: Buffer.from(reference.bytes).toString('base64'),
                    },
                  }
                : {}),
            }),
          });
          if (!response.ok)
            fail(
              'PROVIDER_UNAVAILABLE',
              'Cloudflare image generation is temporarily unavailable',
            );
          const body = (await response.json()) as { image?: string };
          if (
            typeof body.image !== 'string' ||
            body.image.length > 12_000_000 ||
            !/^[A-Za-z0-9+/]+={0,2}$/u.test(body.image)
          )
            fail(
              'PROVIDER_UNAVAILABLE',
              'The image provider returned an invalid image',
            );
          const bytes = new Uint8Array(Buffer.from(body.image, 'base64'));
          const dimensions = imageSize(bytes);
          if (
            !['png', 'jpg'].includes(dimensions.type ?? '') ||
            dimensions.width !== 1344 ||
            dimensions.height !== 768
          )
            fail(
              'PROVIDER_UNAVAILABLE',
              'The image provider dimensions were invalid',
            );
          const mimeType =
            dimensions.type === 'png'
              ? ('image/png' as const)
              : ('image/jpeg' as const);
          validateArtworkPixels(
            bytes,
            mimeType,
            dimensions.width,
            dimensions.height,
          );
          return {
            bytes,
            mimeType,
            width: dimensions.width,
            height: dimensions.height,
          };
        }),
      )),
    );
  }
  return images;
}
