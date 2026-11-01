# Mudrix integrations

A repository of integrations for [Mudrix](https://github.com/kapsikkum/mudrix-web). An integration is a short
description in a JSON file: which links to recognise, which buttons and slash commands to add to the message box,
which one web service it may call, and, only if its author asks for it, a widget page that runs code.

Almost everything here is **data only**: nothing from this repository runs in Mudrix. The one exception is the
`widget` capability, which loads a page from the author's own server. Mudrix says so in red before it is installed
(see [Writing a widget](#writing-a-widget) and [How people are protected](#how-people-are-protected)).

| integration | what it does |
| --- | --- |
| AlterSend | Shows AlterSend share links as transfer cards that open in your browser |

## Use it

In Mudrix open **Settings > Integrations > Repositories**, paste

```
https://github.com/kapsikkum/mudrix-integrations
```

and press **Add**. The integrations appear under **Available**; **Install** shows exactly what each one will be
allowed to do before anything is switched on. Installed integrations live on your device only, and each
permission can be turned off again under **Installed > Permissions**.

## Make your own

You need a GitHub account and about five minutes.

1. **Create a repository** on GitHub (public, any name) and add a file named `repo.json` at its root.
2. **Start from this** (a single integration with one button and one link card):

   ```json
   {
     "schema": 1,
     "name": "My integrations",
     "integrations": [
       {
         "id": "my-service",
         "name": "My Service",
         "description": "One or two sentences on what it does, shown before anyone installs it.",
         "version": "1.0.0",
         "permissions": {
           "linkCards": [
             {
               "hosts": ["example.com"],
               "pathPrefix": "/share/",
               "title": "My Service share",
               "subtitle": "Opens in your browser",
               "buttonLabel": "Open"
             }
           ],
           "composerActions": [
             {
               "id": "share",
               "label": "Share",
               "icon": "link",
               "insert": "https://example.com/share/new?room={room}"
             }
           ]
         }
       }
     ]
   }
   ```

   **Choose what your integration needs.** Use the smallest tier that does the job; people trust (and install)
   small integrations more readily.

   | tier | permissions | what it does | what the person sees |
   | --- | --- | --- | --- |
   | Links and buttons | `linkCards`, `composerActions` | Cards for links, buttons that put text in the message box | Nothing leaves their device |
   | Commands | `commands` | Slash commands such as `/push note` in the message box autocomplete | Same: they insert text, or trigger one of the tiers below |
   | API | `api` | Calls **one host** with up to 4 fixed POST requests | The exact request, and a confirmation **every time** |
   | Widget | `widget` | Opens your web page inside Mudrix, which can send and read messages in that room if allowed | **A red "this runs code" warning** and an explicit tick to install |

3. **Commit and push.** Optionally copy `repo.schema.json` and `.github/workflows/validate.yml` from this
   repository: the workflow checks `repo.json` on every push (the schema, plus references the schema cannot
   express, such as a command pointing at an api action that exists), and editors that support JSON Schema can use
   the schema while you type.
4. **Add it in Mudrix** (Settings > Integrations > Repositories) with `https://github.com/<you>/<repo>`. A
   mistake is reported with the path of the field, such as
   `repo.integrations[0].permissions.linkCards[0].hosts[0]: must be lowercase`. Mudrix is the final
   validator.
5. **Share the URL.** Anyone can add it the same way.

To publish a change, edit `repo.json`, raise `version`, push, and press **Refresh** next to the repository in
Mudrix. GitHub's raw file cache can take a few minutes to catch up.

Accepted addresses: `https://github.com/<you>/<repo>` (the default branch), a branch or tag of it as
`https://github.com/<you>/<repo>/tree/<branch>` (handy for trying a change before it is on the main branch), or any
plain `https://.../repo.json`. On GitHub the file must be named `repo.json` and sit at the root of the repository.

To try commands, an api action and a widget without publishing anything, see [`examples/`](examples/): a local
dev server, a sample widget and a dev-only repository.

## Reference

### The repository file

| field | | |
| --- | --- | --- |
| `schema` | required | always `1` |
| `name` | required | up to 60 characters, shown in the repository list |
| `integrations` | required | up to 50 integrations |

### An integration

| field | | |
| --- | --- | --- |
| `id` | required | lowercase letters, digits, `.`, `_`, `-`; starts with a letter or digit; up to 64. Unique in the file, and **never change it**: it is how Mudrix recognises an installed integration |
| `name` | required | up to 40 characters |
| `description` | required | up to 400 characters, shown before installing |
| `version` | required | up to 20 characters, for example `1.2.0`; raise it when you change anything |
| `icon` | optional | an `https` link to a PNG, JPEG, WebP or GIF of at most 200 KB. SVG is not accepted. Mudrix downloads it once when someone installs, and never again |
| `permissions` | required | what it may do; can be `{}`. The keys are `linkCards`, `composerActions`, `commands`, `api` and `widget` |

### `linkCards`: recognise links in messages

Up to 10 rules. A link in a message that matches shows a card under the message, in place of the normal link
preview (at most 3 cards per message).

| field | | |
| --- | --- | --- |
| `hosts` | required | 1 to 10 exact, lowercase host names such as `example.com`. No wildcards, no ports, no IP addresses. `www.example.com` is a different host from `example.com`, so list both if you need both |
| `pathPrefix` | optional | the link's path must start with this, such as `/share/`. It is a plain text prefix, so `/pay` also matches `/payments`; end it with `/` to mean a folder. No `?`, `#`, spaces or backslashes. Leave it out to match every path on the host |
| `title` | required | up to 120 characters |
| `subtitle` | optional | up to 120 characters |
| `buttonLabel` | optional | up to 24 characters; defaults to "Open" |
| `icon` | optional | an `https` image link, same rules as above |

Only `https` links match. The card's button opens the message's own link in the browser.

### `composerActions`: buttons for the message box

Up to 6 actions. They appear in the message box's **⋮ menu**, labelled "<label> (<integration name>)".

| field | | |
| --- | --- | --- |
| `id` | required | like an integration id, up to 32; unique within the integration |
| `label` | required | up to 24 characters |
| `icon` | optional | one of `send`, `download`, `link`, `plus` |
| `insert` | required | up to 500 characters of text put into the message box at the cursor. The only placeholder is `{room}`, replaced by the room's id (URL-encoded). Any other `{` or `}` is rejected |

A button only **inserts text**; the person decides whether to send it.

### `commands`: slash commands

Up to 6 commands. They appear in the message box's autocomplete when someone types `/`. Each does **exactly
one** of three things: insert text, run one of the integration's api actions, or open its widget.

| field | | |
| --- | --- | --- |
| `name` | required | without the `/`: a lowercase letter, then lowercase letters, digits or `-`; 2 to 24 characters in all. Unique within the integration |
| `description` | required | up to 80 characters, shown in the autocomplete |
| `usage` | optional | up to 60 characters, a hint such as `/push <note>`; it must be `/name` or start with `/name ` |
| `insert` | one of three | up to 500 characters put into the message box. Placeholders: `{room}` (the room id, URL-encoded) and `{args}` (what was typed after the command, without control or invisible characters, at most 500 characters). Any other `{` or `}` is rejected |
| `api` | one of three | the `id` of an action in this integration's `api.actions`. Needs the `api` permission |
| `widget` | one of three | `true`: opens this integration's widget. Needs the `widget` permission |

A command never shadows one of Mudrix's built-in commands (it is simply left out), and when two installed
integrations use the same name the one installed first wins. A command only works while its own permission
(`commands`, plus `api` or `widget` where used) is switched on.

### `api`: one host, a few fixed requests

For services that have an HTTP API. Mudrix shows the **exact request** (address and body) and the person
confirms **every single use**; nothing is ever sent in the background. Requests carry no cookies, no secrets and
no custom headers, and always use POST. The service has to allow cross-origin requests (CORS) itself, including
the preflight for `Content-Type: application/json`.

| field | | |
| --- | --- | --- |
| `host` | required | one exact lowercase host name such as `api.example.com`: no wildcards, no ports, no IP addresses, at least two labels. Requests go to `https://<host>` |
| `actions` | required | 1 to 4 actions |

Each action:

| field | | |
| --- | --- | --- |
| `id` | required | like an integration id, up to 32; unique within the integration |
| `label` | required | up to 24 characters |
| `path` | required | up to 200 characters; starts with `/`; only letters, digits and `. _ ~ / -`; no `.` or `..` segments; no query string |
| `body` | optional | the JSON body to send: an object of up to 16 keys (key: letters, digits, `_`, `-`, up to 32 characters) whose values are strings of up to 200 characters. Placeholders: `{room}` (the room id), `{text}` (the message box text) and `{args}` (what was typed after a command). Values are inserted as data into the JSON, so quotes and newlines cannot break out of it. Any other `{` or `}` is rejected. The finished body may not exceed 8 KB. Leave it out to send no body |
| `insertResultLink` | optional | the name of a string field in the JSON response (letters, digits, `_`, up to 32). If it holds an `https` link of at most 500 characters on the api host or one of the integration's link-card hosts, Mudrix offers to put it into the message box. Anything else is ignored |

Answers larger than 64 KB are not read. Errors shown to the person name only the host and the status.

### `widget`: a page that runs code

> **This is the one capability that runs code.** The page is served by the author's server, can change at any
> time, and Mudrix cannot vet it. Installing it shows a red warning and needs an explicit tick. A widget on
> Mudrix's own origin is refused.

An integration has at most one widget. It is a page at the integration's own `https` address, shown in a
sandboxed iframe (`allow-scripts allow-same-origin allow-forms allow-popups`, no camera, microphone or location),
speaking the Matrix Widget API ([MSC2762](https://github.com/matrix-org/matrix-spec-proposals/pull/2762)). It
can do only what the person approves from a fixed list of capabilities.

| field | | |
| --- | --- | --- |
| `url` | required | up to 500 characters; `https`; a real host name (at least two labels, no IP address; a port is allowed); no user name or password; no `#` fragment; no `$` (template variables are not supported); no `theme` or `lang` parameter, because Mudrix adds those |
| `name` | optional | up to 40 characters; defaults to the integration's name |
| `capabilities` | required | a list from the table below, without repeats; `[]` means the widget can only display |
| `parameters` | optional | extra values Mudrix may add to the address: `room_id`, `user_id`, `display_name`. Mudrix always adds `theme` (`light` or `dark`) and `lang` |

| capability | risk | allows |
| --- | --- | --- |
| `send.message` | high | send `m.room.message` events into the room the widget is open in |
| `read.messages` | high | read the `m.room.message` events arriving in that room |
| `read.room` | low | read that room's name and topic (`m.room.name`, `m.room.topic`) |
| `upload.file` | high | upload a file to the person's media repository |
| `download.file` | high | download a file from the person's media repository |

Every grant is limited to the **one room** the widget is opened in. There is no way to ask for other rooms, other
event types, state changes, account data or to-device messages.

### Limits that apply to everything

Text is plain text: no HTML, no Markdown, and no control or invisible characters (including right-to-left
overrides). Unknown fields anywhere are an error, not ignored. The whole file may be at most 256 KB. Links must be
`https` without a user name or password. A repository that redirects is refused.

## Writing a widget

A widget is a web page that speaks the Widget API with `postMessage`. [`docs/writing-a-widget.md`](docs/writing-a-widget.md)
covers the handshake, the capabilities, the headers your server must send and how to test locally. Start from
[`examples/hello-widget/index.html`](examples/hello-widget/index.html), a single dependency-free page that sends a
message. Is your service a good fit for a widget? A proposal for one real case is in
[`docs/altersend-widget-spec.md`](docs/altersend-widget-spec.md).

## How flexible is it?

It depends on the tier, and the tiers are deliberately very different.

**Links and buttons, commands (data only).** They can:

- turn links to a service into a labelled card with a button;
- add menu entries and slash commands that drop a prepared link or phrase into the message box, aware of which
  room you are in and what you typed after the command;
- ship several integrations per repository, each with its own permissions and its own on/off switch.

They cannot run code, read anything, or act on their own: a card never reads the link's content, only shows the
fixed text you wrote, and nothing is sent unless the person sends it.

**API (data only, one host).** It can make up to 4 fixed POST requests to a single host, each one shown and
confirmed by the person, with the room id, the message box text or the command arguments in the body, and can
offer a link from the answer. It cannot read the answer beyond that one link, send headers or cookies, use
another method, or call anything in the background.

**Widget (runs code).** This is the flexible tier, and the one that needs the most trust. A widget can show any
interface the author can build, and, with the right capabilities, send and read messages and transfer files in the
one room it is opened in. In exchange it is code from the author's server that can change whenever the author
likes. It cannot reach other rooms, your account, your keys or your session, but it can do anything with what it
has been granted, including sending messages as you if you approved `send.message`.

The other tiers are data only; the widget is the only way to get a live status panel, a form, or a custom sender.

## How people are protected

- Installing shows the full list of everything the integration asks for, with the hosts, buttons, commands, api
  actions and the widget address; nothing is on until it is confirmed.
- An integration with a widget also shows a red **Code** warning and can only be installed after the person ticks
  that they understand it runs code from the author's server.
- Each permission (link cards, buttons, commands, api, widget) can be switched off afterwards, per integration.
- Every api request is shown in full and confirmed each time; the widget's capabilities are approved from the
  fixed list.
- If a new version asks for more (another host, rule, button, command, api action or changed wording, or a changed
  widget address or capability list), it stays switched off with an "update available" notice until the person
  approves it. Changing the text of a card counts, so a link cannot quietly be made to look like something else.
- A widget never runs on Mudrix's own origin, and its iframe is sandboxed and has no access to the camera,
  microphone or location.
- The repository is fetched only when someone adds or refreshes it, without cookies and without a referrer;
  icons are fetched once, at install.

**What is not protected:** the widget's code itself is *not pinned*. Mudrix remembers the address and the
capabilities, not what the page does. It is whatever the widget's host serves each time it is opened. Only
install a widget from an author you trust to keep it safe.

## Contributing

Open a pull request that adds your integration to `repo.json`. The validate check must pass. Please keep
descriptions factual and list every host the integration really needs, and no more.
