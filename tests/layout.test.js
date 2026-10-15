import test from 'node:test';
import assert from 'node:assert/strict';
import { canvasGeometry } from '../layout.js';

test('drawing scale follows the displayed canvas, even in a wide desktop window', () => {
  const desktop = canvasGeometry(390, 844, 2);
  assert.equal(desktop.pixelWidth, 780);
  assert.equal(desktop.scale, 2);
  assert.equal(desktop.logicalHeight, 844);
});

test('narrow phone keeps the same 390-unit design without stretching', () => {
  const phone = canvasGeometry(320, 568, 3);
  assert.equal(phone.pixelWidth, 640);
  assert.equal(phone.logicalHeight, 692.25);
  assert.equal(phone.scale, 640 / 390);
});

test('fluid desktop keeps vertical content readable instead of magnifying a phone page', () => {
 const desktop=canvasGeometry(1440,964,2);
 assert.equal(desktop.pixelWidth,2880);
 assert.equal(desktop.verticalScale,2.3);
 assert.ok(desktop.logicalHeight>=838);
});
