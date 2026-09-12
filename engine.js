const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
function reset(r) {
  Object.assign(r,{time:0,kills:0,level:1,xp:0,enemies:[],bullets:[],orbs:[],spawn:0,boss:false,state:'waiting',choices:[],id:0});
  r.players.forEach((p,i)=>Object.assign(p,{x:i*90,y:0,hp:100,max:100,damage:20,speed:220,cool:0,rate:.6,inv:0,revive:0,keys:{},pierce:0}));
}
function spawn(r,boss=false) {
  const p=r.players[Math.floor(Math.random()*r.players.length)], angle=Math.random()*Math.PI*2;
  const fast=r.time>=180 && Math.random()<(r.time>=480?.3:.15);
  r.enemies.push({id:++r.id,x:p.x+Math.cos(angle)*850,y:p.y+Math.sin(angle)*850,hp:boss?2200:fast?25:40,max:boss?2200:fast?25:40,size:boss?32:fast?9:12,speed:boss?65:fast?130:70,damage:boss?15:fast?10:7.5,boss,fast});
}
const upgrades=[['power','과출력','두 사람의 공격력 +10'],['rapid','오버클럭','공격 주기 15% 감소'],['speed','가벼운 발걸음','이동 속도 +25'],['health','든든한 야식','최대 체력 +20 · 체력 회복'],['heal','응급 처치','두 사람의 체력 +40'],['pierce','관통 탄환','한 번 더 관통']];
function choose(r,id) {
  if(r.state!=='upgrade'||!r.choices.some(c=>c[0]===id))return;
  for(const p of r.players){
    if(id==='power')p.damage+=10;
    if(id==='rapid')p.rate=Math.max(.1,p.rate*.85);
    if(id==='speed')p.speed=Math.min(400,p.speed+25);
    if(id==='health'){p.max+=20;if(p.hp>0)p.hp=Math.min(p.max,p.hp+20);}
    if(id==='heal'&&p.hp>0)p.hp=Math.min(p.max,p.hp+40);
    if(id==='pierce')p.pierce++;
  }
  r.choices=[];r.state='playing';
}
function update(r,dt) {
  if(r.state!=='playing')return;
  if(r.players.some(p=>!p.stream)){r.state='disconnected';return;}
  r.time+=dt;
  if(r.time>=600){r.state='won';return;}
  if(r.time>=480&&!r.boss){r.boss=true;spawn(r,true);}
  r.spawn-=dt;
  if(r.spawn<=0){r.spawn=r.time<120?.65:r.time<300?.45:r.time<480?.32:.23;if(r.enemies.length<100)spawn(r);}
  for(const p of r.players){
    p.inv=Math.max(0,p.inv-dt);
    if(p.hp<=0){const other=r.players.find(q=>q!==p&&q.hp>0);p.revive=other&&distance(p,other)<70?p.revive+dt:0;if(p.revive>=3){p.hp=p.max*.5;p.revive=0;p.inv=2;}continue;}
    const k=Date.now()-p.inputAt<1000?p.keys:{};
    let x=Number(!!k.right)-Number(!!k.left),y=Number(!!k.down)-Number(!!k.up),len=Math.hypot(x,y)||1;
    p.x+=x/len*p.speed*dt;p.y+=y/len*p.speed*dt;p.cool-=dt;
    const target=r.enemies.reduce((best,e)=>distance(p,e)<420&&(!best||distance(p,e)<distance(p,best))?e:best,null);
    if(target&&p.cool<=0){const d=distance(p,target)||1;r.bullets.push({x:p.x,y:p.y,vx:(target.x-p.x)/d*500,vy:(target.y-p.y)/d*500,life:1,damage:p.damage,owner:p.slot,hits:[],left:1+p.pierce});p.cool=p.rate;}
  }
  const alive=r.players.filter(p=>p.hp>0);
  if(!alive.length){r.state='lost';return;}
  for(const e of r.enemies){const p=alive.reduce((a,b)=>distance(e,a)<distance(e,b)?a:b);const d=distance(e,p)||1;e.x+=(p.x-e.x)/d*e.speed*dt;e.y+=(p.y-e.y)/d*e.speed*dt;if(d<e.size+16&&p.inv<=0){p.hp=Math.max(0,p.hp-e.damage);p.inv=.5;}}
  for(const b of r.bullets){b.life-=dt;b.x+=b.vx*dt;b.y+=b.vy*dt;for(const e of r.enemies){if(b.left>0&&e.hp>0&&!b.hits.includes(e.id)&&distance(b,e)<e.size+5){e.hp-=b.damage;b.hits.push(e.id);b.left--;if(e.hp<=0){r.kills++;r.orbs.push({x:e.x,y:e.y,value:e.fast?15:10});if(e.boss)r.state='won';}}}}
  r.bullets=r.bullets.filter(b=>b.life>0&&b.left>0);
  r.enemies=r.enemies.filter(e=>e.hp>0&&(e.boss||r.players.some(p=>distance(e,p)<1600)));
  r.orbs=r.orbs.filter(o=>{const p=alive.find(p=>distance(p,o)<100);if(p){const d=distance(p,o);if(d<20){r.xp+=o.value;return false;}o.x+=(p.x-o.x)*dt*8;o.y+=(p.y-o.y)*dt*8;}return r.players.some(p=>distance(p,o)<1800);}).slice(-300);
  if(r.state==='playing'&&r.xp>=r.level*50){r.xp-=r.level*50;r.level++;r.state='upgrade';r.choices=[...upgrades].sort(()=>Math.random()-.5).slice(0,3);}
}
function snapshot(r){return {code:r.code,state:r.state,time:r.time,kills:r.kills,level:r.level,xp:r.xp,choices:r.choices,players:r.players.map(({slot,x,y,hp,max,inv,revive,stream})=>({slot,x,y,hp,max,inv,revive,online:!!stream})),enemies:r.enemies,bullets:r.bullets,orbs:r.orbs};}

if(typeof module !== 'undefined') module.exports={reset,spawn,choose,update,snapshot};

