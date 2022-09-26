import EventEmitter from "events";
import fetch from "node-fetch";
import { RawData, WebSocket } from "ws";

interface FetchParams {
  headers?: {
    [key: string]: string;
  };
  body?: string;
  sessionId?: string;
  path?: string;
  method?: "GET" | "POST";
  hostname?: string;
}
const sFetch = ({
  headers = {},
  body = "",
  sessionId = "",
  path = "/",
  method = "GET",
  hostname = "scratch.mit.edu"
}: FetchParams) => {
  const headerObj = Object.assign(
    {
      Cookie: "scratchcsrftoken=a; scratchlanguage=en;",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.142 Safari/537.36",
      "x-csrftoken": "a",
      "x-requested-with": "XMLHttpRequest",
      referer: "https://scratch.mit.edu",
      "Content-Length": Buffer.byteLength(body)
    },
    headers
  );

  if (sessionId)
    headerObj.Cookie = `${headerObj.Cookie} scratchsessionsid=${sessionId}`;

  return fetch(`https://${hostname}${path}`, {
    method,
    headers: headerObj,
    body: method === "POST" ? body : undefined
  });
};

const validateLogin = async () => {
  return await (
    await sFetch({})
  ).ok;
};

/**
 * Class used to manage login and clound interfacing.
 */
export class ScratchCloud {
  private loginData: { username: string; password: string } = {
    username: "",
    password: ""
  };
  private sessionId: string = "";
  private token: string = "";
  /**
   * Whether the instance's login is valid.
   */
  protected valid: boolean = false;
  /**
   * Create a new ScratchCloud api wrapper.
   */
  constructor() {}
  /**
   * Log into scratch with the given username and password.
   * This is required to use the cloud api, and failing to call this method will
   * result in an error being thrown. Please note that this action will also log
   * the user out of scratch on all devices.
   * @param username The username of the account to log in with.
   * @param password The password of the account to log in with.
   * @throws {TypeError} If the username or password are incorrect.
   * @throws {Error} If the scratch server gives an invalid response.
   */
  async login(username: string, password: string): Promise<void> {
    this.loginData = {
      username,
      password
    };

    const req = await sFetch({
      path: "/login/",
      method: "POST",
      body: JSON.stringify(this.loginData),
      headers: {}
    }).catch(() => {
      throw new TypeError("Invalid username or password.");
    });

    const res = await req.json().catch(() => {
      throw new Error("Scratch server gave an invalid response.");
    });

    if (res.msg) {
      throw new Error(res.msg);
    }

    this.token = res.token;
    this.sessionId = req.headers
      .raw()
      ["set-cookie"][0].match(/scratchsessionsid="(.*)";/)![1];

    this.valid = await validateLogin();
  }

  /**
   * Create a new Cloud Session for the given project.
   * @param project The ID of the project to connect to.
   * @param turbowarp Use the TurboWarp cloud servers rather than the Scratch cloud servers.
   */
  createSession(project: string | number, turbowarp: boolean = false) {
    return new ScratchCloud.Session(
      {
        ...this.loginData,
        sessionId: this.sessionId
      },
      project,
      turbowarp
    );
  }
}
export namespace ScratchCloud {
  /**
   * The prefix used by scratch to seperate cloud variables from normal ones.
   */
  export const cloudPrefix = "☁ ";
  /**
   * A connection to the scratch cloud servers. Used to get/set cloud variables.
   */
  export class Session extends EventEmitter {
    private connectionAttempts = 0;
    private queuedPackets: any[] = [];
    /**
     * The maximum number of characters that a cloud variable can use.
     */
    protected maxCharacters: number;
    private connection: WebSocket | null = null;
    /**
     * A map of the variable names and values, used by `Session.get`.
     */
    protected variables: {
      [key: string]: string | number;
    } = {};
    /**
     * Whether autoprefixing is enabled. autoprefixing automatically adds
     * `ScratchCloud.couldPrefix` to the beginning of a variable's name in the
     * `Session.get` and `Session.set` methods, if it not already there.
     * This way, you can use `Session.get("variable name")` rather than
     * `Session.get(ScratchCloud.cloudPrefix + "variable name")` or
     * `Session.get("☁ variable name")`.
     */
    protected autoPrefix = true;
    /**
     * Create a new connection to the Scratch cloud servers. Should not be
     * called manually but rather through `ScratchCloud.createSession`.
     * @param userData Data used to validate the user's login and connect using the correct account.
     * @param projectId The ID of the project to connect to.
     * @param turbowarp Use the TurboWarp cloud servers rather than the Scratch cloud servers.
     */
    constructor(
      private userData: {
        /**
         * The username of the account to connect with.
         */
        username: string;
        /**
         * The scratchsessionsid to use for verification.
         */
        sessionId: string;
      },
      private projectId: string | number,
      private turbowarp: boolean = false
    ) {
      super();
      this.maxCharacters = turbowarp ? 100_000 : 256;

      this.open();
    }

    private open() {
      this.connection = new WebSocket(
        `wss://${
          this.turbowarp
            ? "clouddata.turbowarp.org"
            : "clouddata.scratch.mit.edu"
        }/`,
        {
          headers: {
            cookie: this.turbowarp
              ? ""
              : `scratchsessionsid=${this.userData.sessionId};`,
            origin: this.turbowarp ? "turbowarp.org" : "https://scratch.mit.edu"
          }
        }
      );
      this.connection.on("open", this.onOpen.bind(this));
      this.connection.on("message", this.onMessage.bind(this));
      this.connection.on("close", this.onClose.bind(this));
      this.connection.on("error", this.onError.bind(this));
    }

