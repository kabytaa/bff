/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accounts from "../accounts.js";
import type * as backoffice from "../backoffice.js";
import type * as businessEnvironments from "../businessEnvironments.js";
import type * as customerAuth from "../customerAuth.js";
import type * as http from "../http.js";
import type * as lib_authorization from "../lib/authorization.js";
import type * as lib_businessEnvironment from "../lib/businessEnvironment.js";
import type * as lib_businessEnvironmentView from "../lib/businessEnvironmentView.js";
import type * as lib_customerConfiguration from "../lib/customerConfiguration.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_serviceMetadata from "../lib/serviceMetadata.js";
import type * as memberships from "../memberships.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accounts: typeof accounts;
  backoffice: typeof backoffice;
  businessEnvironments: typeof businessEnvironments;
  customerAuth: typeof customerAuth;
  http: typeof http;
  "lib/authorization": typeof lib_authorization;
  "lib/businessEnvironment": typeof lib_businessEnvironment;
  "lib/businessEnvironmentView": typeof lib_businessEnvironmentView;
  "lib/customerConfiguration": typeof lib_customerConfiguration;
  "lib/errors": typeof lib_errors;
  "lib/serviceMetadata": typeof lib_serviceMetadata;
  memberships: typeof memberships;
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
  FunctionReference<any, "public">
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
  FunctionReference<any, "internal">
>;

export declare const components: {};
