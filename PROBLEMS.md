# Known Problems

Bob reads this on startup and avoids these issues.

## Problems

- react-force-graph-3d@^2.2.25 does not exist on npm. Use react-force-graph-3d@^2.1.0 or three.js directly for 3D visuals.
- Next.js App Router: Any component using useState, useEffect, onClick, or browser APIs MUST have "use client" at the top of the file. Without it, the build fails with "Client Component" error.
