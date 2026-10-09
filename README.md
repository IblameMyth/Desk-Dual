<div align="center">

# ✏️ Desk Duel

### Flick. Fight. Win.

**A classroom-themed browser pen-fight game inspired by the classic desk game.**

[Play vs AI](#-game-modes) · [Play With Friends](#-game-modes) · [Run Locally](#-run-locally)

</div>

---

## 🏫 About the Game

Welcome to **STD 9-A**! Desk Duel brings the school-desk pen-fight game to your browser. Pick a pen, line up your shot, pull back, and release to flick your pen toward your opponent. Keep your pen on the desk and try to be the last one standing.

The game uses a warm classroom look with a wooden desk, school-style scoreboard, pen models, and chalkboard-inspired details.

## 🎮 Game Modes

- **Play vs AI** — Challenge the computer across selectable difficulty levels.
- **Play With Friends** — Play locally with 2–5 players, taking turns on the same device.
- **Online Play** — Displayed as coming soon; online multiplayer is not currently available.

## 🖊️ How to Play

1. Choose **Play vs AI** or **Play With Friends** from the main menu.
2. Select your player name and pen options when prompted.
3. Press and hold your pen, then drag backwards to aim the flick.
4. Release to launch the pen. A longer pull generally produces a stronger shot.
5. Keep your pen on the desk. A pen that leaves the desk is out for that round.
6. Win **3 rounds** to win the match.

## 🧰 Built With

- **HTML5** — Page structure and game screens
- **CSS** — Responsive layout and classroom-inspired visuals
- **JavaScript (ES modules)** — Game flow, input, AI, rendering, settings, and local multiplayer
- **Matter.js 0.20.0** — 2D physics simulation
- **Google Fonts** — Lilita One and Nunito

The game loads Matter.js and Google Fonts from external CDNs, so an internet connection is needed for those resources.

## 📁 Project Structure

```text
Desk-Duel/
├── index.html             # Main classroom menu
├── levels.html            # AI difficulty selection
├── game.html              # Game board and scoreboard
├── friends.html           # Local multiplayer setup
├── about.html             # About page
├── contact.html           # Contact page
├── style.css              # Classroom theme and responsive styles
├── assets/
│   ├── pens/              # Pen image assets
│   └── sounds/            # Sound assets (if added)
├── js/
│   ├── main.js            # Menu and page interactions
│   ├── game.js            # Main game orchestration
│   ├── ai.js              # AI opponent logic
│   ├── friends-setup.js   # Local multiplayer setup
│   ├── friends.js         # Local multiplayer game flow
│   ├── pens.js            # Pen selection and pen data
│   ├── physics.js         # Physics configuration and collisions
│   ├── render.js          # Desk and pen rendering
│   ├── input.js           # Flick and pointer controls
│   ├── audio.js           # Sound handling
│   ├── ui.js              # Interface updates
│   ├── settings.js        # Game settings
│   └── levels.js          # AI levels and progression
├── package.json
└── vercel.json            # Vercel routing configuration
```

## 🚀 Deploy to Vercel

1. Push the project to a GitHub repository.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Use the project root as the **Root Directory**.
4. No build command is required for the static site. If Vercel asks for an output directory, use the project root (`.`).
5. Deploy and open the generated URL.

Make sure `index.html`, `vercel.json`, `style.css`, `js/`, and `assets/` are at the repository root—not nested inside another project folder.

## ⚙️ Gameplay Tuning

Physics values are configured in `js/physics.js`. Pen data and pen-specific settings are managed in `js/pens.js`. Make a backup before changing physics or dimensions, then test both AI and local multiplayer modes to ensure the gameplay stays consistent.

## 💾 Saving and Privacy

This version is designed for local play and does not require account sign-in. Any settings or progression stored by the game remain in the browser unless the code is extended with a backend or cloud storage. Clearing browser site data may remove locally stored game information.

## 🛠️ Troubleshooting

- **A page looks outdated:** hard-refresh the browser with `Ctrl + Shift + R`.
- **A page or script fails to load on Vercel:** check that the repository root contains the project files and review the Vercel deployment logs.
- **Fonts or physics do not load:** check your internet connection and whether the external CDN resources are reachable.
- **Changes are not live:** confirm the latest GitHub commit has deployed successfully in Vercel.

## 📌 Project Status

The classroom-themed game currently supports AI matches and local multiplayer. Online multiplayer and server-backed cross-device progress are not included in this version.

## 📄 License

The project includes an MIT license declaration in `package.json`. If you distribute the project, include a `LICENSE` file with the appropriate license text and confirm that any third-party assets are compatible with your intended use.

---

<div align="center">

**Made for the classroom. Built for the next pen-fight champion.** ✏️🏆

</div>
