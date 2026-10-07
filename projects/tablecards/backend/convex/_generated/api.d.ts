/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from '../ai.js';
import type * as aiState from '../aiState.js';
import type * as assets from '../assets.js';
import type * as designPresets from '../designPresets.js';
import type * as environment from '../environment.js';
import type * as exportState from '../exportState.js';
import type * as exports from '../exports.js';
import type * as files from '../files.js';
import type * as http from '../http.js';
import type * as lib_aiBudget from '../lib/aiBudget.js';
import type * as lib_cloudflareAi from '../lib/cloudflareAi.js';
import type * as lib_fileAddresses from '../lib/fileAddresses.js';
import type * as lib_productErrors from '../lib/productErrors.js';
import type * as lib_publicIds from '../lib/publicIds.js';
import type * as lib_validateArtwork from '../lib/validateArtwork.js';
import type * as productAccess from '../productAccess.js';
import type * as projects from '../projects.js';

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from 'convex/server';

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  aiState: typeof aiState;
  assets: typeof assets;
  designPresets: typeof designPresets;
  environment: typeof environment;
  exportState: typeof exportState;
  exports: typeof exports;
  files: typeof files;
  http: typeof http;
  'lib/aiBudget': typeof lib_aiBudget;
  'lib/cloudflareAi': typeof lib_cloudflareAi;
  'lib/fileAddresses': typeof lib_fileAddresses;
  'lib/productErrors': typeof lib_productErrors;
  'lib/publicIds': typeof lib_publicIds;
  'lib/validateArtwork': typeof lib_validateArtwork;
  productAccess: typeof productAccess;
  projects: typeof projects;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, 'public'>
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, 'internal'>
>;

export declare const components: {};
