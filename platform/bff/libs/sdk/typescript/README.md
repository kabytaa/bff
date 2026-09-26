# `@tofler/bff-auth`

The TypeScript implementation of the public Business authentication contract.

- `core`: runtime-neutral state and public contract helpers.
- `browser`: tab-local session and account selection.
- `react`: React bindings and accessible authentication components.
- `server`: Web-standard `Request`/`Response` session adapter.
- `convex`: Convex HTTP and native-auth integration built on the same server
  contract.

Only the TypeScript/Convex path is currently supported. Future Node framework
glue belongs in this package; future Swift, Kotlin, Go, or Rust SDKs are sibling
technology implementations under `platform/bff/libs/sdk/`.
