<img src="assets/icon.svg" width="64" height="64" alt="">

# alex.dev — a voxel personal page

A developer portfolio inspired by voxel sandbox games. The hero is a live, procedurally
generated floating island (Three.js) you can orbit, mine and build on; scrolling "digs"
down through surface, stone, ore veins and deepstone to bedrock.

- **Run it:** any static server, e.g. `python3 -m http.server` then open http://localhost:8000
- **Make it yours:** edit the text in `index.html` and the `ROLES`, `SKILLS`, `BUILDS`
  and `JOURNEY` arrays at the top of `js/main.js`.
- **Controls:** drag to look · click to mine · right-click (or shift-click) to place ·
  `1–8` pick a block · `N` day/night · `R` new world.

All textures are generated at runtime in `js/textures.js` — there are no image assets.
