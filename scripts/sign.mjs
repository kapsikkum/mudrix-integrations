#!/usr/bin/env node
// Signs and verifies a Mudrix integration repository (repo.json + repo.json.sig).
// Node >= 20, no dependencies. Run without arguments for help.
//
// The signature is Ed25519 over the exact bytes of repo.json, stored as standard base64 (64 bytes) in
// repo.json.sig. repo.json carries the public key ("key") and a "serial" that must go up with every change.
import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign as edSign,
  verify as edVerify,
} from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

const PLACEHOLDER_PREFIX = 'REPLACE_ME';
const KEY_RE = /^[A-Za-z0-9+/]{43}=$/;
const MAX_SERIAL = 2147483647;

class Fail extends Error {}
const fail = (msg) => {
  throw new Fail(msg);
};

const USAGE = `Mudrix repository signing tool

Usage: node scripts/sign.mjs <command> [options]

Commands
  init [--repo repo.json] [--key-out <path>]
      First-time setup: creates your signing key, puts the public half into repo.json
      and signs it. The private key goes to ~/.mudrix/keys/<name>.key unless --key-out is given.
  keygen --out <path>
      Only creates a key pair; prints the public key and its fingerprint.
  sign [repo.json] [--key <path>] [--bump]
      Writes repo.json.sig. The key comes from --key, or the MUDRIX_SIGNING_KEY environment
      variable (a path), or MUDRIX_SIGNING_KEY_PEM (the PEM text, for CI secrets).
      --bump raises "serial" by 1 first. Do this for every published change.
  verify [repo.json]
      Checks repo.json against repo.json.sig using the key inside repo.json.
  fingerprint <base64-key>
      Prints the fingerprint that Mudrix shows for a key.

Examples
  node scripts/sign.mjs init
  node scripts/sign.mjs sign --bump
  node scripts/sign.mjs verify
  MUDRIX_SIGNING_KEY=~/.mudrix/keys/my-integrations.key node scripts/sign.mjs sign --bump
`;

// ---------- key helpers ----------

function rawPublicOf(keyObject) {
  const pub = keyObject.type === 'private' ? createPublicKey(keyObject) : keyObject;
  return Buffer.from(pub.export({ format: 'jwk' }).x, 'base64url');
}

function publicKeyFromRaw(raw) {
  return createPublicKey({
    key: { kty: 'OKP', crv: 'Ed25519', x: raw.toString('base64url') },
    format: 'jwk',
  });
}

function fingerprintOfRaw(raw) {
  const hex = createHash('sha256').update(raw).digest('hex').slice(0, 32);
  return hex.match(/.{4}/g).join(' ');
}

function parseKeyField(value) {
  if (typeof value !== 'string' || value.startsWith(PLACEHOLDER_PREFIX))
    fail('repo.json "key" is not set. Run: node scripts/sign.mjs init');
  if (!KEY_RE.test(value)) fail('repo.json "key" is malformed: it must be 44 characters of base64 ending in "=".');
  const raw = Buffer.from(value, 'base64');
  if (raw.length !== 32 || raw.toString('base64') !== value)
    fail('repo.json "key" is malformed: it must decode to exactly 32 bytes.');
  return raw;
}

function generate() {
  const { privateKey } = generateKeyPairSync('ed25519');
  return {
    privateKey,
    pem: privateKey.export({ type: 'pkcs8', format: 'pem' }),
    raw: rawPublicOf(privateKey),
  };
}

function writeNewKeyFile(path, pem) {
  if (existsSync(path)) fail(`${path} already exists. Refusing to overwrite a key; choose another path.`);
  mkdirSync(dirname(path), { recursive: true });
  try {
    writeFileSync(path, pem, { flag: 'wx', mode: 0o600 });
  } catch (e) {
    fail(`could not write the key file ${path}: ${e.message}`);
  }
}

function expandHome(p) {
  return p === '~' || p.startsWith('~/') || p.startsWith('~\\') ? join(homedir(), p.slice(1)) : p;
}

