# Skem

Skem is a rough interactive prototype for learning figure drawing by switching between pose reference, instructor-style structural construction, animator-style simplified volumes, and Bridgman-inspired mass-and-wedge construction.

## Prototype features
- 4 poses
- front, 3/4, and side views
- 4 drawing phases
- reference ghost overlay
- study timing suggestion
- responsive layout

## Run locally
Serve this directory with any static web server, for example:

```bash
python3 -m http.server 3000
```

Then open http://localhost:3000.

## Roadmap
1. True 3D rotatable figure and camera.
2. Skeleton and muscle anatomy layers.
3. Larger pose library and randomizer.
4. Timed sessions and saved studies.
5. Custom camera angles and foreshortening drills.
6. Instructor annotations and landmarks.
