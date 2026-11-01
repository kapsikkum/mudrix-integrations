# Mudrix integrations

A repository of integrations for [Mudrix](https://github.com/kapsikkum/mudrix-web). An integration is a short
description in a JSON file: which links to recognise, and which buttons to add to the message box. **No code
from this repository ever runs in Mudrix.**

| integration | what it does |
| --- | --- |
| AlterSend | Shows AlterSend links as transfer cards and adds Send and Request to the message box menu |

> The AlterSend entry uses the placeholder host `altersend.example` until the real hosts and link paths are
> filled in. Change `hosts`, `pathPrefix` and the `insert` links in `repo.json` before publishing it.

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

3. **Commit and push.** Optionally copy `repo.schema.json` and `.github/workflows/validate.yml` from this
   repository: the workflow checks `repo.json` on every push, and editors that support JSON Schema can use the
   schema while you type.
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
| `permissions` | required | what it may do; can be `{}`. Only the two kinds below exist |

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

### Limits that apply to everything

Text is plain text: no HTML, no Markdown, and no control or invisible characters (including right-to-left
overrides). Unknown fields anywhere are an error, not ignored. The whole file may be at most 256 KB. Links must be
`https` without a user name or password. A repository that redirects is refused.

## How flexible is it?

Deliberately narrow, so that adding a repository is safe. It can:

- turn links to a service into a labelled card with a button;
- add menu entries that drop a prepared link or phrase into the message box, aware of which room you are in;
- ship several integrations per repository, each with its own permissions and its own on/off switch.

It cannot (today):

- run code, call a service, or fetch anything: a card cannot show a file name, a size or a status, because it
  never reads the link's content and shows only the fixed text you wrote;
- read or send messages, see who you are, or act on its own; it is never given your account or room contents,
  only the room id, and only in the one placeholder;
- add a slash command, a panel, a widget, or an action on a message;
- change what the message box sends or how messages look.

Things that need more than this (a live status card, a bot, a panel) belong in a Matrix widget or a bot, which
Mudrix already supports separately; an integration can still add the button that links to it.

## How people are protected

- Installing shows the full list of hosts and buttons first; nothing is on until it is confirmed.
- Each permission can be switched off afterwards, per integration.
- If a new version asks for more (another host, another rule, another button, or changed wording), it stays
  switched off with an "update available" notice until the person approves it. Changing the text of a card
  counts, so a link cannot quietly be made to look like something else.
- The repository is fetched only when someone adds or refreshes it, without cookies and without a referrer;
  icons are fetched once, at install.

## Contributing

Open a pull request that adds your integration to `repo.json`. The validate check must pass. Please keep
descriptions factual and list every host the integration really needs, and no more.
