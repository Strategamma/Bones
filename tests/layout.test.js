import test from 'node:test';
import assert from 'node:assert/strict';
import { canvasGeometry, desktopTableLayout } from '../layout.js';

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

test('desktop uses a wider coordinate space with uniform scaling', () => {
 const desktop=canvasGeometry(1440,900,2);
 assert.equal(desktop.pixelWidth,2880);
 assert.equal(desktop.verticalScale,desktop.scale);
 assert.ok(desktop.logicalWidth>=1000);
 assert.ok(desktop.logicalHeight>=700);
});

test('desktop seats use three compact columns and leave room for actions',()=>{
 for(const width of [768,900,1024,1440,2560]){
  const viewport=canvasGeometry(width,900,1);
  for(const reveal of [false,true]){
   const table=desktopTableLayout(viewport.logicalWidth,viewport.logicalHeight,6,reveal);
   assert.equal(table.seats[0].y,table.seats[2].y);
   assert.ok(table.seats[3].y>table.seats[0].y);
   assert.ok(table.bottom+100<viewport.logicalHeight);
   for(const mat of table.seats){assert.ok(mat.x>=0&&mat.x+mat.w<=viewport.logicalWidth);assert.ok(mat.w/mat.h<3);}
  }
 }
});
