# scratch-cloud

A TypeScript library that allows communication with the scratch cloud servers.

A short example:

```ts
import { ScratchCloud } from "@errorgamer2000/scratch-cloud";

async function main() {
  const cloud = new ScratchCloud();

  await cloud.login("<username>", "<password>");

  const session = cloud.createSession(
    "<project_id>",
    false /* do not use TurboWarp servers */
  );

  session.on("set", (name: string, value: string) => {
    console.log(`${name} was set to ${value}.`);
  });
}
```

This is a rewrite of the cloudsession api from my original `scratch3-api` module.
This module provides _only_ methods to communicate with the Scratch/TurboWarp
cloud servers. To use methods that are not centered around the cloud servers,
use [`scratch-connect`](https://www.npmjs.com/package/scratch-connect)(not yet published). For string to number conversions, see
[`stringstonumbers`](https://www.npmjs.com/package/stringstonumbers).

# Installation

Install with npm or other package manager:

```sh
npm install @errorgamer2000/scratch-cloud
```

Or by cloning this repository:

```sh
git clone https://github.com/ErrorGamer2000/scratch-cloud.git
```

Exports:

{{>main}}

&copy; 2022 ErrorGamer2000
