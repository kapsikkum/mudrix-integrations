# Writing a widget

A Mudrix widget is a web page, served from your own `https` origin, that Mudrix shows in a sandboxed iframe and
talks to with the Matrix Widget API ([MSC2762](https://github.com/matrix-org/matrix-spec-proposals/pull/2762))
over `postMessage`.

> **A widget runs your code inside Mudrix's window.** People are shown a red warning and must tick a box to
> install it, and Mudrix does not pin or vet the page: it loads whatever your server returns each time. Ask for
> the fewest capabilities you need, keep the page small, and publish its source.

A working, dependency-free example is in [`../examples/hello-widget/index.html`](../examples/hello-widget/index.html).

## What Mudrix provides

**The iframe.** `sandbox="allow-scripts allow-same-origin allow-forms allow-popups"` and an empty `allow=""`
permissions policy, so no camera, microphone, geolocation, top-level navigation or downloads. `allow-same-origin`
means "your own origin": you keep your cookies and storage. That is also why a widget on Mudrix's own origin is
refused.

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
`new WidgetApi()` without an id (it adopts the id of the first client message); the example page shows the raw version.

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
   - `fromWidget` `org.matrix.msc4039.upload_file` / `download_file` with the matching capability (MSC4039).
   - Also sent to you, which you should acknowledge with `{}`: `theme_change`, `language_change`, `visibility`.

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
topic; no other event types, no state changes, no account data, no to-device messages.

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

1. In this repository run `node examples/dev-server.mjs`. It listens on `8787` (a mock API), `8788` (the
   `examples/hello-widget/` page, with `frame-ancestors *`) and `8789` (`examples/dev-repo.json` as `/repo.json`).
2. Start Mudrix in **development mode** (the Vite dev server of the Mudrix repository). Only dev builds accept
   `localhost` / `127.0.0.1` hosts for `api.host` and `widget.url`.
3. In Settings > Integrations > Repositories add `http://localhost:8789/repo.json`, install "Dev example"
   (tick the code warning), open a room and type `/hello`. Press **Say hello** and the message appears in the room.
4. Edit `examples/hello-widget/index.html` and reload; for your own widget copy the example and change the
   `widget.url` and `capabilities` in a copy of `examples/dev-repo.json`. A changed capability list needs approval
   again.

> The example has not yet been loaded in a real Mudrix build. If something does not match this guide, the Widget
> API traffic is logged to the browser console by the client (`[PostmessageTransport]`).
