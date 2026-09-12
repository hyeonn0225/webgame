/* Shared deterministic terrain; the host owns combat and filters guest visibility. */
const Battle = (() => {
  const SIZE=2400, R=14;
  const weapons={pistol:{name:'P92',ammo:'light',capacity:12,damage:24,rate:.32,reload:1.2,speed:850,range:650},smg:{name:'VECTOR',ammo:'light',capacity:24,damage:16,rate:.095,reload:1.6,speed:950,range:550},rifle:{name:'M416',ammo:'heavy',capacity:30,damage:28,rate:.16,reload:2,speed:1200,range:900}};
  const buildings=[];
  for(let row=0;row<4;row++)for(let col=0;col<4;col++)buildings.push({id:'h'+(row*4+col),x:230+col*510+(row%2)*40,y:220+row*510,w:180,h:145});
  const bushes=Array.from({length:42},(_,i)=>({id:'b'+i,x:100+(i*367%2180),y:100+(i*593%2180),r:48})).filter(b=>!buildings.some(h=>b.x>h.x-70&&b.x<h.x+h.w+70&&b.y>h.y-70&&b.y<h.y+h.h+70));
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const inside=(p,h)=>p.x>h.x&&p.x<h.x+h.w&&p.y>h.y&&p.y<h.y+h.h;
  function cover(p){return buildings.find(h=>inside(p,h))?.id||bushes.find(b=>dist(p,b)<b.r)?.id||null;}
  function walls(h){return [{x:h.x,y:h.y,w:h.w,h:10},{x:h.x,y:h.y,w:10,h:h.h},{x:h.x+h.w-10,y:h.y,w:10,h:h.h},{x:h.x,y:h.y+h.h-10,w:65,h:10},{x:h.x+115,y:h.y+h.h-10,w:65,h:10}];}
  const wallList=buildings.flatMap(walls);
  function blocked(x,y,r=R){return x<r||y<r||x>SIZE-r||y>SIZE-r||wallList.some(w=>Math.hypot(x-clamp(x,w.x,w.x+w.w),y-clamp(y,w.y,w.y+w.h))<r);}
  function landing(x,y){x=clamp(Number.isFinite(x)?x:1200,40,SIZE-40);y=clamp(Number.isFinite(y)?y:1200,40,SIZE-40);if(!blocked(x,y))return{x,y};for(let d=20;d<250;d+=20)for(let a=0;a<Math.PI*2;a+=.4){const px=x+Math.cos(a)*d,py=y+Math.sin(a)*d;if(!blocked(px,py))return{x:px,y:py};}return{x:1200,y:1200};}
  function makeLoot(){let id=0;const out=[];const add=(x,y,type,item,amount=1)=>out.push({id:++id,x,y,type,item,amount});
    for(const [i,h]of buildings.entries()){const gun=['pistol','smg','rifle'][i%3];add(h.x+45,h.y+45,'weapon',gun);add(h.x+90,h.y+45,'ammo',weapons[gun].ammo,60);add(h.x+135,h.y+85,'med','med',1);}
    for(let i=0;i<44;i++){const p=landing(70+i*419%2240,80+i*271%2230);const gun=i%2?'pistol':'rifle';if(i%3===0)add(p.x,p.y,'weapon',gun);else if(i%3===1)add(p.x,p.y,'ammo',i%2?'light':'heavy',40);else add(p.x,p.y,'med','med');}
    return out;
  }
  function reset(r){Object.assign(r,{state:'waiting',time:0,selectTime:0,dropTime:0,bulletId:0,bullets:[],loot:makeLoot(),winner:null,match:(r.match||0)+1,zone:zoneAt(0)});for(const p of r.players)Object.assign(p,{x:1200,y:1200,hp:100,keys:{},angle:0,gun:null,mag:0,ammo:{light:0,heavy:0},meds:0,reloading:0,healing:0,cool:0,selected:false,damage:0,kills:0});}
  function start(r){if(r.players.length!==2||r.players.some(p=>!p.stream))return;reset(r);r.state='selecting';}
  function zoneAt(t){const radii=[1650,1050,650,320,120,0];let elapsed=Math.max(0,t-45),phase=Math.min(4,Math.floor(elapsed/60)),progress=clamp((elapsed-phase*60-20)/40,0,1);if(t<45)return{x:1200,y:1200,r:1650,next:1050,phase:0,remaining:45-t,shrinking:false,damage:2};return{x:1200,y:1200,r:radii[phase]+(radii[phase+1]-radii[phase])*progress,next:radii[phase+1],phase:phase+1,remaining:progress>0?Math.max(0,60-(elapsed-phase*60)):20-(elapsed-phase*60),shrinking:progress>0,damage:3+phase*3};}
  function canSee(viewer,obj){const c=cover(obj);return !c||cover(viewer)===c;}
  function action(r,p,path,data={}){
    if(path==='/start'&&p.slot===0&&['waiting','finished'].includes(r.state))return start(r);
    if(path==='/pause'){if(['playing','selecting','dropping'].includes(r.state)){r.resume=r.state;r.state='paused';}else if(['paused','disconnected'].includes(r.state)&&r.players.every(q=>q.stream))r.state=r.resume||'playing';return;}
    if(data.match!==r.match)return;
    if(path==='/drop'&&r.state==='selecting'&&!p.selected&&Number.isFinite(data.x)&&Number.isFinite(data.y)){Object.assign(p,landing(data.x,data.y));p.selected=true;return;}
    if(r.state!=='playing'||p.hp<=0)return;
    if(path==='/reload'&&p.gun&&!p.reloading&&!p.healing&&p.mag<weapons[p.gun].capacity&&p.ammo[weapons[p.gun].ammo]>0)p.reloading=weapons[p.gun].reload;
    if(path==='/heal'&&p.meds>0&&p.hp<100&&!p.healing&&!p.reloading)p.healing=2.5;
    if(path==='/pickup'){
      const loot=r.loot.filter(o=>dist(p,o)<65&&canSee(p,o)).sort((a,b)=>dist(p,a)-dist(p,b))[0];if(!loot)return;
      r.loot=r.loot.filter(o=>o!==loot);
      if(loot.type==='weapon'){if(p.gun)r.loot.push({id:Math.max(100,...r.loot.map(o=>o.id))+1,x:p.x+22,y:p.y,type:'weapon',item:p.gun,amount:1,mag:p.mag});p.gun=loot.item;p.mag=loot.mag||0;p.reloading=0;p.healing=0;}
      if(loot.type==='ammo')p.ammo[loot.item]+=loot.amount;
      if(loot.type==='med')p.meds+=loot.amount;
    }
  }
  function update(r,dt){dt=clamp(dt,0,.05);if(!['selecting','dropping','playing'].includes(r.state))return;
    if(r.players.some(p=>!p.stream)){r.resume=r.state;r.state='disconnected';return;}
    if(r.state==='selecting'){r.selectTime+=dt;if(r.players.every(p=>p.selected)||r.selectTime>=20){r.players.forEach((p,i)=>{if(!p.selected){Object.assign(p,landing(i?1950:450,i?1950:450));p.selected=true;}});r.state='dropping';}return;}
    if(r.state==='dropping'){r.dropTime+=dt;if(r.dropTime>=3)r.state='playing';return;}
    r.time+=dt;r.zone=zoneAt(r.time);
    for(const p of r.players){if(p.hp<=0)continue;const k=Date.now()-p.inputAt<700?p.keys:{};if(Number.isFinite(k.angle))p.angle=k.angle;
      const dx=Number(!!k.right)-Number(!!k.left),dy=Number(!!k.down)-Number(!!k.up),len=Math.hypot(dx,dy)||1,speed=p.healing?75:210;
      if(!blocked(p.x+dx/len*speed*dt,p.y))p.x+=dx/len*speed*dt;if(!blocked(p.x,p.y+dy/len*speed*dt))p.y+=dy/len*speed*dt;
      p.cool=Math.max(0,p.cool-dt);
      if(p.reloading>0){p.reloading-=dt;if(p.reloading<=0){p.reloading=0;const w=weapons[p.gun],n=Math.min(w.capacity-p.mag,p.ammo[w.ammo]);p.mag+=n;p.ammo[w.ammo]-=n;}}
      if(p.healing>0){p.healing-=dt;if(p.healing<=0){p.healing=0;p.meds--;p.hp=Math.min(100,p.hp+60);}}
      if(k.fire&&p.gun&&p.mag>0&&p.cool<=0&&!p.reloading&&!p.healing){const w=weapons[p.gun];p.mag--;p.cool=w.rate;r.bullets.push({id:++r.bulletId,x:p.x,y:p.y,vx:Math.cos(p.angle)*w.speed,vy:Math.sin(p.angle)*w.speed,owner:p.slot,damage:w.damage,life:w.range/w.speed});}
      if(r.zone.r<=0||dist(p,r.zone)>r.zone.r)p.hp=Math.max(0,p.hp-r.zone.damage*dt);
    }
    for(const b of r.bullets){b.life-=dt;const n=Math.ceil(Math.hypot(b.vx,b.vy)*dt/5);for(let i=0;i<n&&b.life>0;i++){b.x+=b.vx*dt/n;b.y+=b.vy*dt/n;if(blocked(b.x,b.y,2)){b.life=0;break;}const victim=r.players.find(p=>p.slot!==b.owner&&p.hp>0&&dist(b,p)<R+2);if(victim){const attacker=r.players.find(p=>p.slot===b.owner);attacker.damage+=Math.min(victim.hp,b.damage);victim.hp=Math.max(0,victim.hp-b.damage);victim.healing=0;if(victim.hp<=0)attacker.kills++;b.life=0;}}}
    r.bullets=r.bullets.filter(b=>b.life>0);const alive=r.players.filter(p=>p.hp>0);if(alive.length<=1){r.winner=alive[0]?.slot??null;r.state='finished';}
  }
  function snapshot(r,slot){const viewer=r.players.find(p=>p.slot===slot);const privateMap=['selecting','dropping'].includes(r.state);
    return {code:r.code,match:r.match,state:r.state,time:r.time,selectTime:r.selectTime,dropTime:r.dropTime,zone:r.zone,winner:r.winner,alive:r.players.filter(p=>p.hp>0).length,
      players:r.players.map(p=>{const own=p.slot===slot,visible=own||(!privateMap&&viewer&&canSee(viewer,p));return{slot:p.slot,online:!!p.stream,selected:p.selected,visible,alive:p.hp>0,...(visible?{x:p.x,y:p.y,angle:p.angle,gun:p.gun}:{}),...(own?{hp:p.hp,mag:p.mag,ammo:{...p.ammo},meds:p.meds,reloading:p.reloading,healing:p.healing,damage:p.damage,kills:p.kills}:{})};}),
      loot:privateMap?[]:r.loot.filter(o=>viewer&&canSee(viewer,o)).map(o=>({...o})),bullets:privateMap?[]:r.bullets.filter(b=>viewer&&canSee(viewer,b)).map(b=>({...b}))};
  }
  return{SIZE,R,weapons,buildings,bushes,dist,cover,inside,walls,blocked,landing,reset,start,zoneAt,action,update,snapshot,canSee};
})();
if(typeof module!=='undefined')module.exports=Battle;
