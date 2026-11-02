# Mudrix integrations

A repository of integrations for [Mudrix](https://github.com/kapsikkum/mudrix-web). An integration is a short
description in a JSON file: which links to recognise (and, if wanted, which details to look up for them), which
buttons and slash commands to add to the message box, which one web service it may call, and, only if its author
asks for it, a widget page that runs code.

This repository is signed (see [Signing and trust](#signing-and-trust)). Almost everything here is **data only**: nothing from this repository runs in Mudrix. The one exception is the
`widget` capability, which loads a page from the author's own server. Mudrix says so in red before it is installed
(see [Writing a widget](#writing-a-widget) and [How people are protected](#how-people-are-protected)).

| integration | what it does |
| --- | --- |
| AlterSend | Shows AlterSend share links as transfer cards that open in your browser |
| GitHub | Shows github.com repository, issue and pull request links as cards with their name, description, stars and language, or title and state, looked up on api.github.com |

## Use it

In Mudrix open **Settings > Integrations > Repositories**, paste

```
https://github.com/kapsikkum/mudrix-integrations
```

and press **Add**. The integrations appear under **Available**; **Install** shows exactly what each one will be
allowed to do before anything is switched on. Installed integrations live on your device only, and each
permission can be turned off again under **Installed > Permissions**.

## Make your own

You need a GitHub account, Node 20 or newer, and about five minutes.

1. **Get the files.** Open the [template repository](https://github.com/kapsikkum/mudrix-integration-template)
   and press **Use this template**, then clone your copy.
2. **`npm run init`**. It creates your signing key, puts the public half into `repo.json`, signs it, and prints a
   **fingerprint** and where the key was saved. **Back that key up** and never commit it.
3. **Edit `repo.json`.** Start from the one integration in it, and choose the smallest tier that does the job;
   people trust (and install) small integrations more readily.

   | tier | permissions | what it does | what the person sees |
   | --- | --- | --- | --- |
   | Links and buttons | `linkCards`, `composerActions` | Cards for links, buttons that put text in the message box | Nothing leaves their device |
   | Link details | `linkDetails` | Cards that show a few fields looked up for the link on **one host**, such as a repository's stars | The host and the exact fields, at install; their device asks that host when a card is shown (in encrypted rooms only when they press the card's button) |
   | Commands | `commands` | Slash commands such as `/push note` in the message box autocomplete | Same: they insert text, or trigger one of the tiers below |
   | API | `api` | Calls **one host** with up to 4 fixed POST requests | The exact request, and a confirmation **every time** |
   | Widget | `widget` | Opens your web page inside Mudrix, which can send and read messages, send files and use up to 3 custom event types of its own in that room if allowed | **A red "this runs code" warning** and an explicit tick to install |

4. **`npm run check`** (optional, `sign` runs it too). It runs Mudrix's own validator on your file, offline, and
   reports a mistake with the path of the field, such as
   `repo.integrations[0].permissions.linkCards[0].hosts[0]: must be lowercase`. What passes here passes in Mudrix.
5. **`npm run sign`**. Run it after every edit: it checks the file, raises `serial` and signs again. It finds your
   key by itself, even after you rename the repository.
6. **Commit and push** both `repo.json` and `repo.json.sig`.
7. **Add it in Mudrix** (Settings > Integrations > Repositories) with `https://github.com/<you>/<repo>`, and check
   that the fingerprint Mudrix shows is the one `init` printed.
8. **Share the URL.** Anyone can add it the same way.

To publish a change, edit `repo.json`, raise the integration's `version`, run `npm run sign`, push, and press
**Refresh** next to the repository in Mudrix. GitHub's raw file cache can take a few minutes to catch up. More on
keys, errors and CI in [`docs/signing.md`](docs/signing.md). In VS Code, `repo.json` gets completion and hints from
`repo.schema.json` (see `.vscode/settings.json`).

Accepted addresses: `https://github.com/<you>/<repo>` (the default branch), a branch or tag of it as
`https://github.com/<you>/<repo>/tree/<branch>` (handy for trying a change before it is on the main branch), or any
plain `https://.../repo.json`, which must have its signature at `https://.../repo.json.sig`. On GitHub the files
must be named `repo.json` and `repo.json.sig` and sit at the root of the repository.

To try commands, an api action, link details and a widget without publishing anything, see
[`examples/`](examples/): a local dev server (it signs what it serves with a throwaway key), two sample widgets
(`hello-widget`, `file-share`) and a dev-only repository. `npm run dev -- repo.json` serves your own file instead.
This needs a Mudrix **development build**: released apps refuse `localhost`. With a released app, push to a branch
and add `https://github.com/<you>/<repo>/tree/<branch>`.

## Signing and trust

Every repository is `repo.json` plus a signature, `repo.json.sig`. Mudrix rejects a repository without a valid
one, with no way to override.

- **What is checked.** The signature is an Ed25519 signature of the exact bytes of `repo.json`, made with the
  private key whose public half is the file's `key`. A file that was altered after signing, or whose signature is
  missing, is refused.
- **The trust prompt.** The first time someone adds a repository, Mudrix shows the key's **fingerprint** (eight
  groups of four hex digits, such as `080e ffe6 20f6 a24d fdaf de75 dd9b 8e71`). Compare it with the one the author
  published, then accept. The repository is **pinned** to that key from then on.
- **"Official".** Mudrix ships the public key of this repository and shows repositories signed with it as
  "Official". Every other repository is shown with its fingerprint instead.
- **If a key changes.** Mudrix refuses the repository until it is removed and added again, and the person checks
  the new fingerprint. There is no "trust anyway".
- **The serial.** `serial` must go up with every published change (`npm run sign` does it). Mudrix refuses a lower
  number than it has seen, so an old signed file cannot be served again.
- **What a signature does not prove.** It says who published the file and that it was not changed. It does **not**
  vouch for a widget's code, which is served live by the widget's own host and can change at any time. Only
  install a widget from an author you trust.
- **Key safety.** Back the private key up (a password manager is fine). If you lose it you can no longer publish
  updates: readers have to remove the repository and add it again under a new key. Never commit it.

## Reference

### The repository file

Next to `repo.json` sits `repo.json.sig`, the signature of its exact bytes (see [Signing and trust](#signing-and-trust)).

| field | | |
| --- | --- | --- |
| `schema` | required | always `1` |
| `name` | required | up to 60 characters, shown in the repository list |
| `key` | required | the repository's Ed25519 public key: standard base64 of the 32 raw bytes (44 characters ending in `=`). `npm run init` fills it in. Changing it makes readers remove and re-add the repository |
| `serial` | required | an integer from 1 to 2147483647 that must go up with every published change (`npm run sign` does it). Mudrix refuses a lower one than it has seen |
| `integrations` | required | up to 50 integrations |

### An integration

| field | | |
| --- | --- | --- |
| `id` | required | lowercase letters, digits, `.`, `_`, `-`; starts with a letter or digit; up to 64. Unique in the file, and **never change it**: it is how Mudrix recognises an installed integration |
| `name` | required | up to 40 characters |
| `description` | required | up to 400 characters, shown before installing |
| `version` | required | up to 20 characters, for example `1.2.0`; raise it when you change anything |
| `icon` | optional | an `https` link to a PNG, JPEG, WebP or GIF of at most 200 KB. SVG is not accepted. Mudrix downloads it once when someone installs, and never again |
| `settings` | optional | up to 8 options the person can change, see [`settings`](#settings-options-the-person-can-change) |
| `permissions` | required | what it may do; can be `{}`. The keys are `linkCards`, `linkDetails`, `composerActions`, `commands`, `api` and `widget` |

Each integration is checked on its own. If one entry breaks a rule, or uses something this version of Mudrix does
not know yet (a newer capability, setting type or key), Mudrix lists it as "Can't be used" or "Needs a newer
version of Mudrix" and keeps the rest of the repository usable; an installed copy keeps working as it was approved.
The repository fields above, and the signature, still have to be valid for the whole file. `npm run check` and
`npm run sign` refuse a file with any such entry, so publish only files that pass.

### `linkCards`: recognise links in messages

Up to 10 rules. A link in a message that matches shows a card under the message, in place of the normal link
preview (at most 3 cards per message). Rules are tried in order and the first match wins, so put specific rules
before general ones.

| field | | |
| --- | --- | --- |
| `hosts` | required | 1 to 10 exact, lowercase host names such as `example.com`. No wildcards, no ports, no IP addresses. `www.example.com` is a different host from `example.com`, so list both if you need both |
| `pathPrefix` | optional | the link's path must start with this, such as `/share/`. It is a plain text prefix, so `/pay` also matches `/payments`; end it with `/` to mean a folder. No `?`, `#`, spaces or backslashes. Leave it out (and `pathPattern`) to match every path on the host |
| `pathPattern` | optional, instead of `pathPrefix` | the shape of the path, such as `/{owner}/{repo}`: up to 8 segments, each either plain text (letters, digits, `. _ ~ -`) that must match exactly, or a `{name}` (lowercase letters, digits, `_`) that takes one whole segment. The link may continue below the pattern, so `/{owner}/{repo}` also matches `/octo/hello/issues`. A captured segment is decoded and must be 1 to 100 characters without control or invisible characters |
| `pathExclude` | optional | up to 30 paths (each up to 100 characters, starting with `/`) this rule never matches. They compare by whole segments and ignore case: `/orgs` leaves out `/orgs` and `/orgs/acme`, not `/orgsx`. Use it to keep a broad pattern such as `/{owner}/{repo}` off the site's own pages (`/orgs/…`, `/settings/…`) |
| `title` | required | up to 120 characters. With `pathPattern` it may use the pattern's `{name}`s, such as `{owner}/{repo}`; any other `{` or `}` is then rejected. It may also use `{setting.<id>}` for a text or choice setting |
| `subtitle` | optional | up to 120 characters; placeholders as for `title` |
| `buttonLabel` | optional | up to 24 characters; defaults to "Open" |
| `details` | optional | the `id` of a lookup in this integration's `linkDetails`. Needs `pathPattern`, and the pattern must capture every `{name}` the lookup's path uses |
| `icon` | optional | accepted for compatibility but **not shown**: every card shows the integration's `icon` |

Only `https` links on the default port match. The card's button opens the message's own link in the browser.

### `linkDetails`: look up a link's details

For cards that should show more than fixed text, such as a repository's description and stars. Data only, but it
does contact a host, so the person approves the host and the exact fields at install, and can switch it off
separately from the cards.

| field | | |
| --- | --- | --- |
| `host` | required | one exact lowercase host name such as `api.example.com`, like the `api` host. Requests go to `https://<host>` |
| `lookups` | required | 1 to 4 lookups, each used by at least one card through its `details` |

Each lookup:

| field | | |
| --- | --- | --- |
| `id` | required | like an integration id, up to 32; unique within the integration |
| `path` | required | up to 200 characters; starts with `/`; letters, digits, `. _ ~ / -` and the `{name}`s of the card's `pathPattern`, which are filled in percent-encoded (so a value can never add a segment or a query). No `.` or `..` segments, no query string |
| `title` | one of these three | the JSON field shown as the card title, in place of the rule's `title` |
| `description` | one of these three | the field shown under the title (at most 300 characters, up to three lines) |
| `descriptionIf` | optional | the `id` of a toggle setting: the description is shown only while it is on |
| `facts` | one of these three | up to 6 `{ "label", "field", "format", "if" }`: a label of up to 24 characters, a field, `text` (the default), `count` (`12.3K`) or `date` (a localised date from an ISO date string), and optionally `if`, the `id` of a toggle setting that must be on for the fact to show |

A field is a name in the JSON answer, or up to 4 names joined with `.` for nested objects, such as `owner.login`.
Only strings are shown as text, numbers as numbers, anything else (and a missing field) is left out. Text is shown
on one line without control or invisible characters, and nothing in the answer becomes a link, an image or markup.

How Mudrix asks: a `GET` with `Accept: application/json`, no cookies, no referrer, no redirects, a 10 second
timeout, at most 64 KB read, and only a `200` answer of type `application/json` counts. The host must allow
cross-origin requests (CORS). In an unencrypted room the card asks when it is shown; in an **encrypted room only
when the person presses the card's "Show details" button**, because the link would otherwise leave their device on
its own. Answers are kept in memory for 15 minutes, at most 30 requests go to a host in any 10 minutes, and after a
`403` or `429` answer Mudrix leaves the host alone for 15 minutes. Whenever there are no details, the card simply
shows its own texts. See [`examples/github.json`](examples/github.json) for a complete integration.

If the host sends an `ETag`, Mudrix asks again after 15 minutes with `If-None-Match`, and a `304 Not Modified`
keeps the old answer without counting against the 30 requests. That header needs a CORS preflight: allow
`If-None-Match` in `Access-Control-Allow-Headers` and list `ETag` in `Access-Control-Expose-Headers`. If the
preflight fails, Mudrix asks that host plainly from then on. While a host is rate limited or out of requests, the
last answer (up to a day old) is shown. A lookup whose fields are all switched off in the settings sends nothing.

### `composerActions`: buttons for the message box

Up to 6 actions. They appear in the message box's **⋮ menu**, labelled "<label> (<integration name>)".

| field | | |
| --- | --- | --- |
| `id` | required | like an integration id, up to 32; unique within the integration |
| `label` | required | up to 24 characters |
| `icon` | optional | one of `send`, `download`, `link`, `plus` |
| `insert` | required | up to 500 characters of text put into the message box at the cursor. Placeholders: `{room}`, replaced by the room's id (URL-encoded), and `{setting.<id>}` for a text or choice setting. Any other `{` or `}` is rejected |

A button only **inserts text**; the person decides whether to send it.

### `commands`: slash commands

Up to 6 commands. They appear in the message box's autocomplete when someone types `/`. Each does **exactly
one** of three things: insert text, run one of the integration's api actions, or open its widget.

| field | | |
| --- | --- | --- |
| `name` | required | without the `/`: a lowercase letter, then lowercase letters, digits or `-`; 2 to 24 characters in all. Unique within the integration |
| `description` | required | up to 80 characters, shown in the autocomplete |
| `usage` | optional | up to 60 characters, a hint such as `/push <note>`; it must be `/name` or start with `/name ` |
| `insert` | one of three | up to 500 characters put into the message box. Placeholders: `{room}` (the room id, URL-encoded), `{args}` (what was typed after the command, without control or invisible characters, at most 500 characters) and `{setting.<id>}` for a text or choice setting. Any other `{` or `}` is rejected |
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
| `body` | optional | the JSON body to send: an object of up to 16 keys (key: letters, digits, `_`, `-`, up to 32 characters) whose values are strings of up to 200 characters. Placeholders: `{room}` (the room id), `{text}` (the message box text), `{args}` (what was typed after a command) and `{setting.<id>}` for a **choice** setting (text settings can not be sent). Values are inserted as data into the JSON, so quotes and newlines cannot break out of it. Any other `{` or `}` is rejected. The finished body may not exceed 8 KB. Leave it out to send no body |
| `insertResultLink` | optional | the name of a string field in the JSON response (letters, digits, `_`, up to 32). If it holds an `https` link of at most 500 characters on the api host or one of the integration's link-card hosts, Mudrix offers to put it into the message box. Anything else is ignored |

Answers larger than 64 KB are not read. Errors shown to the person name only the host and the status.

### `widget`: a page that runs code

> **This is the one capability that runs code.** The page is served by the author's server, can change at any
> time, and Mudrix cannot vet it. Installing it shows a red warning and needs an explicit tick. A widget on
> Mudrix's own origin is refused.

An integration has at most one widget. It is a page at the integration's own `https` address, shown in a
sandboxed iframe (`allow-scripts allow-same-origin allow-forms allow-popups`, plus `allow-downloads` with
`saveFiles`; no camera, microphone or location),
speaking the Matrix Widget API ([MSC2762](https://github.com/matrix-org/matrix-spec-proposals/pull/2762)). It
can do only what the person approves from a fixed list of capabilities.

| field | | |
| --- | --- | --- |
| `url` | required | up to 500 characters; `https`; a real host name (at least two labels, no IP address; a port is allowed); no user name or password; no `#` fragment; no `$` (template variables are not supported); no `theme` or `lang` parameter, because Mudrix adds those |
| `name` | optional | up to 40 characters; defaults to the integration's name |
| `capabilities` | required | a list from the table below, without repeats; `[]` means the widget can only display |
| `parameters` | optional | extra values Mudrix may add to the address: `room_id`, `user_id`, `display_name`. Mudrix always adds `theme` (`light` or `dark`) and `lang` |
| `events` | optional | up to 3 custom room event types the widget may send and read in that room, never state events. Reverse DNS names such as `com.example.fileshare.sent`: lowercase letters, digits, `.`, `_`, `-`, 5 to 80 characters, at least three dot-separated parts. `m`, `m.*`, `org.matrix.*`, `im.vector.*` and `io.element.*` are refused. The reader approves the exact names, and a change needs approval again. Sent content is a plain JSON object of at most 8192 characters, with no top-level `m.relates_to` or `m.mentions`. Most chat apps show nothing for these events, but other apps in the room can see them |
| `fromLinks` | optional | `true`: cards for links on exactly the widget's origin (scheme, host and port) get a button that opens **the clicked link** (any path, query or fragment on that origin) in a window, instead of `url`. It needs a `linkCards` rule for that host, which supplies the card. The window gets no Widget API and no room, only the page. Nothing loads until the person presses the button |
| `linkLabel` | optional | up to 24 characters, the text of that button (default "Open here"). Only with `fromLinks` |
| `saveFiles` | optional | `true`: the page may save files to the device (`allow-downloads` in the sandbox), in the widget and in a `fromLinks` window |

| capability | risk | allows |
| --- | --- | --- |
| `send.message` | high | send `m.room.message` events into the room the widget is open in |
| `read.messages` | high | read the `m.room.message` events arriving in that room |
| `read.room` | low | read that room's name and topic (`m.room.name`, `m.room.topic`) |
| `upload.file` | high | upload a file to the person's media repository |
| `download.file` | high | download a file from the person's media repository |

Files are limited to 25 MB. The Widget API upload is not encrypted, even in an encrypted room.

Every grant is limited to the **one room** the widget is opened in. There is no way to ask for other rooms, other
event types than `m.room.message` and the ones you list in `events`, state changes, account data or to-device messages.

### `settings`: options the person can change

Settings are not permissions. They let the person choose between things you already ask for: which looked-up
facts a card shows, or a word that goes into an inserted text. Mudrix shows them under the integration in
Settings > Integrations (with "Reset to defaults"), names them when someone installs, keeps the values **on that
device only** and never sends them anywhere itself. They are no place for passwords, tokens or anything secret.

| field | | |
| --- | --- | --- |
| `id` | required | a lowercase letter, then letters and digits, up to 24, such as `showStars`; unique within the integration |
| `label` | required | up to 40 characters |
| `description` | optional | up to 120 characters |
| `type` | required | `toggle`, `text` or `choice` |
| `default` | required | `true` or `false` for a toggle; text of at most `maxLength` characters (may be empty); the `value` of one of the options for a choice |
| `maxLength` | text only | 1 to 200; default 100 |
| `options` | choice only | 2 to 8 `{ "value", "label" }`: a value of letters, digits and `. _ ~ -` (up to 40), a label of up to 40 characters |

Where they can be used:

| type | used in |
| --- | --- |
| `toggle` | `if` of a `linkDetails` fact and `descriptionIf` of a lookup: the field is shown only while it is on |
| `text` | `{setting.<id>}` in a card's `title` or `subtitle`, a composer action's or command's `insert` |
| `choice` | the same places as `text`, and in an `api` action's `body` |

A setting can never widen what an integration may do: hosts, paths and fields are approved as they are, and a
`{setting.<id>}` is never allowed in a request path. A template that names a setting the integration does not
declare is rejected. Stored values are checked again every time they are used: a value that no longer fits (a
removed option, a changed type, a hand-edited value) falls back to the default. Adding or removing a setting, or
changing a label, is an ordinary update; changing a setting's type or default, or adding a choice value, needs the
person's approval again like a new permission. When you add a setting, make its default what the integration did
before, so nothing changes for people who never open the settings. Widgets have no settings: a widget is your own
page and can keep its own.

### Limits that apply to everything

Text is plain text: no HTML, no Markdown, and no control or invisible characters (including right-to-left
overrides). Unknown fields anywhere are an error, not ignored. The whole file may be at most 256 KB. Links must be
`https` without a user name or password. A repository that redirects is refused.

## Writing a widget

A widget is a web page that speaks the Widget API with `postMessage`. [`docs/writing-a-widget.md`](docs/writing-a-widget.md)
covers the handshake, the capabilities, the headers your server must send and how to test locally. Start from
[`examples/hello-widget/index.html`](examples/hello-widget/index.html), a single dependency-free page that sends a
message, and [`examples/file-share/index.html`](examples/file-share/index.html), which uploads a file, sends it
as a message and announces it with a custom event. Is your service a good fit for a widget? A proposal for one real case is in
[`docs/altersend-widget-spec.md`](docs/altersend-widget-spec.md).

## How flexible is it?

It depends on the tier, and the tiers are deliberately very different.

**Links and buttons, commands (data only).** They can:

- turn links to a service into a labelled card with a button;
- add menu entries and slash commands that drop a prepared link or phrase into the message box, aware of which
  room you are in and what you typed after the command;
- ship several integrations per repository, each with its own permissions and its own on/off switch.

They cannot run code, read anything, or act on their own: a card never reads the link's content, only shows the
text you wrote (plus parts of the link's own path, with `pathPattern`), and nothing is sent unless the person sends
it.

**Link details (data only, one host).** A card can show a title, a description and up to 6 facts that one approved
host returns for the link, as plain text. It cannot show images or links from the answer, send anything but the
path built from the link, or ask any other host.

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

- A repository must be signed. The first time it is added, the person confirms its key's fingerprint; the
  repository is then pinned to that key, a changed key is refused, and a lower `serial` is refused (rollback
  protection).
- Installing shows the full list of everything the integration asks for, with the hosts, buttons, commands, api
  actions and the widget address; nothing is on until it is confirmed.
- An integration with a widget also shows a red **Code** warning and can only be installed after the person ticks
  that they understand it runs code from the author's server.
- Each permission (link cards, link details, buttons, commands, api, widget) can be switched off afterwards, per
  integration.
- Link details name their one host and the exact fields at install. They are asked without cookies, and in
  encrypted rooms only when the person presses the card's button.
- Every api request is shown in full and confirmed each time; the widget's capabilities are approved from the
  fixed list.
- If a new version asks for more (another host, rule, button, command, api action, lookup or shown field, changed
  wording, or a changed widget address or capability list), the new version waits behind an "update available"
  notice until the person approves it; until then the approved version keeps working as it was. Changing the text of a card counts, so a link cannot quietly be made to look like something else.
- A widget never runs on Mudrix's own origin, and its iframe is sandboxed and has no access to the camera,
  microphone or location.
- The repository is fetched only when someone adds or refreshes it, without cookies and without a referrer;
  icons are fetched once, at install.

**What is not protected:** the widget's code itself is *not pinned*. Mudrix remembers the address and the
capabilities, not what the page does. It is whatever the widget's host serves each time it is opened. Only
install a widget from an author you trust to keep it safe.

## Contributing

Open a pull request that adds your integration to `repo.json`. `npm run check` (or just `node scripts/validate.mjs`)
must pass; CI runs the same check (the signature check only runs after a merge, because the maintainer signs then). Please keep
descriptions factual and list every host the integration really needs, and no more. Do not edit `repo.json.sig` or
`serial`: the maintainer raises the serial and signs with the official key when merging.
