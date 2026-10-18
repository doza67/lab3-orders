import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const run = args => spawnSync(process.execPath, ['index.js', ...args], { encoding: 'utf8' });
const json = args => {
  const result = run(args);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
};
test('Шість можливостей, аргументи, опції й прапорці', () => {
  assert.equal(json(['list']).length, 3);
  assert.equal(json(['list', '--limit', '1']).length, 1);
  assert.deepEqual(json(['list', '-l', '0']), []);
  assert.equal(json(['show', 'ORD-001']).payment.isPaid, true);
  assert.equal(json(['field', 'ORD-001', 'items.0.name']), 'Клавіатура');
  assert.equal(json(['field', 'ORD-001', 'delivery.comment']), null);
  assert.equal(json(['field', 'ORD-002', 'payment.isPaid']), false);
  for (const sort of ['name', 'quantity', 'price', 'sum']) {
    const ascending = json(['items', 'ORD-001', '--sort', sort]);
    const descending = json(['items', 'ORD-001', '-s', sort, '-d']);
    assert.deepEqual(descending, [...ascending].reverse());
  }
  assert.equal(json(['items', 'ORD-001'])[0].name, 'Килимок');
  assert.match(run(['total', 'ORD-001']).stdout, /2638\.69 грн/);
  assert.equal(json(['summary', 'ORD-002']).payment.isPaid, false);
  for (const command of ['', 'list', 'show', 'field', 'items', 'total', 'summary']) {
    const result = run([...(command ? [command] : []), '--help']);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Використання:/);
  }
  assert.equal(run(['help', 'items']).status, 0);
  assert.equal(run(['--version']).stdout.trim(), '1.0.0');
  assert.equal(run([]).status, 0);
});
test('Глобальний шлях до файлу до та після кожної команди', () => {
  const directory = mkdtempSync(join(tmpdir(), 'orders-'));
  try {
    const path = join(directory, 'custom data.json');
    const data = JSON.parse(readFileSync('data.json', 'utf8'));
    data.orders[0].id = 'CUSTOM';
    writeFileSync(path, JSON.stringify(data));
    for (const args of [['list'], ['show', 'CUSTOM'], ['field', 'CUSTOM', 'id'],
      ['items', 'CUSTOM'], ['total', 'CUSTOM'], ['summary', 'CUSTOM']]) {
      for (const call of [['--file', path, ...args], [...args, '-f', path]]) {
        const result = run(call);
        assert.equal(result.status, 0, result.stderr);
        assert.ok(!result.stdout.includes('ORD-001'));
      }
    }
    writeFileSync(path, '{');
    const invalid = run(['list', '-f', path]);
    assert.equal(invalid.status, 1);
    assert.match(invalid.stderr, /некоректний JSON/);
    writeFileSync(path, '{"orders":[]}');
    assert.deepEqual(json(['list', '-f', path]), []);
    data.orders[0].items = [];
    writeFileSync(path, JSON.stringify(data));
    assert.match(run(['total', 'CUSTOM', '-f', path]).stdout, /0\.00 грн/);
    writeFileSync(path, '{}');
    assert.equal(run(['list', '-f', path]).status, 1);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
test('Помилкові виклики завершуються кодом 1 без стеку', () => {
  for (const args of [['list', '--file', 'missing.json'], ['show', 'missing'],
    ['field', 'ORD-001', 'unknown'], ['field', 'ORD-001', 'delivery.comment.text'],
    ['field', 'ORD-001', '__proto__'], ['list', '--limit', 'abc'],
    ['list', '-l', '-1'], ['show'], ['field', 'ORD-001'], ['list', '--unknown'],
    ['items', 'ORD-001', '--sort', 'unknown'], ['list', '--file'], ['unknown'], ['list', 'extra']]) {
    const result = run(args);
    assert.equal(result.status, 1, args.join(' '));
    assert.match(result.stderr, /^Помилка:/);
    assert.doesNotMatch(result.stderr, /\n\s+at /);
  }
});