function loadPrivateKey(keyPath, defaultPath) {
  let pem;
  let source;
  if (keyPath) {
    source = keyPath;
    if (!existsSync(keyPath)) fail(`key file not found: ${keyPath}`);
    pem = readFileSync(keyPath, 'utf8');
  } else if (process.env.MUDRIX_SIGNING_KEY) {
    source = 'MUDRIX_SIGNING_KEY';
    const p = expandHome(process.env.MUDRIX_SIGNING_KEY);
    if (!existsSync(p)) fail(`MUDRIX_SIGNING_KEY points to a file that does not exist: ${p}`);
    pem = readFileSync(p, 'utf8');
  } else if (process.env.MUDRIX_SIGNING_KEY_PEM) {
    source = 'MUDRIX_SIGNING_KEY_PEM';
    pem = process.env.MUDRIX_SIGNING_KEY_PEM.replace(/\\n/g, '\n');
  } else if (defaultPath && existsSync(defaultPath)) {
    source = defaultPath;
    pem = readFileSync(defaultPath, 'utf8');
  } else {
    fail('no signing key. Pass --key <path>, or set MUDRIX_SIGNING_KEY (a path) or MUDRIX_SIGNING_KEY_PEM (the PEM text).');
  }
  let k;
  try {
    k = createPrivateKey(pem);
  } catch {
    return fail(`could not read a private key from ${source}. It must be a PKCS8 PEM Ed25519 key as written by "init".`);
  }
  if (k.asymmetricKeyType !== 'ed25519') fail(`${source} is not an Ed25519 private key.`);
  return k;
}

// ---------- minimal JSON text editing (top-level properties only) ----------

/** Finds the top-level property `name`; returns spans of the whole property and of its value, or null. */
function findTopLevel(text, name) {
  let i = 0;
  const n = text.length;
  const skipWs = () => {
    while (i < n && /\s/.test(text[i])) i++;
  };
  const readString = () => {
    const start = i;
    i++;
    while (i < n && text[i] !== '"') i += text[i] === '\\' ? 2 : 1;
    i++;
    return { start, end: i };
  };
  const skipValue = () => {
    skipWs();
    if (text[i] === '"') return readString();
    const start = i;
    if (text[i] === '{' || text[i] === '[') {
      let depth = 0;
      while (i < n) {
        const c = text[i];
        if (c === '"') {
          readString();
          continue;
        }
        if (c === '{' || c === '[') depth++;
        else if (c === '}' || c === ']') {
          depth--;
          if (depth === 0) {
            i++;
            break;
          }
        }
        i++;
      }
    } else {
      while (i < n && !/[\s,}\]]/.test(text[i])) i++;
    }
    return { start, end: i };
  };
  if (text.charCodeAt(0) === 0xfeff) fail('repo.json starts with a byte order mark; save it as plain UTF-8.');
  skipWs();
  if (text[i] !== '{') return null;
  i++;
  for (;;) {
    skipWs();
    if (i >= n || text[i] === '}') return null;
    if (text[i] === ',') {
      i++;
      continue;
    }
    if (text[i] !== '"') return null;
    const k = readString();
    let keyName;
    try {
      keyName = JSON.parse(text.slice(k.start, k.end));
    } catch {
      return null;
    }
    skipWs();
    if (text[i] !== ':') return null;
    i++;
    const v = skipValue();
    if (keyName === name) return { prop: { start: k.start, end: v.end }, value: v };
  }
}

function setTopLevel(text, name, jsonValue, after) {
  const existing = findTopLevel(text, name);
  if (existing) return text.slice(0, existing.value.start) + jsonValue + text.slice(existing.value.end);
  const anchor = findTopLevel(text, after);
  if (!anchor) fail(`cannot add "${name}": repo.json has no top-level "${after}" to place it after.`);
  const lineStart = text.lastIndexOf('\n', anchor.prop.start) + 1;
  const lead = text.slice(lineStart, anchor.prop.start);
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const insert = lead.trim() === '' ? `,${eol}${lead}"${name}": ${jsonValue}` : `, "${name}": ${jsonValue}`;
  return text.slice(0, anchor.value.end) + insert + text.slice(anchor.value.end);
}

function readRepo(file) {
  if (!existsSync(file)) fail(`${file} not found.`);
  const bytes = readFileSync(file);
  const text = bytes.toString('utf8');
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    fail(`${file} is not valid JSON: ${e.message}`);
  }
  if (json === null || typeof json !== 'object' || Array.isArray(json)) fail(`${file} must contain a JSON object.`);
  return { bytes, text, json };
}

