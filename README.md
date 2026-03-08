# Sokoban

A retro Sokoban clone modernized with React Hooks and Vite. Features nearly 500 puzzles, unlimited undo, and a fully automated Docker CI/CD pipeline.

You can play it here: https://hubertbanas.github.io/sokoban/

## Features
* **Massive Puzzle Library:** Play through nearly 500 classic Sokoban levels.
* **Unlimited Undo:** Made a wrong move? Rewind your steps all the way back to the beginning.
* **Modern Frontend:** Rebuilt with React 18 and Vite for lightning-fast performance.
* **DevOps Ready:** Fully containerized with Docker and deployed via GitHub Actions.

## Attribution

- Original creator: ecyrbe
- Forked from: https://github.com/ecyrbe/sokoban

## Screenshot

![game screenshot](sokoban.png)

## Tech stack

- Build tool and dev server: Vite
- React integration: @vitejs/plugin-react
- Language: TypeScript
- Production output directory: dist/

## Docker build (without installing Node locally)

Install dependencies using Node in Docker:

```bash
docker run --rm -v "$PWD":/app -w /app node:24-alpine yarn install
```

Build and list the generated output:

```bash
docker run --rm -v "$PWD":/app -w /app node:24-alpine sh -c "yarn build && ls -R dist"
```

## Docker Compose


### Development image (`compose.dev.yaml`)

Build locally with full logs and no cache:

```bash
docker compose -f compose.dev.yaml build --progress=plain --no-cache
```

Start the dev compose stack:

```bash
docker compose -f compose.dev.yaml up -d
```

Notes:

- Service name: `sokoban-dev`
- Container name: `sokoban-dev`
- Host port mapped to container port 80: `8081`

Open the app in your browser at `http://localhost:8081/` or `http://<your-ip>:8081/`.

### Production image (`compose.prod.yaml`)

This file uses the published image `ghcr.io/hubertbanas/sokoban:latest` (no local build required).

Start the prod compose stack:

```bash
docker compose -f compose.prod.yaml up -d
```

Notes:

- Service name: `sokoban-prod`
- Container name: `sokoban-prod`
- Host port mapped to container port 80: `8080`

Open the production service at `http://localhost:8080/` or `http://<your-ip>:8080/`.

## Local development (Node installed)

Install dependencies:

```bash
yarn install
```

Run the dev server:

```bash
yarn dev
```

Open the local URL shown in the terminal (typically `http://localhost:5173`).

## Local production build (no Docker)

Create the production build:

```bash
yarn build
```

Preview the production build locally:

```bash
yarn preview
```

## GitHub Pages deployment

Deployment is automated through GitHub Actions in `.github/workflows/pages.yml`.

- Trigger: push to `master` or `main` (or manual run via `workflow_dispatch`)
- Build output: `dist/`
- Live URL: https://hubertbanas.github.io/sokoban/

## Licensing
This project is licensed under the MIT License. See [LICENSE](LICENSE).