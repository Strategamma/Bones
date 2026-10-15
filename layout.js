export function canvasGeometry(width, height, pixelRatio = 1) {
  const ratio = Math.min(Math.max(pixelRatio || 1, 1), 2);
  const pixelWidth = Math.max(1, Math.round(width * ratio));
  const pixelHeight = Math.max(1, Math.round(height * ratio));
  const desktop=width>=760;
  const unitScale=desktop?Math.min(1.2,width/1000,Math.max(.85,height/780)):width/390;
  const scale=unitScale*ratio;
  return {pixelWidth,pixelHeight,scale,verticalScale:scale,logicalWidth:desktop?pixelWidth/scale:390,logicalHeight:pixelHeight/scale,desktop};
}

export function desktopTableLayout(width, height, count, reveal=false){
 const boardWidth=Math.min(1120,width-64),left=(width-boardWidth)/2,top=118,gap=18;
 const columns=3,seatWidth=(boardWidth-gap*2)/3,rows=Math.ceil(count/columns);
 const seatHeight=reveal?Math.max(174,Math.min(214,(height-top-150-gap)/2)):132;
 return {left,boardWidth,top,seatWidth,seatHeight,rows,seats:Array.from({length:count},(_,i)=>({x:left+i%columns*(seatWidth+gap),y:top+Math.floor(i/columns)*(seatHeight+gap),w:seatWidth,h:seatHeight})),bottom:top+rows*(seatHeight+gap)};
}