function checkSerial(serial) {
  if (!Number.isInteger(serial) || serial < 1 || serial > MAX_SERIAL)
    fail(`repo.json "serial" must be an integer from 1 to ${MAX_SERIAL}.`);
}

// ---------- signing / verifying ----------

const sigPathOf = (file) => `${file}.sig`;

function writeSignature(file, privateKey, expectedRaw) {
  const bytes = readFileSync(file);
  const sig = edSign(null, bytes, privateKey);
  if (!edVerify(null, bytes, publicKeyFromRaw(expectedRaw), sig)) fail('internal error: the signature just written does not verify.');
  writeFileSync(sigPathOf(file), sig.toString('base64') + '\n');
  // Re-read from disk and verify again, so what was written is what is checked.
  const back = Buffer.from(readFileSync(sigPathOf(file), 'utf8').trim(), 'base64');
  if (!edVerify(null, readFileSync(file), publicKeyFromRaw(expectedRaw), back)) fail('internal error: the written signature file does not verify.');
}

function verifyFile(file) {
  const { bytes, json } = readRepo(file);
  const raw = parseKeyField(json.key);
  checkSerial(json.serial);
  const sigPath = sigPathOf(file);
  if (!existsSync(sigPath)) fail(`${basename(sigPath)} is missing: this repository is not signed. Run: node scripts/sign.mjs sign --bump`);
  const b64 = readFileSync(sigPath, 'utf8').trim();
  const sig = Buffer.from(b64, 'base64');
  if (sig.length !== 64 || sig.toString('base64') !== b64)
    fail(`${basename(sigPath)} is not a valid signature (expected one line of base64 for 64 bytes).`);
  if (!edVerify(null, bytes, publicKeyFromRaw(raw), sig))
    fail(`bad signature: ${basename(file)} was changed after it was signed, or ${basename(sigPath)} belongs to another version. Run: node scripts/sign.mjs sign --bump`);
  return { raw, serial: json.serial };
}

// ---------- commands ----------

