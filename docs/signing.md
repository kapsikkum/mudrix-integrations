# Signing a repository

Every Mudrix integration repository is two files next to each other:

| file | what it is |
| --- | --- |
| `repo.json` | the repository: its name, its public `key`, a `serial`, and the integrations |
| `repo.json.sig` | a detached signature of `repo.json` |

Mudrix rejects a repository without a valid signature. There is no "add anyway" button. This page explains how it
works, how to look after your key, and what to do when Mudrix shows an error. For the short version, see the
README.

## The short version

```
npm run init      # once: creates your key, puts the public half into repo.json, signs
# edit repo.json
npm run sign      # every time you publish a change (raises the serial and signs)
npm run verify    # optional: check what you are about to push
```

Without npm: `node scripts/sign.mjs init`, `node scripts/sign.mjs sign --bump`, `node scripts/sign.mjs verify`.
Node 20 or newer; the script has no dependencies.

## How it works

1. You hold a private key (Ed25519). Its public half is written into `repo.json` as `"key"`.
2. You sign the **exact bytes** of `repo.json` with the private key. The result goes into `repo.json.sig`.
3. Mudrix downloads both files, takes the `key` from `repo.json`, and checks that the signature fits those bytes.
4. The first time someone adds your repository, Mudrix shows the key's **fingerprint** and asks them to trust it.
   They compare it with the one you printed (from `init`), and from then on the repository is **pinned to that
   key**. If the key later changes, Mudrix refuses the repository until it is removed and added again.
5. Every published change must raise `serial`. Mudrix remembers the highest serial it has seen and refuses a lower
   one, so an old signed file cannot be replayed.

Because the key sits inside the file it signs, the signature on its own only proves "whoever made this file held
the matching private key". What gives it meaning is the pin from step 4, and for the official repository the key
that ships inside Mudrix (those show an "Official" badge).

## File formats

**`repo.json`** has two required top-level fields besides `schema`, `name` and `integrations`:

```json
{
  "schema": 1,
  "name": "My integrations",
  "key": "AcV0kn9xQsh7H9G76k7cDoJWRAeAjhhqUTnc2hHw85A=",
  "serial": 7,
  "integrations": []
}
```

- `key`: standard base64 of the 32 raw bytes of the Ed25519 public key. Always 44 characters, ending in one `=`.
- `serial`: an integer from 1 to 2147483647. It must go up with every published change.
- `schema` stays `1`.

**`repo.json.sig`** is the standard base64 of the 64-byte Ed25519 signature, on one line (a trailing newline is
fine). The signature covers the file's bytes exactly as they are served, which is why any edit, even a space, needs
a new signature. This repository's `.gitattributes` pins the line endings of `repo.json` to LF so Git on Windows
cannot rewrite them after you signed; keep that file.

**Fingerprint**: the SHA-256 of the 32 raw key bytes, the first 16 bytes written in lowercase hex as eight groups
of four, for example `080e ffe6 20f6 a24d fdaf de75 dd9b 8e71`. `node scripts/sign.mjs fingerprint <key>` prints it.

The signing tool uses only Node's built-in crypto. Browsers can check the same signature with WebCrypto:

```js
const key = await crypto.subtle.importKey('raw', rawKeyBytes, { name: 'Ed25519' }, false, ['verify']);
const ok = await crypto.subtle.verify('Ed25519', key, signatureBytes, repoJsonBytes);
```

## The commands

| command | does |
| --- | --- |
| `init [--repo repo.json] [--key-out <path>]` | creates a key pair, writes the private key (mode 600) to `--key-out` or `~/.mudrix/keys/<repository-name>.key`, puts the public key into `repo.json` (and `serial: 1` if missing), signs, and prints the fingerprint. Refuses to overwrite an existing key file, and refuses a repository that already has a key |
| `keygen --out <path>` | only creates a key pair; prints the public key and fingerprint |
| `sign [repo.json] [--key <path>] [--bump]` | signs. The key comes from `--key`, then the `MUDRIX_SIGNING_KEY` variable (a path), then `MUDRIX_SIGNING_KEY_PEM` (the PEM text), then the default location `init` used. `--bump` raises `serial` by one first, changing nothing else in the file. Refuses a key that does not match the `key` in `repo.json` |
| `verify [repo.json]` | checks `repo.json` against `repo.json.sig`; exits with 1 and a message if it does not fit |
| `fingerprint <base64-key>` | prints the fingerprint Mudrix shows |

## Key management

