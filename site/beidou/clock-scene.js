(function (root, factory) {
  const common = typeof module === 'object' && module.exports;
  const api = factory(common ? require('./engine.js') : root.BeidouEngine, common ? require('./scene.js') : root.BeidouScene, common ? require('./clock-model.js') : root.BeidouClockModel);
  if (common) module.exports = api; else root.BeidouClockScene = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (E, S, M) {
  'use strict';
  const FONT = '"PingFang SC", "Microsoft YaHei", system-ui, sans-serif';
  const SUBJECTS = {
    car: { name:'车辆', x:270, y:548, w:232, h:182, color:'#79d6df' },
    ship: { name:'航船', x:700, y:556, w:260, h:204, color:'#79d6df' },
    phone: { name:'手机', x:1035, y:549, w:146, h:162, color:'#79d6df' },
  };
  const rand = i => { const t = Math.sin(i * 129.23 + 92.3) * 17391.78; return t - Math.floor(t); };
  const blend = (a,b,t) => a+(b-a)*t;
  function txt(c,value,x,y,size=15,color='#c2d5e3',align='left',weight=400) { c.font=`${weight} ${size}px ${FONT}`;c.fillStyle=color;c.textAlign=align;c.textBaseline='middle';c.fillText(value,x,y); }
  function ln(c,x,y,x2,y2,color='#79cad45c',w=1) { c.strokeStyle=color;c.lineWidth=w;c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke(); }
  function poly(c,points,fill,stroke) { c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();} }
  function sprite(c,image,x,y,w,h,alpha=1) { if(!image)return;c.save();c.globalAlpha*=alpha;c.drawImage(image,x-w/2,y-h/2,w,h);c.restore(); }
  function pill(c,label,x,y,color,size=12) { c.font=`400 ${size}px ${FONT}`;const w=c.measureText(label).width+18;c.fillStyle='#081925dc';c.strokeStyle=color+'77';c.lineWidth=1;c.beginPath();c.roundRect(x,y-12,w,24,6);c.fill();c.stroke();txt(c,label,x+9,y,size,color); }
  function makeGhosts(assets, createCanvas) {
    const ghosts={};
    E.PARTS.filter(p=>p.group==='user').forEach(p=>{ const canvas=createCanvas(420,330),c=canvas.getContext('2d');c.drawImage(assets[p.file],0,0,420,330);c.globalCompositeOperation='source-atop';c.globalAlpha=.62;c.fillStyle='#efb779';c.fillRect(0,0,420,330);ghosts[p.id]=canvas; });
    return ghosts;
  }
  function layout(width,height,target='ship') {
    const mobile=width<620,W=mobile?720:1200,H=mobile?960:750,s=Math.min(width/W,height/H);
    return {mobile,W,H,s,ox:(width-W*s)/2,oy:(height-H*s)/2,target};
  }
  function draw(ctx, opts) {
    const {width,height,state,assets,earth,ghosts={},time=0,ns=0,target='ship',progress=1,fromFocus='all',fromTime=0,reducedMotion=false}=opts;
    const L=layout(width,height,target), {mobile,W,H,s,ox,oy}=L;
    const u=M.ease(progress), visibility=M.ease(Math.min(1,progress/0.65));
    if(progress<1) S.draw(ctx,{...opts,focus:fromFocus,time:fromTime,selected:null,hovered:null}); else ctx.clearRect(0,0,width,height);
    ctx.save();ctx.translate(ox,oy);ctx.scale(s,s);
    ctx.save();ctx.globalAlpha=visibility;
    const sky=ctx.createLinearGradient(0,0,W,H);sky.addColorStop(0,'#06131f');sky.addColorStop(.52,'#102d40');sky.addColorStop(1,'#092536');ctx.fillStyle=sky;ctx.fillRect(-ox/s,-oy/s,width/s,height/s);
    const haze=ctx.createRadialGradient(mobile?390:560,240,10,mobile?390:560,240,520);haze.addColorStop(0,'#30768c24');haze.addColorStop(1,'#30768c00');ctx.fillStyle=haze;ctx.fillRect(0,0,W,H);
    for(let i=0;i<150;i++){ctx.fillStyle=`rgba(207,237,246,${.13+rand(i+130)*.55})`;ctx.beginPath();ctx.arc(rand(i)*W,rand(i+60)*(mobile?490:378),rand(i+321)*1.2+.35,0,Math.PI*2);ctx.fill();}
    const earthX=mobile?594:1039,earthY=mobile?132:149,earthR=mobile?84:98;
    const glow=ctx.createRadialGradient(earthX,earthY,earthR*.8,earthX,earthY,earthR*1.2);glow.addColorStop(0,'#81d7f41a');glow.addColorStop(1,'#81d7f400');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(earthX,earthY,earthR*1.2,0,Math.PI*2);ctx.fill();
    if(earth)ctx.drawImage(earth,earthX-earthR,earthY-earthR,earthR*2,earthR*2);
    ctx.strokeStyle='#579eab3b';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(earthX,earthY,earthR*1.6,earthR*.55,-.4,0,Math.PI*2);ctx.stroke();
    const groundTop=mobile?515:394;
    const water=ctx.createLinearGradient(0,groundTop,0,H);water.addColorStop(0,'#14394b');water.addColorStop(1,'#0a2435');
    poly(ctx,[[0,groundTop+32],[W,groundTop-16],[W,H],[0,H]],water);
    for(let i=0;i<19;i++){const y=groundTop+58+i*(mobile?18:15);ln(ctx,0,y,W,y-41,'#5e94a423');}
    if(!mobile){
      poly(ctx,[[16,499],[328,458],[485,592],[118,677]],'#344d5d','#69859655');
      poly(ctx,[[44,513],[323,474],[430,573],[132,645]],'#465968','#7c969b55');
      ctx.save();ctx.setLineDash([17,18]);ln(ctx,78,542,373,549,'#b1c5c471',2);ctx.restore();
      poly(ctx,[[906,478],[1127,450],[1196,541],[940,610]],'#284959','#708e9b55');
      for(let i=0;i<7;i++)ln(ctx,935+i*30,482-i*3,967+i*31,577-i*7,'#66889333');
      ln(ctx,522,485,570,635,'#5e9dae',5);ln(ctx,534,484,582,633,'#26495d',9);
    }else{
      poly(ctx,[[55,613],[472,542],[674,700],[190,821]],'#314e60','#7999a955');
      if(target==='car'){poly(ctx,[[64,636],[462,570],[619,702],[185,788]],'#485e6e','#899eab66');ctx.save();ctx.setLineDash([18,17]);ln(ctx,117,683,521,649,'#b5caca91',2);ctx.restore();}
      if(target==='ship'){ctx.fillStyle='#12394a';ctx.fillRect(0,597,W,H-597);for(let i=0;i<13;i++)ln(ctx,60,627+i*23,660,606+i*23,'#669eaf30');}
    }
    const fontSmall=Math.max(12,10/s),fontLabel=Math.max(15,11/s);
    txt(ctx,'空间段',mobile?40:54,mobile?65:61,fontLabel,'#a4d8e3','left',500);
    if(!mobile)txt(ctx,'一颗卫星存在未校正钟差',54,86,13,'#829eae');
    txt(ctx,'用户端',mobile?40:54,groundTop+13,fontLabel,'#a4d8e3','left',500);
    if(!mobile){txt(ctx,'实体位置保持不变，观察导航估计位置如何偏移',54,groundTop+37,13,'#92aebc');ctx.fillStyle='#8ee6e2';ctx.beginPath();ctx.arc(824,409,4,0,Math.PI*2);ctx.fill();txt(ctx,'实体位置',836,409,12,'#a9d5dc');ctx.fillStyle='#eab781';ctx.beginPath();ctx.arc(969,409,4,0,Math.PI*2);ctx.fill();txt(ctx,'导航估计位置',981,409,12,'#dabe9c');}
    else txt(ctx,`${SUBJECTS[target].name} · 实体与估计位置对照`,40,groundTop+47,fontSmall,'#a0bac8');
    ctx.restore();
    ctx.globalAlpha=u;
    const satellite={x:mobile?226:291,y:mobile?205:194,w:mobile?350:430,h:mobile?276:338};
    // The main satellite travels from its real scene location into the close-up.
    const oldCam=S.camera(width,height,fromFocus), geo=E.PARTS.find(p=>p.id==='geo'),oldPos=E.position(geo,fromTime,true,state.missionTime);
    const oldX=(oldPos.x*oldCam.scale+oldCam.x-ox)/s,oldY=(oldPos.y*oldCam.scale+oldCam.y-oy)/s;
    const sx=blend(oldX,satellite.x,u),sy=blend(oldY,satellite.y,u),sw=blend(geo.w*oldCam.scale/s,satellite.w,u),sh=blend(geo.h*oldCam.scale/s,satellite.h,u);
    sprite(ctx,assets[geo.file],sx,sy,sw,sh);
    const clockX=mobile?416:442,clockY=mobile?297:277,clockW=mobile?123:131;
    ctx.save();ctx.shadowColor=ns>0?'#ecb374':'#74d4df';ctx.shadowBlur=16+Math.min(20,ns/30);sprite(ctx,assets.clock,clockX,clockY,clockW,clockW*.78);ctx.restore();
    ln(ctx,satellite.x+22,satellite.y+24,clockX-32,clockY-17,ns>0?'#dca56d88':'#78c4d27a');
    ctx.strokeStyle=ns>0?'#dfb06a7c':'#8ad4df5a';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(clockX,clockY,clockW*.59,clockW*.35,0,0,Math.PI*2);ctx.stroke();
    txt(ctx,'原子钟 · 时间基准',clockX,mobile?369:344,fontSmall,ns>0?'#eaca9b':'#abdbdf','center');
    const healthy=mobile?[[468,90],[658,288],[518,388]]:[[871,94],[1150,248],[845,273]];
    healthy.forEach(([x,y],i)=>sprite(ctx,assets[E.PARTS[i].file],x,y,mobile?83:90,mobile?65:71,.78));
    // Synchronized tick lanes make the phase difference visible without claiming to show RF frequency.
    const tickX=mobile?56:560,tickY=mobile?433:209,tickW=mobile?605:251;
    if(!mobile)txt(ctx,'把纳秒级时间差放大来看',tickX,tickY-45,13,'#93afbe');
    ['参考时间','卫星时间'].forEach((label,row)=>{
      const y=tickY+row*(mobile?41:53),shift=row?ns/600*32:0;
      txt(ctx,label,tickX,y-13,fontSmall,row&&ns>0?'#dfb87c':'#9dc9d8');
      const baselineX=tickX+(mobile?125:0),baselineY=mobile?y-13:y+8,visibleW=mobile?tickW-260:tickW;
      ln(ctx,baselineX,baselineY,baselineX+visibleW,baselineY,'#45697b77');
      ctx.save();ctx.beginPath();ctx.rect(baselineX,baselineY-16,visibleW,25);ctx.clip();
      for(let i=-1;i<8;i++){const px=baselineX+i*48+(reducedMotion?0:time*16%48)+shift;ln(ctx,px,baselineY-9,px,baselineY+6,row&&ns>0?'#edbd86':'#8fe1e5',2);}
      ctx.restore();
      if(mobile)txt(ctx,row?`+${Math.round(ns)} ns`:'±0 ns',tickX+tickW,y-13,fontSmall,row&&ns>0?'#efc58d':'#8de0df','right');
      else txt(ctx,row?`+${Math.round(ns)} ns`:'±0 ns',tickX+tickW,y-13,13,row&&ns>0?'#efc58d':'#8de0df','right');
    });
    const displayed=mobile?[target]:['car','ship','phone'];
    displayed.forEach(id=>{
      const p=E.PARTS.find(p=>p.id===id),base=SUBJECTS[id],active=id===target;
      const actual=mobile?{x:425,y:674,w:id==='phone'?190:324,h:id==='phone'?214:255}:base;
      const response=M.response(ns,id),pixelsPerMeter=mobile?2.12:1.6;
      const dx=response.east*pixelsPerMeter,dy=-response.north*pixelsPerMeter*.57;
      const estimated={x:actual.x+dx,y:actual.y+dy};
      const groundOffset=actual.h*.30,anchorY=actual.y+groundOffset;
      const oldPart=E.position(p,fromTime,true,state.missionTime);
      const ax=blend((oldPart.x*oldCam.scale+oldCam.x-ox)/s,actual.x,u),ay=blend((oldPart.y*oldCam.scale+oldCam.y-oy)/s,actual.y,u);
      const aw=blend(p.w*oldCam.scale/s,actual.w,u),ah=blend(p.h*oldCam.scale/s,actual.h,u);
      // Pulses from the faulted satellite remain visibly one-way toward the receiver.
      const beamColor=ns>.1?'#eab980':'#81d5e5';
      ctx.save();ctx.globalAlpha=u*(active?.65:.27);ctx.setLineDash([3,8]);ln(ctx,satellite.x,satellite.y+99,actual.x,anchorY,beamColor,1);ctx.setLineDash([]);
      const phase=((time*.31+(id==='car'?.10:id==='ship'?.46:.72)+(ns/600)*.13)%1+1)%1;
      const px=blend(satellite.x,actual.x,phase),py=blend(satellite.y+99,anchorY,phase);ctx.fillStyle=beamColor;ctx.shadowColor=beamColor;ctx.shadowBlur=12;ctx.beginPath();ctx.arc(px,py,3,0,Math.PI*2);ctx.fill();ctx.restore();
      // Show actual entity, its fixed reference marker, and a displaced translucent estimate.
      sprite(ctx,assets[p.file],ax,ay,aw,ah,active?1:.72);
      ctx.save();ctx.globalAlpha=u*(active?1:.6);ctx.strokeStyle='#91e4df';ctx.lineWidth=1.7;ctx.beginPath();ctx.ellipse(actual.x,anchorY,17,6,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#a0ebe4';ctx.beginPath();ctx.arc(actual.x,anchorY,3,0,Math.PI*2);ctx.fill();ctx.restore();
      if(response.errorMeters>.3){
        ctx.save();ctx.globalAlpha=u*(active?.52:.27);ctx.shadowColor='#dca35c';ctx.shadowBlur=active?17:8;sprite(ctx,ghosts[id]||assets[p.file],estimated.x,estimated.y,actual.w,actual.h);ctx.restore();
        const ex=estimated.x,ey=estimated.y+groundOffset;
        ctx.save();ctx.globalAlpha=u*(active?1:.5);ctx.setLineDash([4,5]);ln(ctx,actual.x,anchorY,ex,ey,'#eab780',1.5);ctx.setLineDash([]);
        ctx.strokeStyle='#edbc84';ctx.lineWidth=1.6;ctx.beginPath();ctx.ellipse(ex,ey,17,6,0,0,Math.PI*2);ctx.stroke();
        ctx.fillStyle='#edbd86';ctx.beginPath();ctx.arc(ex,ey,3.5,0,Math.PI*2);ctx.fill();
        if(response.errorMeters>5){const theta=Math.atan2(ey-anchorY,ex-actual.x);ctx.translate(ex,ey);ctx.rotate(theta);poly(ctx,[[0,0],[-8,-3],[-8,3]],'#edbd86');}
        ctx.restore();
        if(active&&response.errorMeters>12){pill(ctx,'实际位置',actual.x+13,anchorY-13,'#a0e5e1',fontSmall);pill(ctx,'导航估计位置',ex-77,ey+28,'#edc591',fontSmall);}
      }else if(active)pill(ctx,'实际位置与估计位置重合',actual.x-(mobile?144:102),anchorY+32,'#a0e5e1',fontSmall);
      const captionY=mobile?930:720;
      txt(ctx,`${base.name} · 偏差 ${response.errorMeters.toFixed(1)} 米`,mobile?360:actual.x,captionY,Math.max(14,11/s),active?'#eac58f':'#a1bbc7','center',active?500:400);
    });
    if(mobile){ctx.fillStyle='#94e0dc';ctx.beginPath();ctx.arc(58,884,5,0,Math.PI*2);ctx.fill();txt(ctx,'实体位置',72,884,fontSmall,'#b1d4db');ctx.fillStyle='#e9bb81';ctx.beginPath();ctx.arc(334,884,5,0,Math.PI*2);ctx.fill();txt(ctx,'导航估计位置',348,884,fontSmall,'#dfc193');}
    // A single moving light veil masks the handoff between wide scene and close-up.
    if(progress>0&&progress<1&&!reducedMotion){ctx.save();ctx.globalAlpha=Math.sin(progress*Math.PI)*.20;const center=-W*.3+progress*W*1.6,veil=ctx.createLinearGradient(center-180,0,center+180,0);veil.addColorStop(0,'#6cdcee00');veil.addColorStop(.5,'#b7f3ef');veil.addColorStop(1,'#6cdcee00');ctx.fillStyle=veil;ctx.fillRect(center-180,0,360,H);ctx.restore();}
    ctx.restore();return L;
  }
  return {draw,layout,makeGhosts,SUBJECTS};
});
