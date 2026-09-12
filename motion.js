/* Smooth network snapshots at display refresh rate without changing combat authority. */
class RenderBuffer {
  constructor(delay=90){this.delay=delay;this.frames=[];}
  push(state,now){const last=this.frames.at(-1);if(last&&(last.state.match!==state.match||last.state.state!==state.state))this.frames=[];this.frames.push({state,time:now});while(this.frames.length>20)this.frames.shift();}
  sample(now){const newest=this.frames.at(-1);if(!newest)return null;const current=newest.state;if(current.state!=='playing'||this.frames.length<2)return current;
    const target=now-this.delay;let left=this.frames[0],right=newest;
    for(let i=1;i<this.frames.length;i++){if(this.frames[i].time>=target){left=this.frames[i-1];right=this.frames[i];break;}left=this.frames[i];}
    const alpha=Math.max(0,Math.min(1,(target-left.time)/Math.max(1,right.time-left.time)));
    const blend=(a,b)=>{if(!a||!b||Math.hypot(a.x-b.x,a.y-b.y)>180)return b;let turn=(b.angle||0)-(a.angle||0);turn=Math.atan2(Math.sin(turn),Math.cos(turn));return {...b,x:a.x+(b.x-a.x)*alpha,y:a.y+(b.y-a.y)*alpha,angle:(a.angle||0)+turn*alpha};};
    return {...current,players:current.players.map(p=>{
      // Never retain coordinates from an older frame once the latest frame conceals an enemy.
      if(!p.visible||!p.alive)return p;
      const a=left.state.players.find(q=>q.slot===p.slot),b=right.state.players.find(q=>q.slot===p.slot);
      if(!a?.visible||!b?.visible)return p;return {...p,...blend(a,b)};
    }),bullets:current.bullets.map(b=>{
      const a=left.state.bullets.find(q=>q.id===b.id),next=right.state.bullets.find(q=>q.id===b.id);
      if(a&&next)return blend(a,next);
      const ahead=Math.max(0,Math.min(.08,(now-newest.time)/1000));return {...b,x:b.x+b.vx*ahead,y:b.y+b.vy*ahead};
    })};
  }
}
if(typeof module!=='undefined')module.exports=RenderBuffer;
