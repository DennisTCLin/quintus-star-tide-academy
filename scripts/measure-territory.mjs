// Local test database only. Four isolated families; never uses preset players.
import { writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
const base = "http://127.0.0.1:4287";
const clients = [];
for (let i = 0; i < 4; i++) {
  const r = await fetch(base + "/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base },
    body: JSON.stringify({
      username: "landperf_" + randomUUID().slice(0, 8),
      password: "territory-performance-2026",
    }),
  });
  if (!r.ok) throw Error(await r.text());
  clients.push({
    cookie: r.headers
      .getSetCookie()
      .map((s) => s.split(";")[0])
      .join("; "),
    state: await r.json(),
  });
}
const timings = [];
async function command(client, action) {
  const start = performance.now();
  const r = await fetch(base + "/api/command", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: base,
      Cookie: client.cookie,
      "X-CSRF-Token": client.state.csrf,
    },
    body: JSON.stringify({
      id: randomUUID(),
      revision: client.state.family.revision,
      command: { type: "territory", player: "quintus", ...action },
    }),
  });
  if (!r.ok) throw Error(await r.text());
  client.state = await r.json();
  timings.push(performance.now() - start);
}
await Promise.all(clients.map((c) => command(c, { type: "starter-draw" })));
await Promise.all(clients.map((c) => command(c, { type: "starter-confirm" })));
timings.length = 0;
await Promise.all(clients.map((c) => command(c, { action: "start" })));
for (let i = 0; i < 15; i++)
  await Promise.all(
    clients.map((c) =>
      command(c, { action: "theme", theme: i % 2 ? "day" : "night" }),
    ),
  );
timings.sort((a, b) => a - b);
const report = {
  scope:
    "localhost Chromium-independent HTTP calls; local PostgreSQL, four isolated accounts; not production capacity guarantee",
  commands: timings.length,
  concurrentFamilies: 4,
  p50ms: timings[Math.floor(timings.length * 0.5)],
  p95ms: timings[Math.floor(timings.length * 0.95)],
  maxMs: timings.at(-1),
  familyStateBytes: Buffer.byteLength(JSON.stringify(clients[0].state)),
  territoryStateBytes: Buffer.byteLength(
    JSON.stringify(clients[0].state.family.profiles.quintus.territory),
  ),
};
await writeFile(
  "outputs/territory/performance.json",
  JSON.stringify(report, null, 2),
);
console.log(report);
