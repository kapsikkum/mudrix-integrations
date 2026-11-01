# AlterSend as a Mudrix widget: a proposal

A note for the AlterSend maintainers about what it would take to be pluggable into Mudrix beyond link cards.

## Where things stand

[AlterSend](https://altersend.com) ([source](https://github.com/denislupookov/altersend)) is peer-to-peer, with no
accounts and **no HTTP API**. Its browser app at `https://app.altersend.com` only **receives**: sending happens in
the native apps. So today nothing more than recognising share links is possible, and that is all the
`altersend` entry in `repo.json` does (it shows share links as transfer cards).

Without a sender in the browser or an API, **a widget cannot be built today.** Everything below depends on
AlterSend shipping something new.

## What would be needed

A web page, for example `https://app.altersend.com/mudrix` (any address on your own origin), that:

1. **Can send from a browser.** Pick a file, create a transfer and produce a share link, all in the page.
2. **Is frameable.** No `X-Frame-Options: DENY`; send `Content-Security-Policy: frame-ancestors` for the Mudrix
   origins.
3. **Speaks the Widget API** (MSC2762) over `postMessage`, as in
   [`writing-a-widget.md`](writing-a-widget.md): answer `capabilities`, read `notify_capabilities`, then use
   `send_event`. A dependency-free reference is in [`../examples/hello-widget/index.html`](../examples/hello-widget/index.html).
4. Follows the widget rules: no `$`, no fragment in the registered address, and it must not run on Mudrix's origin.

The manifest entry would then add a `widget` (and, if wanted, a `/altersend` command):

```json
"widget": {
  "url": "https://app.altersend.com/mudrix",
  "capabilities": ["send.message"],
  "parameters": ["room_id"]
}
```

## What AlterSend could do with each capability

| capability | use |
| --- | --- |
| `send.message` | After a transfer is created, post the share link into the room as a normal message, which Mudrix then shows as a transfer card |
| `read.messages` | Watch the room for incoming AlterSend links to offer "receive" in the panel. Optional; high risk, so only if it adds real value |
| `read.room` | Show the room's name in the panel header. Low risk, rarely needed |
| `upload.file` | Not needed: AlterSend transfers peer to peer and never stores files on the homeserver, which is its selling point |
| `download.file` | Not needed, for the same reason |

The smallest useful request is `send.message` alone.

## Why a widget and not an API action

The `api` tier posts a fixed request to a fixed host, with the person confirming each time. That suits a service
with a "create link" endpoint. AlterSend has no endpoint and its transfers need a live peer connection in the
browser, which is exactly what a widget page can host and a fixed request cannot.

## The trust trade

A widget is code from `app.altersend.com` that can change at any time, and Mudrix cannot vet it. People see a red
warning and must tick a box to install it. AlterSend's open-source code and a stable, minimal page are what
make that an easy decision.
