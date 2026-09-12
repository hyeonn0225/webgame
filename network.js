// A single host runs the shared simulation. Realtime relays ephemeral state and input.
class OnlineGame {
  constructor(onState,onStatus){this.onState=onState;this.onStatus=onStatus;this.id=crypto.randomUUID();this.lastState=Date.now();this.seq=0;this.remoteSeq=-1;}
  async open(host,code){
    const config=window.GAME_CONFIG;
    if(!config?.url||!config?.key)throw Error('배포 설정에 Supabase URL과 공개 키를 추가해 주세요.');
    if(!window.supabase)throw Error('연결 모듈을 불러오지 못했습니다. 새로고침해 주세요.');
    if(!host&&!/^[A-F0-9]{6}$/.test(code))throw Error('6자리 방 코드를 입력해 주세요.');
    this.host=host;this.code=host?Array.from(crypto.getRandomValues(new Uint8Array(3)),n=>n.toString(16).padStart(2,'0')).join('').toUpperCase():code;
    const clientKey=config.url+'|'+config.key;
    window.__afterHoursClients=window.__afterHoursClients||{};
    this.client=window.__afterHoursClients[clientKey]||(window.__afterHoursClients[clientKey]=window.supabase.createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false,storageKey:'after-hours-auth'}}));
    this.channel=this.client.channel('after-hours-br:'+this.code,{config:{broadcast:{self:false}}});
    this.channel.on('broadcast',{event:'game'},({payload})=>this.receive(payload));
    await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('실시간 연결 시간이 초과되었습니다.')),12000);this.channel.subscribe(status=>{this.ready=status==='SUBSCRIBED';this.onStatus(this.ready);if(this.ready){clearTimeout(timeout);resolve();}else if(status==='CHANNEL_ERROR'){clearTimeout(timeout);reject(Error('Supabase 실시간 연결에 실패했습니다.'));}});});
    if(host){this.room={code:this.code,players:[{slot:0,token:this.id,stream:true,inputAt:Date.now()}]};Battle.reset(this.room);}
    else{
      await new Promise((resolve,reject)=>{this.joinResolve=resolve;this.joinReject=reject;this.joinTimer=setInterval(()=>this.send({kind:'join',id:this.id}),500);this.joinTimeout=setTimeout(()=>{clearInterval(this.joinTimer);reject(Error('방을 찾지 못했습니다. 방 코드와 방장 접속을 확인해 주세요.'));},10000);this.send({kind:'join',id:this.id});});
    }
    this.timer=setInterval(()=>this.tick(),1000/30);return {room:this.code,token:this.id,slot:host?0:1};
  }
  send(data){if(this.ready)this.channel.send({type:'broadcast',event:'game',payload:data}).catch(()=>this.onStatus(false));}
  receive(m){
    if(!m||typeof m!=='object')return;
    if(this.host){
      const r=this.room;if(!r)return;
      if(m.kind==='join'&&typeof m.id==='string'){
        if(r.players.length===1){r.players.push({slot:1,token:m.id,stream:true,inputAt:Date.now()});Battle.reset(r);}
        const allowed=r.players[1]?.token===m.id;
        this.send({kind:'admit',to:m.id,host:this.id,ok:allowed});return;
      }
      const p=r.players.find(p=>p.token===m.id);if(!p)return;
      p.inputAt=Date.now();p.stream=true;
      if(m.kind==='input')p.keys=m.keys||{};
      if(m.kind==='action'&&Number.isSafeInteger(m.actionId)&&m.actionId>(p.lastAction||0)){p.lastAction=m.actionId;this.apply(m.path,m.data,p);}
    }else{
      if(m.kind==='admit'&&m.to===this.id){clearInterval(this.joinTimer);clearTimeout(this.joinTimeout);if(m.ok){this.hostId=m.host;this.joinResolve?.();}else this.joinReject?.(Error('이미 두 명이 참가한 방입니다.'));}
      if(m.kind==='state'&&m.to===this.id&&m.host===this.hostId&&m.seq>this.remoteSeq){this.remoteSeq=m.seq;this.lastState=Date.now();this.latest=m.state;this.onState(m.state);}
    }
  }
  apply(path,data,p){Battle.action(this.room,p,path,data||{});}
  input(keys){if(this.host){const p=this.room.players[0];p.keys=keys;p.inputAt=Date.now();}else this.send({kind:'input',id:this.id,keys});}
  action(path,data={}){if(this.host)this.apply(path,data,this.room.players[0]);else this.send({kind:'action',id:this.id,path,data,actionId:this.actionId=(this.actionId||0)+1});}
  tick(){
    if(this.host){const r=this.room;r.players[0].stream=this.ready;for(const p of r.players.slice(1))p.stream=this.ready&&Date.now()-p.inputAt<3000;
      if(document.hidden&&['playing','selecting','dropping'].includes(r.state)){r.resume=r.state;r.state='paused';}
      Battle.update(r,1/30);this.onState(Battle.snapshot(r,0));if(++this.seq%2===0&&r.players[1])this.send({kind:'state',host:this.id,to:r.players[1].token,seq:this.seq,state:Battle.snapshot(r,1)});
    }else if(this.latest&&Date.now()-this.lastState>3000){this.onState({...this.latest,state:'disconnected'});}
  }
  async close(){clearInterval(this.timer);clearInterval(this.joinTimer);clearTimeout(this.joinTimeout);this.ready=false;if(this.client&&this.channel)await this.client.removeChannel(this.channel);}
}
