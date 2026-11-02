# Writing a widget

A Mudrix widget is a web page, served from your own `https` origin, that Mudrix shows in a sandboxed iframe and
talks to with the Matrix Widget API ([MSC2762](https://github.com/matrix-org/matrix-spec-proposals/pull/2762))
over `postMessage`.

> **A widget runs your code inside Mudrix's window.** People are shown a red warning and must tick a box to
> install it, and Mudrix does not pin or vet the page: it loads whatever your server returns each time. Ask for
> the fewest capabilities you need, keep the page small, and publish its source.

Working, dependency-free examples: [`../examples/hello-widget/index.html`](../examples/hello-widget/index.html)
(sends one message) and [`../examples/file-share/index.html`](../examples/file-share/index.html) (uploads a file,
sends it as a message and announces it with a custom event).

## What Mudrix provides

**The iframe.** `sandbox="allow-scripts allow-same-origin allow-forms allow-popups"` and an empty `allow=""`
permissions policy, so no camera, microphone, geolocation or top-level navigation, and no downloads unless the
manifest sets `"saveFiles": true` (which adds `allow-downloads` and is shown to the person at install).
`allow-same-origin` means "your own origin": you keep your cookies and storage. That is also why a widget on
Mudrix's own origin is refused.

**Opening shared links (`fromLinks`).** If your service hands out links (a transfer, a document), set
`"fromLinks": true` and add a `linkCards` rule for your host. Cards for those links then get a button
(`linkLabel`, default "Open here") that opens the clicked link itself, on exactly your widget's origin, in a
window. That window is a plain sandboxed page: it gets no Widget API messages and no room. With `saveFiles` it may
start downloads, which is what a "receive a file" page needs.

**The address.** Your `widget.url`, plus query parameters Mudrix adds:

| parameter | when |
| --- | --- |
| `theme` | always: `light` or `dark` |
| `lang` | always: the app language, such as `en` |
| `room_id`, `user_id`, `display_name` | only if listed in `widget.parameters` |

Do not put `theme`, `lang` or a `$` in the manifest URL; the manifest is rejected.

**The widget id.** The Widget API drops every message whose `widgetId` is empty or not the one the client created.
Element-style clients substitute `$matrix_widget_id` into the URL; Mudrix's manifest does not allow `$`, so the
id is **not** in the URL. You get it from the first message the client sends you: when the iframe has loaded, the
client sends the `capabilities` request (below) and every client message carries `widgetId`. Copy it from there
and use it on everything you send. This means your listener must be registered before the page finishes loading,
so put the script in the `<head>` or inline in the body. If you use the `matrix-widget-api` library, construct
`new WidgetApi(null, '*')`: no id (it adopts the id of the first client message) and `'*'` as the client origin, because
you do not know it (left out, the library posts to a null origin, which the browser rejects). The example page shows the
raw version.

## Message shape

Every message, both ways, is a JSON object posted to the other window:

```json
{ "api": "fromWidget", "widgetId": "...", "requestId": "...", "action": "send_event", "data": { } }
```

- `api` is `"toWidget"` for messages the client sends you, `"fromWidget"` for messages you send.
- `requestId` is unique per request. The reply is the **same object with a `response` field added** and the same
  `requestId`; an error reply is `response: { "error": { "message": "..." } }`.
- Check `event.source === window.parent` on everything you receive. Mudrix's origin is not fixed (self-hosted
  copies exist), so pin whatever `event.origin` the first client message had rather than hard-coding one.

## The handshake, in order

1. The iframe loads. The client sends `toWidget` `capabilities` with empty `data`. This is also where you learn the
   `widgetId`.
2. You reply with `response: { "capabilities": [ ... ] }`: the Widget API capability strings you want (see the
   table below). You may also send `fromWidget` `supported_api_versions` (empty `data`) at any time; the reply is
   `{ "supported_versions": [...] }`.
3. The person has approved your manifest's capabilities at install time. Mudrix drops any requested string that
   the approved list does not cover.
4. The client sends `toWidget` `notify_capabilities` with `data: { "requested": [...], "approved": [...] }`.
   Reply with `{}`. `approved` is what you actually got; enable your UI from it.
5. Now use the API:
   - `fromWidget` `send_event` with `data: { "type": "m.room.message", "content": { "msgtype": "m.text", "body": "..." } }`.
     Leave `room_id` out (it defaults to the current room). The response has `room_id` and `event_id`.
   - `fromWidget` `org.matrix.msc2876.read_events` with `data: { "type": "m.room.message", "limit": 20 }`, or
     `{ "type": "m.room.name", "state_key": true }` for room state. The response is `{ "events": [...] }`.
   - Events pushed to you arrive as `toWidget` `send_event` (a room event) or `update_state` (room state); reply
     `{}`.
   - `fromWidget` `org.matrix.msc4039.upload_file` / `download_file` with the matching capability (MSC4039); see
     [Sending files](#sending-files).
   - Also sent to you, which you should acknowledge with `{}`: `theme_change`, `language_change`, `visibility`.
   - **Answer `toWidget` `supported_api_versions`.** Before the client answers a `read_events` request it asks you
     which API versions you support. Reply `{ "supported_versions": ["0.0.1", "0.0.2", "org.matrix.msc2762",
     "org.matrix.msc2876"] }`, not `{}`: with an empty reply the client cannot continue and your `read_events`
     request times out.

## Capabilities

The manifest names **catalogue ids**; you then request the matching **Widget API strings**. Request only the ones
your manifest lists.

| manifest id | request these strings | allows |
| --- | --- | --- |
| `send.message` | `org.matrix.msc2762.send.event:m.room.message` and `org.matrix.msc2762.timeline:<room id>` | `send_event` of `m.room.message` |
| `read.messages` | `org.matrix.msc2762.receive.event:m.room.message` and `org.matrix.msc2762.timeline:<room id>` | reading and receiving `m.room.message` |
| `read.room` | `org.matrix.msc2762.receive.state_event:m.room.name` and `...:m.room.topic` | reading the room's name and topic |
| `upload.file` | `org.matrix.msc4039.upload_file` | uploading a file |
| `download.file` | `org.matrix.msc4039.download_file` | downloading a file |

`<room id>` is the room the widget is open in; ask for `room_id` in `widget.parameters` to get it from the
`room_id` query parameter. The timeline capability is granted only for that room.

Restrictions you will run into: only the **current room**; only `m.room.message` events plus the room name and
topic, and any custom event types you declare in `events` (see [Custom events](#custom-events)); no other event
types, no state changes, no account data, no to-device messages.

## Sending files

Declare `"capabilities": ["send.message", "upload.file"]` (add `download.file` to fetch files). Then request
`org.matrix.msc4039.upload_file` and `org.matrix.msc2762.send.event:m.room.message` (plus the timeline string).

To send a file:

1. Send `fromWidget` `org.matrix.msc4039.upload_file` with `data: { "file": <Blob or File> }`. A `File` from an
   `<input type="file">` or a drop can be passed as it is; `postMessage` copies it. Give this request a long
   timeout, a large upload takes a while. The response is `{ "content_uri": "mxc://..." }`.
2. Send an `m.room.message` with `send_event`:

   ```json
   { "msgtype": "m.file", "body": "report.pdf", "url": "mxc://server/abc", "info": { "mimetype": "application/pdf", "size": 12345 } }
   ```

   Every chat app then shows it as a file.

**Limit: 25 MB.** Mudrix refuses larger uploads and downloads. Check `file.size` yourself first and say so, rather
than uploading 25 MB to be told no.

**Encrypted rooms.** The Widget API upload is **not encrypted**. The file is stored on the server as it is, even if
the room is end-to-end encrypted, and anyone who can get the mxc link can fetch it. The message you send is
encrypted, but it points at a plain file. The file-share example does nothing special about this: it uploads and
sends in any room, and shows the error text if the client refuses. If your widget may be used in encrypted rooms,
your code has to handle that: warn the person before sending, or encrypt the file yourself before uploading and
put the key in the message. Do not let people believe that a file sent this way is private.

The example `examples/file-share` does all of this, and also shows each step's error (upload, message, custom
event) separately, including a capability that was not approved.

## Custom events

A widget can store its own small records in the room by sending custom room events, and read them back. Declare
the types in the manifest:

```json
"widget": { "url": "...", "capabilities": ["send.message"], "events": ["com.example.fileshare.sent"] }
```

**Naming.** Up to 3 unique types. Use lowercase letters, digits, `.`, `_` and `-`, 5 to 80 characters, written as
reverse DNS: at least three dot-separated parts, each starting with a letter or digit, such as
`com.example.fileshare.sent`. Use a domain you own. Names that are `m` or start with `m.`, `org.matrix.`,
`im.vector.` or `io.element.` are refused: those belong to the Matrix specification and to clients, and a widget
must not be able to forge or read messages, reactions, membership or other events that look like them. Only room
events work, never state events.

**Approval.** The reader approves the exact names when installing, and the consent dialog lists them. Adding or
changing a name means they have to approve again.

**Capabilities.** For each declared type request `org.matrix.msc2762.send.event:<type>` to send and
`org.matrix.msc2762.receive.event:<type>` to read, plus `org.matrix.msc2762.timeline:<room id>` (the same room
parameter as above). Any other type is refused.

**Sending.** `send_event` with `data: { "type": "com.example.fileshare.sent", "content": { ... } }`. The content
must be a plain JSON object of at most 8192 characters when serialised, and must not have a top-level
`m.relates_to` or `m.mentions` key. The response has `event_id`.

**Reading.** History: `org.matrix.msc2876.read_events` with `data: { "type": "com.example.fileshare.sent", "limit": 20 }`
gives `{ "events": [...] }`. Live events of your types arrive as `toWidget` `send_event`; reply `{}`. Your own
events can come back that way too, so de-duplicate on `event_id`.

**Who sees them.** Most chat apps show nothing for a custom event, but they are not private: they are ordinary
events in the room, and every member and every other app that reads the room can see them. They are also as
unencrypted as the room. Do not put secrets in them. Keep the content small and tolerate missing or odd
fields, since anybody in the room can send an event of that type. The example `examples/file-share` sends one
after each file and builds its "Recent transfers" list from them.

## Settings

The `settings` an integration declares (see the [reference](https://github.com/kapsikkum/mudrix-integrations#settings-options-the-person-can-change))
are for cards, inserted text and api bodies. Mudrix does not pass them to a widget: your page runs on your own
origin and can keep its own preferences there, for example in `localStorage`.

## What your server must send

- The page must be **frameable by Mudrix**. Do not send `X-Frame-Options: DENY` or `SAMEORIGIN`. Send
  `Content-Security-Policy: frame-ancestors <Mudrix origins>` listing every Mudrix address that should be able to
  open it (for the hosted app and any copy you want to support; `frame-ancestors *` is fine for local testing only).
- Serve over `https` (the one exception is a local `http://localhost` address in a Mudrix development build).
- Cross-origin headers are only needed if the page itself calls your API from the browser; the Widget API uses
  `postMessage` and needs none.
- Your own page's CSP may need `connect-src` for your API; nothing is needed for the Widget API.

## Test it locally

The repository includes everything for a local loop, with no deployment.

1. In this repository run `npm run dev` (`node examples/dev-server.mjs`). It listens on `8787` (a mock API, and
   `GET /v1/details/<owner>/<name>` for trying `linkDetails`), `8788` (the `examples/hello-widget/` page at `/`
   and the `examples/file-share/` page at `/file-share/`, with `frame-ancestors *`) and `8789`
   (`examples/dev-repo.json` as `/repo.json`, with `key` and `serial` set and a matching `/repo.json.sig`).
   `npm run dev -- repo.json` serves your own `repo.json` the same way, so you can try it before signing and
   pushing. `npm run check:dev` checks `examples/dev-repo.json` with Mudrix's development build rules.
   Mudrix refuses unsigned repositories, so the server signs what it serves with a throwaway key it keeps in
   `examples/.dev-key.pem` (git-ignored); keep that file between runs, otherwise Mudrix reports that the key changed.
2. Start Mudrix in **development mode** (the Vite dev server of the Mudrix repository). Only dev builds accept
   `localhost` / `127.0.0.1` for the repository address, `api.host`, `linkDetails.host` and `widget.url`.
3. In Settings > Integrations > Repositories add `http://localhost:8789/repo.json`, install "Dev example"
   (tick the code warning), open a room and type `/hello`. Press **Say hello** and the message appears in the room.
   Install "File share (dev)" and type `/share` to try file upload and the custom event. Install "Link details
   (dev)" and send `https://dev-repos.example/octo/hello` in an unencrypted room to see a card with looked-up
   details.
4. Edit `examples/hello-widget/index.html` and reload; for your own widget copy the example and change the
   `widget.url` and `capabilities` in `examples/dev-repo.json` (do not add `key` or `serial` there: the server does). A changed capability list needs approval
   again.

> The example has not yet been loaded in a real Mudrix build. If something does not match this guide, the Widget
> API traffic is logged to the browser console by the client (`[PostmessageTransport]`).
