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

## Classes

<dl>
<dt><a href="#ScratchCloud">ScratchCloud</a></dt>
<dd><p>Class used to manage login and clound interfacing.</p></dd>
<dt><a href="#Session">Session</a></dt>
<dd></dd>
</dl>

<a name="ScratchCloud"></a>

## ScratchCloud

<p>Class used to manage login and clound interfacing.</p>

**Kind**: global class

- [ScratchCloud](#ScratchCloud)
  - [new ScratchCloud()](#new_ScratchCloud_new)
  - [.login(username, password)](#ScratchCloud+login)
  - [.createSession(project, turbowarp)](#ScratchCloud+createSession)

<a name="new_ScratchCloud_new"></a>

### new ScratchCloud()

<p>Create a new ScratchCloud api wrapper.</p>

<a name="ScratchCloud+login"></a>

### scratchCloud.login(username, password)

<p>Log into scratch with the given username and password.
This is required to use the cloud api, and failing to call this method will
result in an error being thrown. Please note that this action will also log
the user out of scratch on all devices.</p>

**Kind**: instance method of [<code>ScratchCloud</code>](#ScratchCloud)
**Throws**:

- <code>TypeError</code> <p>If the username or password are incorrect.</p>
- <code>Error</code> <p>If the scratch server gives an invalid response.</p>

| Param    | Description                                        |
| -------- | -------------------------------------------------- |
| username | <p>The username of the account to log in with.</p> |
| password | <p>The password of the account to log in with.</p> |

<a name="ScratchCloud+createSession"></a>

### scratchCloud.createSession(project, turbowarp)

<p>Create a new Cloud Session for the given project.</p>

**Kind**: instance method of [<code>ScratchCloud</code>](#ScratchCloud)

| Param     | Default            | Description                                                                   |
| --------- | ------------------ | ----------------------------------------------------------------------------- |
| project   |                    | <p>The ID of the project to connect to.</p>                                   |
| turbowarp | <code>false</code> | <p>Use the TurboWarp cloud servers rather than the Scratch cloud servers.</p> |

<a name="Session"></a>

## Session

**Kind**: global class

- [Session](#Session)
  - [new Session(userData, projectId, turbowarp)](#new_Session_new)
  - [.set(name, value)](#Session+set)
  - [.get(name)](#Session+get)
  - [.enableAutoPrefix()](#Session+enableAutoPrefix)
  - [.disableAutoPrefix()](#Session+disableAutoPrefix)
  - [.on(eventName, listener)](#Session+on)
  - [.once(eventName, listener)](#Session+once)

<a name="new_Session_new"></a>

### new Session(userData, projectId, turbowarp)

<p>Create a new connection to the Scratch cloud servers. Should not be
called manually but rather through <code>ScratchCloud.createSession</code>.</p>

| Param     | Default            | Description                                                                          |
| --------- | ------------------ | ------------------------------------------------------------------------------------ |
| userData  |                    | <p>Data used to validate the user's login and connect using the correct account.</p> |
| projectId |                    | <p>The ID of the project to connect to.</p>                                          |
| turbowarp | <code>false</code> | <p>Use the TurboWarp cloud servers rather than the Scratch cloud servers.</p>        |

<a name="Session+set"></a>

### session.set(name, value)

<p>Set a cloud variable to the given value.</p>

**Kind**: instance method of [<code>Session</code>](#Session)

| Param | Description                                                                                        |
| ----- | -------------------------------------------------------------------------------------------------- |
| name  | <p>The name of the cloud variable.</p>                                                             |
| value | <p>The value to set it to. Can be a string or a number, but can only include numerical digits.</p> |

<a name="Session+get"></a>

### session.get(name)

<p>Get the value of the variable with the given name.</p>

**Kind**: instance method of [<code>Session</code>](#Session)

| Param | Description                           |
| ----- | ------------------------------------- |
| name  | <p>The name of the cloud variable</p> |

<a name="Session+enableAutoPrefix"></a>

### session.enableAutoPrefix()

<p>Enable autoprefixing.</p>

**Kind**: instance method of [<code>Session</code>](#Session)
**See**: [Session.autoPrefix](Session.autoPrefix)
<a name="Session+disableAutoPrefix"></a>

### session.disableAutoPrefix()

<p>Disable autoprefixing.</p>

**Kind**: instance method of [<code>Session</code>](#Session)
**See**: [Session.autoPrefix](Session.autoPrefix)
<a name="Session+on"></a>

### session.on(eventName, listener)

<p>Adds the <code>listener</code> function to the end of the listeners array for the
event named <code>eventNam</code>e. No checks are made to see if the <code>listener</code> has
already been added. Multiple calls passing the same combination of
<code>eventName</code> and <code>listener</code> will result in the <code>listener</code> being added, and
called, multiple times.</p>

**Kind**: instance method of [<code>Session</code>](#Session)

| Param     | Description                   |
| --------- | ----------------------------- |
| eventName | <p>The name of the event.</p> |
| listener  | <p>The callback function.</p> |

<a name="Session+once"></a>

### session.once(eventName, listener)

<p>Adds a one-time <code>listener</code> function for the event named <code>eventName</code>.
The next time <code>eventName</code> is triggered, this listener is removed and then
invoked.</p>

**Kind**: instance method of [<code>Session</code>](#Session)

| Param     | Description                   |
| --------- | ----------------------------- |
| eventName | <p>the name of the event.</p> |
| listener  | <p>the callback listener.</p> |

&copy; 2022 ErrorGamer2000
