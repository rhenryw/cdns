CDN like never before

## Usage

Add:

```html
<script src="https://cdn.jsdelivr.net/gh/rhenryw/cdns@main/scripts/cdns.js"></script>
```

between `<head>` and `</head>` in your html.

Then use like so:

```html
<img cdn="rhenryw/lupine/public/tinyTitle.png lg=1 ref=main">
```

or

```html
<script cdn="rhenryw/cdns/scripts/cdns.js lg=0 ref=main sha=7478a1bc5c898948999d6a2b67f68bde476b9e52">
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