- **Where it lives.** `init` saves the private key at `~/.mudrix/keys/<repository-name>.key` (on Windows,
  `C:\Users\<you>\.mudrix\keys\`). On macOS and Linux the file is readable by you only. Windows has no such file
  mode, so keep the folder in your own profile.
- **Back it up.** Copy the file to a password manager or an encrypted drive straight away. It is the only copy.
- **Never commit it.** `.gitignore` excludes `*.key` and `*.pem`; do not remove those lines, and do not paste the
  key into issues or chats. Anyone with the key can publish a repository that Mudrix will accept as yours.
- **Rotation is a new identity.** There is no "transfer". A new key means a new fingerprint, and every reader has
  to remove the repository and add it again (and confirm the new fingerprint). Do it only if the key leaked or was
  lost, and tell your readers where they can check the new fingerprint.
- **Why there is no override.** If Mudrix accepted a changed key or an unsigned file after a click, an attacker who
  can alter the file (a hijacked GitHub account, a bad mirror) would only need to talk a reader into one click.
  Refusing outright is what makes the pin worth anything.
- **Moving to another computer.** Copy the key file over and point at it with `--key <path>` or the
  `MUDRIX_SIGNING_KEY` variable.

## The serial rule

Raise `serial` by at least one every time you publish a change; `npm run sign` does it for you. Mudrix keeps the
highest serial it has seen for each repository and ignores anything lower. Do not jump to huge numbers "to be safe":
you can never go back down. If you sign twice without publishing, nothing is lost; readers only see what you push.
Remember to also raise an integration's `version` when you change it.

## Optional: signing in CI

Signing on your own computer is simplest. If you prefer to sign in GitHub Actions, store the **contents** of the
key file as a repository secret named `MUDRIX_SIGNING_KEY_PEM` (Settings > Secrets and variables > Actions) and add
a workflow like this one. It is an example only; this repository does not enable it.

```yaml
name: Sign
on:
  workflow_dispatch:
jobs:
  sign:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - name: Sign
        env:
          MUDRIX_SIGNING_KEY_PEM: ${{ secrets.MUDRIX_SIGNING_KEY_PEM }}
        run: node scripts/sign.mjs sign --bump
      - name: Commit the signature
        run: |
          git config user.name "github-actions"
          git config user.email "github-actions@users.noreply.github.com"
          git add repo.json repo.json.sig
          git commit -m "Sign repository" || echo "nothing to commit"
          git push
```

Anyone who can run workflows or edit them on that repository can then use the key, so keep the repository private
to your team or protect the branch. Remember that a push by the workflow does not trigger further workflows.

## Troubleshooting

These are the messages Mudrix can show when adding or refreshing a repository.

**"This repository is not signed."** `repo.json.sig` is missing, or is not at the same place as `repo.json`. Run
`npm run sign`, then commit and push **both** files. On GitHub the two must be in the root of the same branch. A
custom URL has to serve `repo.json.sig` at the same address plus `.sig`. GitHub's cache can take a few minutes.

**"Bad signature."** `repo.json` is not the file that was signed. Usually you edited it after signing, or pushed one
file without the other, or Git changed its line endings (keep `.gitattributes`). Run `npm run sign` again and push
both files. If it keeps failing, run `npm run verify` locally; if that passes, what is served is not what you have
(a cache, or a proxy that rewrites the file).

**"The repository's key changed."** The URL now serves a file signed by a different key than the one the reader
pinned. If you did it on purpose (new key after a leak or loss), readers must **remove** the repository and add it
again, and confirm the new fingerprint. If you did not, someone else may control the address: check your GitHub
account and do not re-add it until you know why.

**"This repository is older than the version already seen."** The `serial` is lower than one Mudrix has already
accepted. Either an old file is being served (a stale cache; wait and press Refresh), or you restored an older
`repo.json`. Run `npm run sign` to raise the serial above the highest one you ever published. (Mudrix refuses a
lower serial. A file with the same serial but different content is accepted, so always raise it: that is what lets
apps reject an old signed copy being replayed.)

**"This device cannot check signatures."** The browser or system Mudrix runs in does not support Ed25519 through
WebCrypto (older browsers). Use a current version of Chrome, Edge, Firefox or Safari, or the desktop app. Nothing is
wrong with the repository.

**`init` says the key file already exists.** It never overwrites. Pick another path with `--key-out`. If the existing file belongs to a different repository,
the default name came from your repository `name`; changing the name or passing `--key-out` avoids the clash.

**`sign` says "this is not the key this repository was set up with".** The private key you pointed at does not
match the `key` in `repo.json`. Find the original key file. If it is gone, see "Rotation" above.
