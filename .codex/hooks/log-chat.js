#!/usr/bin/env node
/*
 * Codex lifecycle hook: appends user prompts and final assistant replies to
 * daily Markdown logs under chats/YYYY-MM-DD.md.
 *
 * UserPromptSubmit provides the real user prompt and Stop provides the final
 * assistant message, so this script deliberately avoids parsing the Codex
 * transcript JSONL (its wire format is not a stable hook interface).
 */

var crypto = require('crypto');
var fs = require('fs');
var path = require('path');

var PROJECT_ROOT = path.join(__dirname, '..', '..');
var CHATS_DIR = process.env.CACTIFY_CODEX_CHATLOG_DIR || path.join(PROJECT_ROOT, 'chats');
var STATE_FILE = process.env.CACTIFY_CODEX_CHATLOG_STATE || path.join(__dirname, '.chatlog-state.json');
var MAX_SEEN_EVENTS = 5000;

var SYSTEM_TAGS = [
  'ide_opened_file',
  'ide_selection',
  'ide_diagnostics',
  'system-reminder',
  'user-prompt-submit-hook'
];

function readInput() {
  try {
    return JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  } catch (e) {
    return null;
  }
}

function loadState() {
  try {
    var state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    if (state && state.version === 1 && state.seen && typeof state.seen === 'object') {
      return state;
    }
  } catch (e) {
    // A missing or obsolete state file simply starts a fresh deduplication set.
  }
  return { version: 1, seen: {} };
}

function saveState(state) {
  var stateDir = path.dirname(STATE_FILE);
  fs.mkdirSync(stateDir, { recursive: true });
  var tempFile = STATE_FILE + '.tmp-' + process.pid;
  fs.writeFileSync(tempFile, JSON.stringify(state, null, 2) + '\n');
  fs.renameSync(tempFile, STATE_FILE);
}

function pad(n) {
  return n < 10 ? '0' + n : String(n);
}

function dateKey(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function timeKey(d) {
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function cleanUserText(text) {
  var cleaned = text;
  for (var i = 0; i < SYSTEM_TAGS.length; i++) {
    var tag = SYSTEM_TAGS[i];
    var re = new RegExp('<' + tag + '>[\\s\\S]*?<\\/' + tag + '>', 'g');
    cleaned = cleaned.replace(re, '');
  }
  return cleaned.replace(/\n{3,}/g, '\n\n').trim();
}

function eventText(input) {
  if (input.hook_event_name === 'UserPromptSubmit' && typeof input.prompt === 'string') {
    return { role: 'User', text: cleanUserText(input.prompt) };
  }
  if (input.hook_event_name === 'Stop' && typeof input.last_assistant_message === 'string') {
    return { role: 'Assistant', text: input.last_assistant_message.trim() };
  }
  return null;
}

function eventKey(input, entry) {
  var identity = [
    input.hook_event_name || '',
    input.session_id || '',
    input.turn_id || ''
  ].join('|');

  if (!input.session_id || !input.turn_id) {
    identity += '|' + crypto.createHash('sha256').update(entry.text).digest('hex');
  }
  return identity;
}

function pruneSeen(seen) {
  var keys = Object.keys(seen);
  if (keys.length <= MAX_SEEN_EVENTS) {
    return;
  }
  keys.sort(function (a, b) { return seen[a] - seen[b]; });
  keys.slice(0, keys.length - MAX_SEEN_EVENTS).forEach(function (key) {
    delete seen[key];
  });
}

function appendEntry(entry, now) {
  fs.mkdirSync(CHATS_DIR, { recursive: true });
  var dKey = dateKey(now);
  var filePath = path.join(CHATS_DIR, dKey + '.md');
  var block = '## ' + timeKey(now) + ' - ' + entry.role + '\n\n' + entry.text + '\n\n---\n';

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '# Chat log - ' + dKey + '\n\n' + block);
  } else {
    fs.appendFileSync(filePath, '\n' + block);
  }
}

function main() {
  var input = readInput();
  if (!input) {
    return;
  }

  var entry = eventText(input);
  if (!entry || !entry.text) {
    return;
  }

  var state = loadState();
  var key = eventKey(input, entry);
  if (state.seen[key]) {
    return;
  }

  var now = new Date();
  appendEntry(entry, now);
  state.seen[key] = now.getTime();
  pruneSeen(state.seen);
  saveState(state);
}

main();