function slugOf(name) {
  const s = String(name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return s || 'repository';
}

function defaultKeyPath(name) {
  return join(homedir(), '.mudrix', 'keys', `${slugOf(name)}.key`);
}

function parseArgs(argv, valueFlags, boolFlags) {
  const out = { _: [] };
  for (let k = 0; k < argv.length; k++) {
    const a = argv[k];
    if (valueFlags.includes(a)) {
      if (k + 1 >= argv.length) fail(`${a} needs a value.`);
      out[a.slice(2)] = argv[++k];
    } else if (boolFlags.includes(a)) out[a.slice(2)] = true;
    else if (a.startsWith('--')) fail(`unknown option ${a}`);
    else out._.push(a);
  }
  return out;
}

function cmdKeygen(argv) {
  const a = parseArgs(argv, ['--out'], []);
  if (!a.out) fail('keygen needs --out <path>.');
  const path = resolve(expandHome(a.out));
  const k = generate();
  writeNewKeyFile(path, k.pem);
  console.log(`Public key:  ${k.raw.toString('base64')}`);
  console.log(`Fingerprint: ${fingerprintOfRaw(k.raw)}`);
  console.log(`Private key saved to ${path}`);
  console.log('BACK THIS KEY UP and never commit it.');
}

function cmdInit(argv) {
  const a = parseArgs(argv, ['--repo', '--key-out'], []);
  const file = resolve(a.repo ?? a._[0] ?? 'repo.json');
  const { text, json } = readRepo(file);
  if (typeof json.key === 'string' && !json.key.startsWith(PLACEHOLDER_PREFIX))
    fail(`${basename(file)} already has a key. "init" is only for a repository that has none yet; use "sign" with the key it was set up with.`);
  const keyPath = resolve(a['key-out'] ? expandHome(a['key-out']) : defaultKeyPath(json.name));
  if (existsSync(keyPath)) fail(`${keyPath} already exists. Refusing to overwrite a key; pass --key-out with another path.`);
  const k = generate();
  let next = setTopLevel(text, 'key', JSON.stringify(k.raw.toString('base64')), 'name');
  if (!Number.isInteger(json.serial)) next = setTopLevel(next, 'serial', '1', 'key');
  try {
    JSON.parse(next);
  } catch {
    fail('could not edit repo.json safely; add "key" and "serial" by hand, then use keygen and sign.');
  }
  writeNewKeyFile(keyPath, k.pem);
  writeFileSync(file, next);
  writeSignature(file, k.privateKey, k.raw);
  const serial = JSON.parse(next).serial;
  console.log(`Your repository is set up and signed (serial ${serial}).\n`);
  console.log(`  Fingerprint: ${fingerprintOfRaw(k.raw)}`);
  console.log(`  Private key: ${keyPath}\n`);
  console.log('  !!! BACK THIS KEY UP and never commit it. !!!');
  console.log('  If you lose it you cannot publish updates: readers would have to remove and re-add');
  console.log('  the repository under a new key. Keep a copy in a password manager.\n');
  console.log('Next steps');
  console.log(`  1. Edit ${basename(file)}.`);
  console.log('  2. Run: npm run sign   (raises the serial and signs again)');
  console.log(`  3. Commit and push ${basename(file)} and ${basename(sigPathOf(file))}.`);
  console.log('  4. Add the repository in Mudrix and check that the fingerprint it shows matches the one above.');
  console.log('\nTo sign later, tell the tool where the key is: --key <path> or the MUDRIX_SIGNING_KEY variable.');
  console.log(`(For example: ${process.platform === 'win32' ? '$env:MUDRIX_SIGNING_KEY' : 'export MUDRIX_SIGNING_KEY'}="${keyPath}")`);
  console.log('Without either, "npm run sign" looks for the key in the default place above.');
}

function committedRepo(file) {
  try {
    const out = execFileSync('git', ['show', `HEAD:./${basename(file)}`], {
      cwd: dirname(file),
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString('utf8');
    return { serial: JSON.parse(out).serial, text: out };
  } catch {
    return null;
  }
}

function cmdSign(argv) {
  const a = parseArgs(argv, ['--key'], ['--bump']);
  const file = resolve(a._[0] ?? 'repo.json');
  let { text, json } = readRepo(file);
  const raw = parseKeyField(json.key);
  checkSerial(json.serial);
  const priv = loadPrivateKey(a.key ? expandHome(a.key) : undefined, defaultKeyPath(json.name));
  if (!rawPublicOf(priv).equals(raw))
    fail('this is not the key this repository was set up with: the private key does not match the "key" in repo.json.');
  const before = json.serial;
  if (a.bump) {
    if (before >= MAX_SERIAL) fail('serial is already at its maximum.');
    text = setTopLevel(text, 'serial', String(before + 1), 'key');
    writeFileSync(file, text);
    json = readRepo(file).json;
  }
  const hadSig = existsSync(sigPathOf(file));
  writeSignature(file, priv, raw);
  console.log(`Signed ${basename(file)} -> ${basename(sigPathOf(file))}`);
  console.log(`  Fingerprint: ${fingerprintOfRaw(raw)}`);
  console.log(`  Serial:      ${json.serial}${a.bump ? ` (was ${before})` : ''}`);
  if (!a.bump) {
    const head = committedRepo(file);
    if (head && head.serial === json.serial && head.text !== text)
      console.log('\nReminder: repo.json changed but its serial is the same as in the last commit. Readers refuse a change that\ndoes not raise the serial. Run: npm run sign   (which uses --bump)');
    else if (!head && hadSig)
      console.log('\nReminder: if you changed repo.json since the last signature, raise "serial" (use --bump).');
  }
}

function cmdVerify(argv) {
  const a = parseArgs(argv, [], []);
  const file = resolve(a._[0] ?? 'repo.json');
  const { raw, serial } = verifyFile(file);
  console.log(`OK: ${basename(file)} is correctly signed.`);
  console.log(`  Fingerprint: ${fingerprintOfRaw(raw)}`);
  console.log(`  Serial:      ${serial}`);
}

function cmdFingerprint(argv) {
  if (argv.length !== 1) fail('usage: fingerprint <base64-key>');
  console.log(fingerprintOfRaw(parseKeyField(argv[0])));
}

const [cmd, ...rest] = process.argv.slice(2);
const commands = { init: cmdInit, keygen: cmdKeygen, sign: cmdSign, verify: cmdVerify, fingerprint: cmdFingerprint };
if (!commands[cmd]) {
  console.log(USAGE);
  process.exit(cmd === undefined || cmd === 'help' || cmd === '--help' ? 0 : 1);
}
try {
  commands[cmd](rest);
} catch (e) {
  if (e instanceof Fail) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
  throw e;
}
