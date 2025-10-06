CDN like never before

## Usage

Include the loader, then annotate elements with a `cdn` attribute. The loader will resolve a commit SHA via the GitHub API and replace `cdn` with `src` or `href` automatically.

```html
<script src="/scripts/cdns.js"></script>

<!-- script -->
<script cdn="user/repo/path/to/file.js lg=0"></script>

<!-- stylesheet -->
<link rel="stylesheet" cdn="user/repo/path/to/styles.css lg=1">

<!-- image -->
<img cdn="user/repo/assets/logo.png lg=0">
```

## Attribute format

- **cdn**: `{user}/{repo}/{path} [lg=0|1] [ref=branch|tag] [sha=commit]`
  - **lg**: Use `lg=0` for under 25mb and use `lg=1` for assets over 25 MB.
  - **ref**: branch or tag to resolve the latest commit from (e.g., `ref=main`).
  - **sha**: explicit commit SHA; skips GitHub lookup.


## Notes

- Works for `script`, `img`, and `link[rel=stylesheet]` (uses `src` or `href` accordingly).
- Observes the DOM for dynamically added nodes and `cdn` attribute changes.
- Caches commit SHAs per `{user}/{repo}` and `ref` to reduce API calls.
- If the commit cannot be resolved, the element is left unchanged.