    private exponentialTimeout() {
      return (Math.pow(2, Math.min(this.connectionAttempts, 5)) - 1) * 1000;
    }

    private randomizeDuration(t: number) {
      return Math.random() * t;
    }

    private createPacket(
      methodName: string,
      dataName?: string,
      dataValue?: string
    ) {
      return {
        method: methodName,
        user: this.userData.username,
        project_id: this.projectId,
        // These will be removed by JSON.stringify if they are undefined.
        name: dataName,
        value: dataValue
      };
    }

    private sendPacket(packet: any) {
      if (this.connection && this.connection.readyState === WebSocket.OPEN) {
        this.connection.send(`${JSON.stringify(packet)}\n`);
      } else {
        this.queuedPackets.push(packet);
      }
    }

    private handlePacket(packet: any) {
      function validatePacket(p: any): p is {
        method: "set";
        name: string;
        value: string;
      } {
        return typeof p === "object" && p.method === "set";
      }

      if (!validatePacket(packet)) return;
      const isInitialSet = !(packet.name in this.variables);

      this.variables[packet.name] = packet.value;

      if (!isInitialSet) this.emit("set", packet.name, packet.value);
      else this.emit("addvariable", packet.name, packet.value);
    }

    private onOpen() {
      this.connectionAttempts = 1;
      this.sendPacket(this.createPacket("handshake"));

      this.queuedPackets.forEach(this.sendPacket.bind(this));
      this.queuedPackets = [];
      this.emit("open");
    }

    private onMessage(message: RawData) {
      const data = message.toString();
      const isInitialSetup =
        data.length > 2 && Object.keys(this.variables).length === 0;
      data.split("\n").forEach((p) => {
        if (p) {
          this.handlePacket(JSON.parse(p));
        }
      });

      if (isInitialSetup) {
        this.emit("setup");
      }
    }
    private onClose() {
      this.emit("close");
      const timeout = this.randomizeDuration(this.exponentialTimeout());
      setTimeout(this.open.bind(this), timeout);
    }
    private onError(err: Error) {
      this.emit("error", err);
    }

    /**
     * Set a cloud variable to the given value.
     * @param name The name of the cloud variable.
     * @param value The value to set it to. Can be a string or a number, but can only include numerical digits.
     */
    set(name: string, value: string | number) {
      value = String(value);
      if (this.autoPrefix && !name.startsWith(cloudPrefix)) {
        name = `${cloudPrefix}${name}`;
      }
      if (isNaN(Number(value))) {
        console.warn("Invalid cloud variable value. Can only contain numbers.");
      } else if (value.length > this.maxCharacters) {
        console.warn(
          `Variable length is too long. Maximum of ${this.maxCharacters} digits.`
        );
      } else {
        this.sendPacket(this.createPacket("set", name, value));
        this.variables[name] = value;
      }
    }

    /**
     * Get the value of the variable with the given name.
     * @param name The name of the cloud variable
     */
    get(name: string): string | undefined {
      if (this.autoPrefix && !name.startsWith(cloudPrefix)) {
        name = `${cloudPrefix}${name}`;
      }
      return name in this.variables ? String(this.variables[name]) : undefined;
    }

    /**
     * Enable autoprefixing.
     * @see {@link Session.autoPrefix}
     */
    enableAutoPrefix() {
      this.autoPrefix = true;
    }
    /**
     * Disable autoprefixing.
     * @see {@link Session.autoPrefix}
     */
    disableAutoPrefix() {
      this.autoPrefix = false;
    }

    /**
     * Open event.
     *
     * @event ScratchCloud.Session#open
     */

    /**
     * Adds the `listener` function to the end of the listeners array for the
     * event named `eventNam`e. No checks are made to see if the `listener` has
     * already been added. Multiple calls passing the same combination of
     * `eventName` and `listener` will result in the `listener` being added, and
     * called, multiple times.
     * @param eventName The name of the event.
     * @param listener The callback function.
     */
    on(eventName: "open", listener: () => void): this;
    on(eventName: "close", listener: () => void): this;
    on(eventName: "error", listener: (err: Error) => void): this;
    on(eventName: "set", listener: (name: string, value: string) => void): this;
    on(
      eventName: "addvariable",
      listener: (name: string, value: string) => void
    ): this;
    on(eventName: "setup", listener: () => void): this;

    on(eventName: string, listener: (...args: any[]) => void) {
      return super.on(eventName, listener);
    }

    /**
     * Adds a one-time `listener` function for the event named `eventName`.
     * The next time `eventName` is triggered, this listener is removed and then
     * invoked.
     * @param eventName the name of the event.
     * @param listener the callback listener.
     */
    once(eventName: "open", listener: () => void): this;
    once(eventName: "close", listener: () => void): this;
    once(eventName: "error", listener: (err: Error) => void): this;
    once(
      eventName: "set",
      listener: (name: string, value: string) => void
    ): this;
    once(
      eventName: "addvariable",
      listener: (name: string, value: string) => void
    ): this;
    once(eventName: "setup", listener: () => void): this;
    once(eventName: string, listener: (...args: any[]) => void) {
      return super.once(eventName, listener);
    }
  }
}
