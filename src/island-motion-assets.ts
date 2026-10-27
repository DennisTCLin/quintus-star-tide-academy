import type { IslandMotion } from "./island-motion";

// Only reviewed articulated clips are registered. Other residents rest in place.
export const ISLAND_MOTIONS: Readonly<Record<string, IslandMotion>> = {
  "tideglow": {
    "facing": 1,
    "anchor": { "x": 0.63, "y": 0.94 },
    "walkDistance": 2.4000000000000004,
    "idle": {
      "src": "/assets/island-motion/tideglow-idle.webp?v=914ab05921dd",
      "columns": 6,
      "rows": 8,
      "frames": 48,
      "cell": 160,
      "seconds": 4
    },
    "walk": {
      "src": "/assets/island-motion/tideglow-walk.webp?v=3ee35774c446",
      "columns": 6,
      "rows": 3,
      "frames": 18,
      "cell": 160,
      "seconds": 1.5
    },
    "play": {
      "src": "/assets/island-motion/tideglow-play.webp?v=8e3dac13b73b",
      "columns": 6,
      "rows": 8,
      "frames": 48,
      "cell": 160,
      "seconds": 4
    }
  },
  "cometcrane": {
    "facing": 1,
    "anchor": { "x": 0.49, "y": 0.945 },
    "walkDistance": 3.066666666666667,
    "idle": {
      "src": "/assets/island-motion/cometcrane-idle.webp?v=030bc017f1fc",
      "columns": 6,
      "rows": 8,
      "frames": 48,
      "cell": 160,
      "seconds": 4
    },
    "walk": {
      "src": "/assets/island-motion/cometcrane-walk.webp?v=1432b5bc8115",
      "columns": 6,
      "rows": 4,
      "frames": 23,
      "cell": 160,
      "seconds": 1.9166666666666667
    },
    "play": {
      "src": "/assets/island-motion/cometcrane-play.webp?v=a6a4b7182ea5",
      "columns": 6,
      "rows": 8,
      "frames": 48,
      "cell": 160,
      "seconds": 4
    }
  }
};
