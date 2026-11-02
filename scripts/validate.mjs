// GENERATED FILE, do not edit. Built from Mudrix's own repository validator
// (mudrix-web 4b75cc1c with local changes, src/app/features/integrations/manifest.ts) by
// scripts/build-integration-validator.mjs, so it checks exactly what Mudrix checks.
//
//   node scripts/validate.mjs [repo.json ...] [--dev]
//
// --dev accepts what only Mudrix development builds accept: localhost hosts, and a file without
// "key" and "serial" (examples/dev-repo.json). Node 20 or newer, no dependencies.
// scripts/integration-validator.entry.mjs
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// src/app/features/integrations/customEvents.ts
var MAX_WIDGET_EVENTS = 3;
var MIN_EVENT_TYPE = 5;
var MAX_EVENT_TYPE = 80;
var EVENT_TYPE_CHARS = /^[a-z0-9._-]+$/;
var SEGMENT = /^[a-z0-9][a-z0-9_-]*$/;
var RESERVED_PREFIXES = ["m.", "org.matrix.", "im.vector.", "io.element."];
function checkEventType(type) {
  if (typeof type !== "string") return "must be a string";
  if (type.length === 0) return "must not be empty";
  if (type.length < MIN_EVENT_TYPE || type.length > MAX_EVENT_TYPE)
    return `must be ${MIN_EVENT_TYPE} to ${MAX_EVENT_TYPE} characters`;
  if (!EVENT_TYPE_CHARS.test(type))
    return 'may only contain lowercase letters a-z, digits, ".", "_" and "-"';
  const parts = type.split(".");
  if (parts.length < 3)
    return 'must have at least 3 parts separated by "." (like com.example.app.sent)';
  if (parts.some((p) => p.length === 0)) return "must not have an empty part between dots";
  if (!parts.every((p) => SEGMENT.test(p)))
    return "every part between dots must start with a letter or digit";
  if (type === "m" || RESERVED_PREFIXES.some((p) => type.startsWith(p)))
    return 'must not start with "m.", "org.matrix.", "im.vector." or "io.element."';
  return null;
}

