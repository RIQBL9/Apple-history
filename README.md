# Apple History

An animated, scroll-driven timeline of Apple products, from the 1976 Apple I to the 2026 lineup.

- **184 products** across 7 eras, each with a release date and facts
- Scroll animations: parallax product images, 3D card reveals, a timeline spine that fills as you go, a rolling year counter and sliding chapter numbers
- Filter by product family, search, jump by decade, click any card for details
- Product photos load live from Wikipedia: first the product's article image, then a Wikipedia search, then a Wikimedia Commons search (PNGs preferred). Their backgrounds are removed in the browser with an edge flood-fill (`js/images.js`), so products float on the page. Busy photos that can't be cut out cleanly get a soft vignette instead.

## Run it

It's a static site with no build step. Open `index.html`, or serve the folder:

```sh
python3 -m http.server 8000
```

Add or edit products in `js/data.js`.

Fan-made project, not affiliated with Apple Inc.
