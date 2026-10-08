# Desk Duel

**Flick. Fight. Win.** A browser pen-fight game inspired by the school-desk classic.

> Status: classroom edition with offline AI/local play (vs AI, local 2-player, best-of-5, settings). Online play, MongoDB and stats come next.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000

To test on a phone, put it on the same Wi-Fi and open `http://<your-computer-LAN-IP>:3000`.

The game loads Matter.js and Google Fonts from a CDN, so you need an internet connection.
If fonts are blocked the game falls back to system fonts. If Matter.js is blocked the game shows an error.

## Controls

Press your pen, drag backwards, release. Farther pull = stronger flick. A pen that leaves the desk loses the round; first to 3 round wins takes the match.

## Tuning the feel

Everything lives in `CONFIG` at the top of `js/physics.js`
(`maxSpeed`, `maxPull`, `deskFriction`, `frictionAir`, `spinFactor`, ...).


### Physics update
The current build uses a higher full-power launch speed, reduced air drag, more realistic desk friction/static friction, softer pen-to-pen impacts, and a Trimax-style procedural ballpoint model.
