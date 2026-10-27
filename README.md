# playus practice

An unofficial fan-made website for practising the mini-games from the
[playus: Daily Group Challenge](https://apps.apple.com/app/id6754755269) app.
It isn't affiliated with playus or Dapps Pte. Ltd.

There are 29 games. Each one is a one-minute round (unless you lose earlier),
and personal bests are saved in your browser.

## Run it

It's a static site with no build step:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

You can also host the folder as-is on GitHub Pages, Netlify or similar.

## Structure

- `js/engine.js`: home screen, game loop, input (tap/swipe/keys), HUD and best scores
- `js/games/*.js`: the games, grouped by category; each one calls `PU.register({...})`

Games marked "guess" in the code had no public rules to work from, so their
mechanics are a best interpretation based on the game's name.
