# D-Druk Game Timer

A local web game timer for D-Druk with team scoring, round controls, and a server-backed winner list.

## Run Locally

On Windows, double-click:

```bat
start-game-server.bat
```

Then open:

```text
http://localhost:3000
```

Or run with Node.js:

```bash
npm start
```

## Winner Storage

Saved winners are stored locally in `winners.json`. That file is ignored by Git so private game history is not uploaded to GitHub.