// src/app/features/integrations/signature.ts
var KEY_BYTES = 32;
var MAX_SERIAL = 2147483647;
var B64 = /^[A-Za-z0-9+/]*={0,2}$/;
function base64ToBytes(text) {
  if (typeof text !== "string" || text.length % 4 !== 0 || !B64.test(text)) return null;
  try {
    const bin = atob(text);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}
function isValidKey(keyB64) {
  return typeof keyB64 === "string" && keyB64.length === 44 && base64ToBytes(keyB64)?.length === KEY_BYTES;
}

// stub:matrix-widget-api
var EventDirection = { Send: "send", Receive: "receive" };
var cap = (kind) => (dir, type) => ({ raw: "stub." + kind + "." + dir + ":" + type });
var WidgetEventCapability = { forRoomEvent: cap("event"), forStateEvent: cap("state_event") };
var MatrixCapabilities = { MSC4039UploadFile: "stub.upload_file", MSC4039DownloadFile: "stub.download_file" };

// src/app/features/integrations/widgetCapabilities.ts
var roomEvent = (dir, type) => WidgetEventCapability.forRoomEvent(dir, type).raw;
var stateEvent = (dir, type) => WidgetEventCapability.forStateEvent(dir, type).raw;
var WIDGET_CAPABILITY_CATALOGUE = [
  {
    id: "send.message",
    capabilities: [roomEvent(EventDirection.Send, "m.room.message")],
    descriptionKey: "settings.integrations.widget.cap.send.message",
    risk: "high",
    needsTimeline: true
  },
  {
    id: "read.messages",
    capabilities: [roomEvent(EventDirection.Receive, "m.room.message")],
    descriptionKey: "settings.integrations.widget.cap.read.messages",
    risk: "high",
    needsTimeline: true
  },
  {
    id: "read.room",
    capabilities: [
      stateEvent(EventDirection.Receive, "m.room.name"),
      stateEvent(EventDirection.Receive, "m.room.topic")
    ],
    descriptionKey: "settings.integrations.widget.cap.read.room",
    risk: "low"
  },
  {
    id: "upload.file",
    capabilities: [MatrixCapabilities.MSC4039UploadFile],
    descriptionKey: "settings.integrations.widget.cap.upload.file",
    risk: "high"
  },
  {
    id: "download.file",
    capabilities: [MatrixCapabilities.MSC4039DownloadFile],
    descriptionKey: "settings.integrations.widget.cap.download.file",
    risk: "high"
  }
];
var WIDGET_CAPABILITY_IDS = WIDGET_CAPABILITY_CATALOGUE.map(
  (c) => c.id
);
var WIDGET_PARAMETERS = ["room_id", "user_id", "display_name"];

// src/app/features/integrations/manifest.ts
var MANIFEST_SCHEMA = 1;
var MAX_MANIFEST_BYTES = 256 * 1024;
var COMPOSER_ICON_NAMES = ["send", "download", "link", "plus"];
var SETTING_TYPES = ["toggle", "text", "choice"];
var LINK_FACT_FORMATS = ["text", "count", "date"];
var API_PLACEHOLDERS = ["room", "text", "args"];
var CAPABILITIES = [
  "linkCards",
  "linkDetails",
  "composerActions",
  "commands",
  "api",
  "widget"
];
function runsCode(p) {
  return p.widget !== void 0;
}
function hasCapability(p, c) {
  if (c === "api") return (p.api?.actions.length ?? 0) > 0;
  if (c === "linkDetails") return (p.linkDetails?.lookups.length ?? 0) > 0;
  if (c === "widget") return p.widget !== void 0;
  return (p[c]?.length ?? 0) > 0;
}
function isLocalDevHost(host) {
  const m = /^(localhost|127\.0\.0\.1)(?::(\d{1,5}))?$/.exec(host);
  return !!m && (m[2] === void 0 || Number(m[2]) <= 65535);
}
var ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;
var ACTION_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,31}$/;
var HOST_LABEL = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
var COMMAND_NAME_PATTERN = /^[a-z][a-z0-9-]{1,23}$/;
var API_PATH_PATTERN = /^\/[A-Za-z0-9._~/-]*$/;
var BODY_KEY_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
var RESULT_FIELD_PATTERN = /^[A-Za-z0-9_]{1,32}$/;
var MAX_REPO_NAME = 60;
var MAX_INTEGRATIONS = 50;
var MAX_NAME = 40;
var MAX_DESCRIPTION = 400;
var MAX_VERSION = 20;
var MAX_URL = 500;
var MAX_LINK_RULES = 10;
var MAX_HOSTS = 10;
var MAX_ACTIONS = 6;
var MAX_LABEL = 24;
var MAX_INSERT = 500;
var MAX_TEXT = 120;
var MAX_PATH_PREFIX = 200;
var MAX_API_ACTIONS = 4;
var MAX_API_PATH = 200;
var MAX_BODY_KEYS = 16;
var MAX_BODY_VALUE = 200;
var MAX_COMMANDS = 6;
var MAX_COMMAND_DESCRIPTION = 80;
var MAX_COMMAND_USAGE = 60;
var MAX_LOOKUPS = 4;
var MAX_FACTS = 6;
var MAX_PATH_EXCLUDES = 30;
var MAX_PATH_EXCLUDE = 100;
var MAX_SETTINGS = 8;
var MAX_SETTING_LABEL = 40;
var MAX_SETTING_DESCRIPTION = 120;
var MAX_SETTING_TEXT = 200;
var DEFAULT_SETTING_TEXT = 100;
var MAX_CHOICES = 8;
var SETTING_ID_PATTERN = /^[a-z][a-zA-Z0-9]{0,23}$/;
var CHOICE_VALUE_PATTERN = /^[A-Za-z0-9._~-]{1,40}$/;
var MAX_PATTERN_SEGMENTS = 8;
var PATTERN_NAME = /^[a-z][a-z0-9_]{0,15}$/;
var PATTERN_LITERAL = /^[A-Za-z0-9._~-]+$/;
var FIELD_PART = /^[A-Za-z0-9_]{1,32}$/;
var FORBIDDEN_FIELD_PARTS = ["__proto__", "constructor", "prototype"];
function parsePathPattern(pattern) {
  if (!pattern.startsWith("/")) return 'must start with "/"';
  const parts = pattern.slice(1).split("/");
  if (parts.length > MAX_PATTERN_SEGMENTS) return `at most ${MAX_PATTERN_SEGMENTS} segments`;
  const names = /* @__PURE__ */ new Set();
  const out = [];
  for (const part of parts) {
    const m = /^\{([^{}]*)\}$/.exec(part);
    if (m) {
      if (!PATTERN_NAME.test(m[1])) return `invalid placeholder name "${m[1]}"`;
      if (names.has(m[1])) return `placeholder {${m[1]}} is used twice`;
      names.add(m[1]);
      out.push({ name: m[1] });
    } else {
      if (!PATTERN_LITERAL.test(part) || part === "." || part === "..")
        return "each segment must be {name} or plain text (letters, digits, . _ ~ -)";
      out.push({ literal: part });
    }
  }
  return out;
}
function patternNames(pattern) {
  const parsed = parsePathPattern(pattern);
  return typeof parsed === "string" ? [] : parsed.flatMap((s) => "name" in s ? [s.name] : []);
}
var UNSAFE_CHARS = new RegExp(
  "[\0-\x7F-\x9F\xAD\u061C\u180E\u200B-\u200F\u2028-\u202E\u2060-\u206F\uFEFF\uFFF9-\uFFFB]"
);
function hasUnsafeChars(value) {
  return UNSAFE_CHARS.test(value);
}
var UNSAFE_CHARS_GLOBAL = new RegExp(UNSAFE_CHARS.source, "g");
function stripUnsafeChars(value) {
  return value.replace(UNSAFE_CHARS_GLOBAL, "");
}
var Fail = class extends Error {
};
var fail = (path, msg) => {
  throw new Fail(`${path}: ${msg}`);
};
function asObject(v, path, allowed) {
  if (typeof v !== "object" || v === null || Array.isArray(v))
    return fail(path, "must be an object");
  const obj = v;
  Object.keys(obj).forEach((k) => {
    if (!allowed.includes(k)) fail(`${path}.${k}`, "unknown key");
  });
  return obj;
}
function asArray(v, path, max) {
  if (!Array.isArray(v)) return fail(path, "must be an array");
  if (v.length > max) return fail(path, `at most ${max} entries`);
  return v;
}
function asString(v, path, max, min = 1) {
  if (typeof v !== "string") return fail(path, "must be a string");
  if (v.length < min) return fail(path, "must not be empty");
  if (v.length > max) return fail(path, `at most ${max} characters`);
  if (hasUnsafeChars(v)) return fail(path, "contains control or invisible characters");
  return v;
}
function asHttpsUrl(v, path) {
  const s = asString(v, path, MAX_URL);
  let u;
  try {
    u = new URL(s);
  } catch {
    return fail(path, "not a valid URL");
  }
  if (u.protocol !== "https:") return fail(path, "must be an https URL");
  if (u.username || u.password) return fail(path, "must not contain credentials");
  if (!u.hostname) return fail(path, "missing host");
  return s;
}
function isIpLike(host) {
  return host.includes(":") || host.startsWith("[") || /^[0-9.]+$/.test(host);
}
function asHost(v, path) {
  const s = asString(v, path, 253);
  if (s !== s.toLowerCase()) return fail(path, "must be lowercase");
  if (isIpLike(s)) return fail(path, "IP addresses are not allowed");
  const labels = s.split(".");
  if (labels.length < 2 || !labels.every((l) => HOST_LABEL.test(l)))
    return fail(path, "not a valid hostname (no wildcards or ports)");
  return s;
}
function optional(obj, key, read) {
  return obj[key] === void 0 ? void 0 : read(obj[key]);
}
function validateLinkCard(v, path, details, ids) {
  const o = asObject(v, path, [
    "hosts",
    "pathPrefix",
    "pathPattern",
    "pathExclude",
    "title",
    "subtitle",
    "buttonLabel",
    "icon",
    "details"
  ]);
  const hosts = asArray(o.hosts, `${path}.hosts`, MAX_HOSTS).map(
    (h, i) => asHost(h, `${path}.hosts[${i}]`)
  );
  if (hosts.length === 0) fail(`${path}.hosts`, "needs at least one host");
  if (new Set(hosts).size !== hosts.length) fail(`${path}.hosts`, "duplicate host");
  if (o.pathPrefix !== void 0 && o.pathPattern !== void 0)
    fail(path, 'use either "pathPrefix" or "pathPattern", not both');
  const pathPattern = optional(o, "pathPattern", (x) => {
    const p = asString(x, `${path}.pathPattern`, MAX_PATH_PREFIX);
    const parsed = parsePathPattern(p);
    if (typeof parsed === "string") fail(`${path}.pathPattern`, parsed);
    return p;
  });
  const names = pathPattern === void 0 ? void 0 : patternNames(pathPattern);
  const text = (x, at) => names === void 0 ? asTextWithSettings(x, at, MAX_TEXT, ids.text) : asTemplate(x, at, MAX_TEXT, names, 1, ids.text);
  const rule = { hosts, title: text(o.title, `${path}.title`) };
  const pathPrefix = optional(o, "pathPrefix", (x) => {
    const p = asString(x, `${path}.pathPrefix`, MAX_PATH_PREFIX);
    if (!p.startsWith("/")) fail(`${path}.pathPrefix`, 'must start with "/"');
    if (/[?#\s\\]/.test(p)) fail(`${path}.pathPrefix`, "must be a plain path");
    return p;
  });
  if (pathPrefix !== void 0) rule.pathPrefix = pathPrefix;
  if (pathPattern !== void 0) rule.pathPattern = pathPattern;
  const pathExclude = optional(
    o,
    "pathExclude",
    (x) => validatePathExclude(x, `${path}.pathExclude`)
  );
  if (pathExclude !== void 0) rule.pathExclude = pathExclude;
  const subtitle = optional(o, "subtitle", (x) => text(x, `${path}.subtitle`));
  if (subtitle !== void 0) rule.subtitle = subtitle;
  const detailsId = optional(o, "details", (x) => {
    const id = asString(x, `${path}.details`, 32);
    const lookup = details?.lookups.find((l) => l.id === id);
    if (!lookup)
      return fail(`${path}.details`, "no such lookup in permissions.linkDetails.lookups");
    if (names === void 0) return fail(`${path}.details`, 'needs a "pathPattern"');
    const missing = lookupNames(lookup.path).filter((n) => !names.includes(n));
    if (missing.length > 0)
      fail(
        `${path}.details`,
        `the lookup path uses ${missing.map((n) => `{${n}}`).join(", ")}, which this pathPattern does not capture`
      );
    return id;
  });
  if (detailsId !== void 0) rule.details = detailsId;
  const buttonLabel = optional(
    o,
    "buttonLabel",
    (x) => asString(x, `${path}.buttonLabel`, MAX_LABEL)
  );
  if (buttonLabel !== void 0) rule.buttonLabel = buttonLabel;
  const icon = optional(o, "icon", (x) => asHttpsUrl(x, `${path}.icon`));
  if (icon !== void 0) rule.icon = icon;
  return rule;
}
var TEMPLATE_PLACEHOLDER = /\{(\w+|setting\.[a-zA-Z0-9]+)\}/g;
var NO_SETTINGS = { text: [], choice: [], toggle: [] };
function asTemplate(v, path, max, allowed, min = 1, settingIds = []) {
  const s = asString(v, path, max, min);
  const rest = s.replace(TEMPLATE_PLACEHOLDER, (m, name) => {
    if (name.startsWith("setting.")) {
      if (!settingIds.includes(name.slice(8)))
        fail(
          path,
          `{${name}} is not a setting that can be used here (declare it in "settings"; toggles only work in "if", and only choice settings can be sent in an api body)`
        );
      return "";
    }
    return allowed.includes(name) ? "" : m;
  });
  if (rest.includes("{") || rest.includes("}"))
    fail(
      path,
      `only the ${[...allowed.map((a) => `{${a}}`), ...settingIds.map((id) => `{setting.${id}}`)].join(", ") || "no"} placeholder(s) are allowed`
    );
  return s;
}
function asTextWithSettings(v, path, max, settingIds) {
  const s = asString(v, path, max);
  for (const m of s.matchAll(TEMPLATE_PLACEHOLDER)) {
    const name = m[1];
    if (name.startsWith("setting.") && !settingIds.includes(name.slice(8)))
      fail(path, `{${name}} is not a declared text or choice setting`);
  }
  return s;
}
function validateSetting(v, path) {
  const o = asObject(v, path, [
    "id",
    "label",
    "description",
    "type",
    "default",
    "maxLength",
    "options"
  ]);
  const id = asString(o.id, `${path}.id`, 24);
  if (!SETTING_ID_PATTERN.test(id))
    fail(`${path}.id`, "must start with a lowercase letter, then letters and digits (up to 24)");
  const label = asString(o.label, `${path}.label`, MAX_SETTING_LABEL);
  const description = optional(
    o,
    "description",
    (x) => asString(x, `${path}.description`, MAX_SETTING_DESCRIPTION)
  );
  const base = { id, label, ...description !== void 0 ? { description } : {} };
  if (typeof o.type !== "string" || !SETTING_TYPES.includes(o.type))
    return fail(`${path}.type`, `must be one of ${SETTING_TYPES.join(", ")}`);
  const only = (key, type) => {
    if (o[key] !== void 0) fail(`${path}.${key}`, `only for "${type}" settings`);
  };
  if (o.type === "toggle") {
    only("maxLength", "text");
    only("options", "choice");
    if (typeof o.default !== "boolean") fail(`${path}.default`, "must be true or false");
    return { ...base, type: "toggle", default: o.default };
  }
  if (o.type === "text") {
    only("options", "choice");
    const maxLength = o.maxLength === void 0 ? DEFAULT_SETTING_TEXT : typeof o.maxLength === "number" && Number.isInteger(o.maxLength) && o.maxLength >= 1 && o.maxLength <= MAX_SETTING_TEXT ? o.maxLength : fail(`${path}.maxLength`, `must be a whole number from 1 to ${MAX_SETTING_TEXT}`);
    const def = asString(o.default, `${path}.default`, maxLength, 0);
    return { ...base, type: "text", default: def, maxLength };
  }
  only("maxLength", "text");
  const options = asArray(o.options, `${path}.options`, MAX_CHOICES).map((c, i) => {
    const co = asObject(c, `${path}.options[${i}]`, ["value", "label"]);
    const value = asString(co.value, `${path}.options[${i}].value`, 40);
    if (!CHOICE_VALUE_PATTERN.test(value))
      fail(`${path}.options[${i}].value`, "letters, digits and . _ ~ - only (up to 40)");
    return { value, label: asString(co.label, `${path}.options[${i}].label`, MAX_SETTING_LABEL) };
  });
  if (options.length < 2) fail(`${path}.options`, "needs at least two options");
  if (new Set(options.map((c) => c.value)).size !== options.length)
    fail(`${path}.options`, "duplicate option value");
  if (typeof o.default !== "string" || !options.some((c) => c.value === o.default))
    fail(`${path}.default`, "must be the value of one of the options");
  return { ...base, type: "choice", default: o.default, options };
}
function validateSettings(v, path) {
  const list = asArray(v, path, MAX_SETTINGS).map((s, i) => validateSetting(s, `${path}[${i}]`));
  if (new Set(list.map((s) => s.id)).size !== list.length) fail(path, "duplicate setting id");
  return list;
}
function settingIdsOf(settings) {
  const of = (...types) => (settings ?? []).filter((s) => types.includes(s.type)).map((s) => s.id);
  return { text: of("text", "choice"), choice: of("choice"), toggle: of("toggle") };
}
function asToggleRef(v, path, ids) {
  const s = asString(v, path, 24);
  if (!ids.toggle.includes(s)) fail(path, 'must be the id of a toggle setting in "settings"');
  return s;
}
function validatePathExclude(v, path) {
  const list = asArray(v, path, MAX_PATH_EXCLUDES).map((x, i) => {
    const p = asString(x, `${path}[${i}]`, MAX_PATH_EXCLUDE);
    if (!p.startsWith("/") || p === "/") fail(`${path}[${i}]`, 'must start with "/" and not be "/"');
    if (/[?#\s\\{}]/.test(p)) fail(`${path}[${i}]`, "must be a plain path");
    return p;
  });
  if (list.length === 0) fail(path, "leave it out instead of giving an empty list");
  if (new Set(list.map((p) => p.toLowerCase())).size !== list.length)
    fail(path, "duplicate path");
  return list;
}
var validateInsert = (v, path, ids) => asTemplate(v, path, MAX_INSERT, ["room"], 1, ids.text);
function asApiHost(v, path) {
  const s = asString(v, path, 253);
  if (globalThis.__MUDRIX_DEV__ && isLocalDevHost(s)) return s;
  return asHost(s, path);
}
function validateApiAction(v, path, ids) {
  const o = asObject(v, path, ["id", "label", "path", "body", "insertResultLink"]);
  const id = asString(o.id, `${path}.id`, 32);
  if (!ACTION_ID_PATTERN.test(id)) fail(`${path}.id`, "invalid id");
  const apiPath = asString(o.path, `${path}.path`, MAX_API_PATH);
  if (!API_PATH_PATTERN.test(apiPath) || apiPath.split("/").some((s) => s === ".." || s === "."))
    fail(`${path}.path`, 'must start with "/" and be a plain path (letters, digits, . _ ~ / -)');
  const action = {
    id,
    label: asString(o.label, `${path}.label`, MAX_LABEL),
    path: apiPath
  };
  const body = optional(o, "body", (x) => {
    if (typeof x !== "object" || x === null || Array.isArray(x))
      return fail(`${path}.body`, "must be an object");
    const keys = Object.keys(x);
    if (keys.length > MAX_BODY_KEYS) fail(`${path}.body`, `at most ${MAX_BODY_KEYS} keys`);
    const out = {};
    keys.forEach((k) => {
      if (!BODY_KEY_PATTERN.test(k) || k === "__proto__") fail(`${path}.body.${k}`, "invalid key");
      out[k] = asTemplate(
        x[k],
        `${path}.body.${k}`,
        MAX_BODY_VALUE,
        API_PLACEHOLDERS,
        0,
        ids.choice
      );
    });
    return out;
  });
  if (body !== void 0) action.body = body;
  const link = optional(o, "insertResultLink", (x) => {
    if (typeof x !== "string" || !RESULT_FIELD_PATTERN.test(x))
      fail(`${path}.insertResultLink`, "must be a plain JSON field name");
    return x;
  });
  if (link !== void 0) action.insertResultLink = link;
  return action;
}
function validateApi(v, path, ids) {
  const o = asObject(v, path, ["host", "actions"]);
  const host = asApiHost(o.host, `${path}.host`);
  const actions = asArray(o.actions, `${path}.actions`, MAX_API_ACTIONS).map(
    (a, i) => validateApiAction(a, `${path}.actions[${i}]`, ids)
  );
  if (actions.length === 0) fail(`${path}.actions`, "needs at least one action");
  if (new Set(actions.map((a) => a.id)).size !== actions.length)
    fail(`${path}.actions`, "duplicate action id");
  return { host, actions };
}
var LOOKUP_PLACEHOLDER = /\{([a-z][a-z0-9_]{0,15})\}/g;
function lookupNames(lookupPath) {
  return [...lookupPath.matchAll(LOOKUP_PLACEHOLDER)].map((m) => m[1]);
}
function asField(v, path) {
  const s = asString(v, path, 140);
  const parts = s.split(".");
  if (parts.length > 4 || !parts.every((p) => FIELD_PART.test(p) && !FORBIDDEN_FIELD_PARTS.includes(p)))
    fail(
      path,
      'must be a JSON field name, or up to 4 of them joined with "." (such as owner.login)'
    );
  return s;
}
function validateFact(v, path, ids) {
  const o = asObject(v, path, ["label", "field", "format", "if"]);
  const fact = {
    label: asString(o.label, `${path}.label`, MAX_LABEL),
    field: asField(o.field, `${path}.field`)
  };
  const format = optional(o, "format", (x) => {
    if (typeof x !== "string" || !LINK_FACT_FORMATS.includes(x))
      fail(`${path}.format`, `must be one of ${LINK_FACT_FORMATS.join(", ")}`);
    return x;
  });
  if (format !== void 0) fact.format = format;
  const cond = optional(o, "if", (x) => asToggleRef(x, `${path}.if`, ids));
  if (cond !== void 0) fact.if = cond;
  return fact;
}
function validateLookup(v, path, ids) {
  const o = asObject(v, path, ["id", "path", "title", "description", "descriptionIf", "facts"]);
  const id = asString(o.id, `${path}.id`, 32);
  if (!ACTION_ID_PATTERN.test(id)) fail(`${path}.id`, "invalid id");
  const lookupPath = asString(o.path, `${path}.path`, MAX_API_PATH);
  const rest = lookupPath.replace(LOOKUP_PLACEHOLDER, "x");
  if (!API_PATH_PATTERN.test(rest) || rest.split("/").some((s) => s === ".." || s === ".") || lookupPath.split("/").some((s) => s === "." || s === ".."))
    fail(
      `${path}.path`,
      'must start with "/" and be a plain path (letters, digits, . _ ~ / -) with {name} placeholders'
    );
  const lookup = { id, path: lookupPath };
  const title = optional(o, "title", (x) => asField(x, `${path}.title`));
  if (title !== void 0) lookup.title = title;
  const description = optional(o, "description", (x) => asField(x, `${path}.description`));
  if (description !== void 0) lookup.description = description;
  const descriptionIf = optional(o, "descriptionIf", (x) => {
    if (description === void 0)
      fail(`${path}.descriptionIf`, 'only makes sense together with "description"');
    return asToggleRef(x, `${path}.descriptionIf`, ids);
  });
  if (descriptionIf !== void 0) lookup.descriptionIf = descriptionIf;
  const facts = optional(
    o,
    "facts",
    (x) => asArray(x, `${path}.facts`, MAX_FACTS).map(
      (f, i) => validateFact(f, `${path}.facts[${i}]`, ids)
    )
  );
  if (facts !== void 0 && facts.length > 0) lookup.facts = facts;
  if (!lookup.title && !lookup.description && !lookup.facts)
    fail(path, 'shows nothing: give it a "title", a "description" or "facts"');
  return lookup;
}
function validateLinkDetails(v, path, ids) {
  const o = asObject(v, path, ["host", "lookups"]);
  const host = asApiHost(o.host, `${path}.host`);
  const lookups = asArray(o.lookups, `${path}.lookups`, MAX_LOOKUPS).map(
    (l, i) => validateLookup(l, `${path}.lookups[${i}]`, ids)
  );
  if (lookups.length === 0) fail(`${path}.lookups`, "needs at least one lookup");
  if (new Set(lookups.map((l) => l.id)).size !== lookups.length)
    fail(`${path}.lookups`, "duplicate lookup id");
  return { host, lookups };
}
function validateWidget(v, path) {
  const o = asObject(v, path, [
    "url",
    "name",
    "capabilities",
    "parameters",
    "events",
    "fromLinks",
    "linkLabel",
    "saveFiles"
  ]);
  const raw = asString(o.url, `${path}.url`, MAX_URL);
  let u;
  try {
    u = new URL(raw);
  } catch {
    return fail(`${path}.url`, "not a valid URL");
  }
  const devLocal = globalThis.__MUDRIX_DEV__ && u.protocol === "http:" && isLocalDevHost(u.host);
  if (u.protocol !== "https:" && !devLocal) fail(`${path}.url`, "must be an https URL");
  if (u.username || u.password) fail(`${path}.url`, "must not contain credentials");
  if (!devLocal) asHost(u.hostname, `${path}.url`);
  if (raw.includes("#")) fail(`${path}.url`, "must not have a fragment");
  if (raw.includes("$")) fail(`${path}.url`, "template variables are not supported");
  if (u.searchParams.has("theme") || u.searchParams.has("lang"))
    fail(`${path}.url`, "theme and lang are added by the client");
  const capabilities = asArray(
    o.capabilities,
    `${path}.capabilities`,
    WIDGET_CAPABILITY_IDS.length
  ).map((c, i) => {
    if (typeof c !== "string" || !WIDGET_CAPABILITY_IDS.includes(c))
      return fail(
        `${path}.capabilities[${i}]`,
        `must be one of ${WIDGET_CAPABILITY_IDS.join(", ")}`
      );
    return c;
  });
  if (new Set(capabilities).size !== capabilities.length)
    fail(`${path}.capabilities`, "duplicate capability");
  const widget = { url: raw, capabilities };
  const name = optional(o, "name", (x) => asString(x, `${path}.name`, MAX_NAME));
  if (name !== void 0) widget.name = name;
  const parameters = optional(o, "parameters", (x) => {
    const list = asArray(x, `${path}.parameters`, WIDGET_PARAMETERS.length).map((p, i) => {
      if (typeof p !== "string" || !WIDGET_PARAMETERS.includes(p))
        return fail(`${path}.parameters[${i}]`, `must be one of ${WIDGET_PARAMETERS.join(", ")}`);
      return p;
    });
    if (new Set(list).size !== list.length) fail(`${path}.parameters`, "duplicate parameter");
    return list;
  });
  if (parameters !== void 0) widget.parameters = parameters;
  const events = optional(o, "events", (x) => {
    const list = asArray(x, `${path}.events`, MAX_WIDGET_EVENTS).map((e, i) => {
      const problem = checkEventType(e);
      if (problem !== null) return fail(`${path}.events[${i}]`, problem);
      return e;
    });
    if (new Set(list).size !== list.length) fail(`${path}.events`, "duplicate event type");
    return list;
  });
  if (events !== void 0 && events.length > 0) widget.events = events;
  const mustBeTrue = (key) => (x) => x === true ? true : fail(`${path}.${key}`, "must be true (or left out)");
  if (optional(o, "fromLinks", mustBeTrue("fromLinks"))) widget.fromLinks = true;
  if (optional(o, "saveFiles", mustBeTrue("saveFiles"))) widget.saveFiles = true;
  const linkLabel = optional(o, "linkLabel", (x) => asString(x, `${path}.linkLabel`, 24));
  if (linkLabel !== void 0) {
    if (!widget.fromLinks) fail(`${path}.linkLabel`, "only makes sense together with fromLinks");
    widget.linkLabel = linkLabel;
  }
  return widget;
}
function validateCommand(v, path, api, widget, ids) {
  const o = asObject(v, path, ["name", "description", "usage", "insert", "api", "widget"]);
  const name = asString(o.name, `${path}.name`, 24);
  if (!COMMAND_NAME_PATTERN.test(name)) fail(`${path}.name`, "invalid command name");
  const cmd = {
    name,
    description: asString(o.description, `${path}.description`, MAX_COMMAND_DESCRIPTION)
  };
  const usage = optional(o, "usage", (x) => {
    const u = asString(x, `${path}.usage`, MAX_COMMAND_USAGE);
    if (u !== `/${name}` && !u.startsWith(`/${name} `))
      fail(`${path}.usage`, `must start with "/${name}"`);
    return u;
  });
  if (usage !== void 0) cmd.usage = usage;
  if ([o.insert, o.api, o.widget].filter((x) => x !== void 0).length !== 1)
    fail(path, 'needs exactly one of "insert", "api" or "widget"');
  if (o.widget !== void 0) {
    if (o.widget !== true) fail(`${path}.widget`, "must be true");
    if (!widget) fail(`${path}.widget`, "requires permissions.widget");
    cmd.widget = true;
  } else if (o.insert !== void 0)
    cmd.insert = asTemplate(o.insert, `${path}.insert`, MAX_INSERT, ["room", "args"], 1, ids.text);
  else {
    const target = asString(o.api, `${path}.api`, 32);
    if (!api?.actions.some((a) => a.id === target))
      fail(`${path}.api`, "no such action in permissions.api.actions");
    cmd.api = target;
  }
  return cmd;
}
function validateAction(v, path, ids) {
  const o = asObject(v, path, ["id", "label", "icon", "insert"]);
  const id = asString(o.id, `${path}.id`, 32);
  if (!ACTION_ID_PATTERN.test(id)) fail(`${path}.id`, "invalid id");
  const action = {
    id,
    label: asString(o.label, `${path}.label`, MAX_LABEL),
    insert: validateInsert(o.insert, `${path}.insert`, ids)
  };
  const icon = optional(o, "icon", (x) => {
    if (typeof x !== "string" || !COMPOSER_ICON_NAMES.includes(x))
      fail(`${path}.icon`, `must be one of ${COMPOSER_ICON_NAMES.join(", ")}`);
    return x;
  });
  if (icon !== void 0) action.icon = icon;
  return action;
}
function validatePermissions(v, path, ids = NO_SETTINGS) {
  const o = asObject(v, path, CAPABILITIES);
  const out = {};
  const details = o.linkDetails === void 0 ? void 0 : validateLinkDetails(o.linkDetails, `${path}.linkDetails`, ids);
  if (o.linkCards !== void 0) {
    out.linkCards = asArray(o.linkCards, `${path}.linkCards`, MAX_LINK_RULES).map(
      (r, i) => validateLinkCard(r, `${path}.linkCards[${i}]`, details, ids)
    );
  }
  if (details) {
    details.lookups.forEach((l, i) => {
      if (!out.linkCards?.some((r) => r.details === l.id))
        fail(`${path}.linkDetails.lookups[${i}]`, `no link card uses lookup "${l.id}"`);
    });
    out.linkDetails = details;
  }
  if (o.composerActions !== void 0) {
    const actions = asArray(o.composerActions, `${path}.composerActions`, MAX_ACTIONS).map(
      (a, i) => validateAction(a, `${path}.composerActions[${i}]`, ids)
    );
    if (new Set(actions.map((a) => a.id)).size !== actions.length)
      fail(`${path}.composerActions`, "duplicate action id");
    out.composerActions = actions;
  }
  if (o.api !== void 0) out.api = validateApi(o.api, `${path}.api`, ids);
  if (o.widget !== void 0) out.widget = validateWidget(o.widget, `${path}.widget`);
  if (o.commands !== void 0) {
    const commands = asArray(o.commands, `${path}.commands`, MAX_COMMANDS).map(
      (c, i) => validateCommand(c, `${path}.commands[${i}]`, out.api, out.widget, ids)
    );
    if (new Set(commands.map((c) => c.name)).size !== commands.length)
      fail(`${path}.commands`, "duplicate command name");
    out.commands = commands;
  }
  return out;
}
function validateIntegration(v, path) {
  const o = asObject(v, path, [
    "id",
    "name",
    "description",
    "version",
    "icon",
    "permissions",
    "settings"
  ]);
  const id = asString(o.id, `${path}.id`, 64);
  if (!ID_PATTERN.test(id)) fail(`${path}.id`, "invalid id");
  const settings = optional(o, "settings", (x) => validateSettings(x, `${path}.settings`));
  const integration = {
    id,
    name: asString(o.name, `${path}.name`, MAX_NAME),
    description: asString(o.description, `${path}.description`, MAX_DESCRIPTION),
    version: asString(o.version, `${path}.version`, MAX_VERSION),
    permissions: validatePermissions(o.permissions, `${path}.permissions`, settingIdsOf(settings))
  };
  const icon = optional(o, "icon", (x) => asHttpsUrl(x, `${path}.icon`));
  if (icon !== void 0) integration.icon = icon;
  if (settings !== void 0 && settings.length > 0) integration.settings = settings;
  return integration;
}
function looksNewer(error) {
  return / unknown key$| must be one of /.test(error);
}
function describeRejected(v, index, error) {
  const o = typeof v === "object" && v !== null && !Array.isArray(v) ? v : {};
  const out = {
    index,
    error,
    reason: looksNewer(error) ? "unsupported" : "invalid"
  };
  if (typeof o.id === "string" && ID_PATTERN.test(o.id)) out.id = o.id;
  if (typeof o.name === "string") {
    const name = stripUnsafeChars(o.name).trim().slice(0, MAX_NAME);
    if (name) out.name = name;
  }
  return out;
}
function validateManifest(raw) {
  try {
    const o = asObject(raw, "repo", ["schema", "key", "serial", "name", "integrations"]);
    if (o.schema !== MANIFEST_SCHEMA) fail("repo.schema", `must be ${MANIFEST_SCHEMA}`);
    const key = asString(o.key, "repo.key", 44, 44);
    if (!isValidKey(key)) fail("repo.key", "must be base64 of a 32-byte public key");
    const serial = o.serial;
    if (typeof serial !== "number" || !Number.isInteger(serial) || serial < 1 || serial > MAX_SERIAL)
      fail("repo.serial", `must be an integer from 1 to ${MAX_SERIAL}`);
    const name = asString(o.name, "repo.name", MAX_REPO_NAME);
    const integrations = [];
    const rejected = [];
    const seen = /* @__PURE__ */ new Set();
    asArray(o.integrations, "repo.integrations", MAX_INTEGRATIONS).forEach((it, i) => {
      const path = `repo.integrations[${i}]`;
      try {
        const integration = validateIntegration(it, path);
        if (seen.has(integration.id)) fail(`${path}.id`, "duplicate integration id");
        seen.add(integration.id);
        integrations.push(integration);
      } catch (e) {
        if (!(e instanceof Fail)) throw e;
        rejected.push(describeRejected(it, i, e.message));
      }
    });
    return {
      ok: true,
      value: {
        schema: MANIFEST_SCHEMA,
        key,
        serial,
        name,
        integrations,
        rejected
      }
    };
  } catch (e) {
    return { ok: false, error: e instanceof Fail ? e.message : "invalid repository file" };
  }
}
function parseManifestText(text) {
  try {
    if (new TextEncoder().encode(text).length > MAX_MANIFEST_BYTES)
      return { ok: false, error: "repository file is too large (max 256 KB)" };
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      return { ok: false, error: "repository file is not valid JSON" };
    }
    return validateManifest(json);
  } catch {
    return { ok: false, error: "invalid repository file" };
  }
}

// scripts/integration-validator.entry.mjs
var PLACEHOLDER_KEY = /^REPLACE_ME/;
var DEV_KEY = "A".repeat(43) + "=";
function checkRepoText(text, { dev = false } = {}) {
  globalThis.__MUDRIX_DEV__ = dev;
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: `not valid JSON: ${e.message}` };
  }
  if (json && typeof json === "object" && !Array.isArray(json)) {
    if (typeof json.key === "string" && PLACEHOLDER_KEY.test(json.key))
      return { ok: false, error: "repo.key is not set yet. Run: npm run init" };
    if (dev && json.key === void 0 && json.serial === void 0) {
      const { schema, name, ...rest } = json;
      text = JSON.stringify({ schema, name, key: DEV_KEY, serial: 1, ...rest });
    }
  }
  const res = parseManifestText(text);
  if (!res.ok) return res;
  const { rejected } = res.value;
  if (rejected.length > 0) {
    const lines = rejected.map(
      (r) => `  ${r.error}${r.reason === "unsupported" ? " (not known to this Mudrix version: update scripts/validate.mjs if a newer Mudrix supports it)" : ""}`
    );
    return {
      ok: false,
      error: `${rejected.length} integration${rejected.length === 1 ? "" : "s"} would not be usable in Mudrix:
${lines.join("\n")}`
    };
  }
  return { ok: true, manifest: res.value };
}
function describe(manifest) {
  return manifest.integrations.map((i) => {
    const caps = CAPABILITIES.filter((c) => hasCapability(i.permissions, c));
    return `  ${i.id} ${i.version}: ${caps.length ? caps.join(", ") : "no permissions"}${runsCode(i.permissions) ? "  (RUNS CODE)" : ""}`;
  });
}
function main(argv) {
  const dev = argv.includes("--dev");
  const files = argv.filter((a) => !a.startsWith("--"));
  if (argv.includes("--help")) {
    console.log(
      "Usage: node scripts/validate.mjs [repo.json ...] [--dev]\n  --dev  accept what only Mudrix development builds accept (localhost hosts, no key or serial)"
    );
    return 0;
  }
  let failed = 0;
  for (const file of files.length ? files : ["repo.json"]) {
    let text;
    try {
      text = readFileSync(resolve(file), "utf8");
    } catch {
      console.error(`${file}: not found`);
      failed += 1;
      continue;
    }
    const res = checkRepoText(text, { dev });
    if (!res.ok) {
      console.error(`${file}: ${res.error}`);
      failed += 1;
    } else {
      const n = res.manifest.integrations.length;
      console.log(
        `OK: ${file} passes Mudrix's checks${dev ? " (development build rules)" : ""}, ${n} integration${n === 1 ? "" : "s"}:`
      );
      describe(res.manifest).forEach((l) => console.log(l));
    }
  }
  return failed ? 1 : 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2));
}
export {
  checkRepoText,
  describe
};
