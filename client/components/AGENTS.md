# Web components

Read the root AGENTS.md for site architecture and browser testing.

- The Components catalog distinguishes standalone elements from kits. A kit is
  a named package of related elements. Give its entries distinct custom element
  names and list the package under Kits. Put each kit directly under
  `/components/<kit>/`.
- Give each kit its own ES module entry, stylesheet if needed, package metadata,
  license, README, and Custom Elements Manifest. Keep artifact URLs stable and
  publish them under the kit's catalog path. Import only the kits a page uses.
- Declare dependencies on other kits in package metadata and expose the same
  dependencies in the catalog JSON. Keep the dependency graph acyclic and use
  the dependency's public entry point and documented APIs.
- Keep reusable rendering and interaction in the element package. Keep game
  rules, art, tutorial controls, and site styling with their consumers. Scope
  styles to the elements and document author-facing CSS custom properties.
- Reuse the featured game's art in tutorials and reference examples. When an
  example needs new art, give it a role in the game and author it there.
- Prefer native controls and CSS. Pass state down with attributes and report
  state changes up through events. Keep examples usable without JavaScript
  wherever the browser can provide the interaction.
- A kit's index is a tutorial. Introduce one element per step, show highlighted
  HTML in the open, and render that markup as the live result. Give each element
  a reference page with useful states and all public attributes, events, and CSS
  hooks. Generate API tables from the kit manifest so they stay in sync.
- Test public URLs, importable artifacts, and behavior through the live examples.
