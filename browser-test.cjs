// Browser integration check with a local BroadcastChannel relay in place of Supabase.
// Requires Playwright via PLAYWRIGHT_PATH or the temporary test install described in README.
const {chromium}=require(process.env.PLAYWRIGHT_PATH||require('node:path').join(require('node:os').tmpdir(),'webgame-browser-check/node_modules/playwright'));
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const relay=`window.supabase={createClient(){return {channel(name){const bus=new BroadcastChannel(name);let handler;return {on(type,filter,fn){handler=fn;bus.onmessage=e=>handler({payload:e.data});return this;},subscribe(fn){queueMicrotask(()=>fn('SUBSCRIBED'));return this;},send(m){bus.postMessage(m.payload);return Promise.resolve('ok');},close(){bus.close();}};},removeChannel(c){c.close();return Promise.resolve();}};}};`;
(async()=>{
  const server=http.createServer((req,res)=>{const file=path.basename(req.url==='/'?'index.html':req.url);if(!['index.html','config.js','network.js','battle.js','motion.js','game.js'].includes(file)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',file.endsWith('html')?'text/html':'application/javascript');res.end(fs.readFileSync(path.join(__dirname,'dist',file)));});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;try{
    browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
    const context=await browser.newContext({viewport:{width:1440,height:1000}});
    await context.addInitScript(()=>Object.defineProperty(document,'hidden',{get:()=>false}));
    await context.route('**/config.js',r=>r.fulfill({contentType:'application/javascript',body:"window.GAME_CONFIG={url:'https://test.supabase.co',key:'test-public-key'};"}));
    await context.route('**/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:relay}));
    const a=await context.newPage(),b=await context.newPage(),errors=[];
    for(const page of [a,b])page.on('pageerror',e=>errors.push(e.message));
    const url='http://127.0.0.1:'+server.address().port;
    await Promise.all([a.goto(url),b.goto(url)]);
    await a.screenshot({path:path.join(require('node:os').tmpdir(),'webgame-br-lobby.png')});
    await a.click('#create');await a.waitForFunction(()=>session&&snap?.state==='waiting');
    const code=await a.evaluate(()=>session.room);await b.fill('#code',code);await b.click('#join');
    await a.waitForFunction(()=>snap.players.length===2);await b.waitForFunction(()=>session&&snap?.players.length===2);
    await a.click('#start');await a.waitForFunction(()=>snap.state==='selecting');await b.waitForFunction(()=>snap.state==='selecting');
    await a.screenshot({path:path.join(require('node:os').tmpdir(),'webgame-br-drop.png')});
    async function select(page,x,y){const box=await page.locator('#tactical').boundingBox(),side=Math.min(box.width,box.height);await page.mouse.click(box.x+(box.width-side)/2+x/2400*side,box.y+(box.height-side)/2+y/2400*side);}
    await select(a,275,265);await select(b,180,265);
    await a.waitForFunction(()=>snap.state==='playing');await b.waitForFunction(()=>snap.state==='playing');
    assert.equal(await b.evaluate(()=>snap.players[0].visible),false,'roof hides host from guest');
    const smooth=await b.evaluate(()=>new Promise(resolve=>{const visible=new Set(),received=new Set(),start=performance.now();held.add('KeyA');function frame(){visible.add(motion.sample(performance.now()).players[1].x.toFixed(2));received.add(snap.players[1].x.toFixed(2));if(performance.now()-start<400)requestAnimationFrame(frame);else{held.delete('KeyA');resolve({visible:visible.size,received:received.size});}}requestAnimationFrame(frame);}));
    assert.ok(smooth.visible>smooth.received,`guest interpolation must add display positions: ${JSON.stringify(smooth)}`);console.log('Guest smoothness:',smooth);
    await a.keyboard.press('KeyF');await a.waitForFunction(()=>me().gun==='pistol');await a.keyboard.press('KeyF');await a.waitForFunction(()=>me().ammo.light===60);await a.keyboard.press('KeyR');await a.waitForFunction(()=>me().mag===12);
    await a.screenshot({path:path.join(require('node:os').tmpdir(),'webgame-br-interior.png')});
    await a.mouse.move(300,500);await a.mouse.down();await a.waitForTimeout(400);await a.mouse.up();
    assert.equal(await b.evaluate(()=>me().hp),100,'wall blocks actual mouse-fired shots');
    // Place both on an open road to verify real click/input/network damage without walking for minutes.
    await a.evaluate(()=>{const [p,q]=source.room.players;p.x=1050;p.y=1175;p.mag=12;p.cool=0;q.x=1350;q.y=1175;});
    await a.waitForTimeout(350);await a.mouse.move(1060,500);await a.mouse.down();
    await b.waitForFunction(()=>me().hp<100);await a.mouse.up();
    await a.keyboard.press('KeyM');assert.equal(await a.locator('#mapPanel').isVisible(),true);await a.keyboard.press('KeyM');
    await a.evaluate(()=>{source.room.time=180;});await a.waitForTimeout(150);
    await a.screenshot({path:path.join(require('node:os').tmpdir(),'webgame-br-combat.png')});
    await a.evaluate(()=>{source.room.players[1].hp=1;});await a.mouse.down();await a.waitForFunction(()=>snap.state==='finished');await a.mouse.up();await b.waitForFunction(()=>snap.state==='finished');assert.equal(await a.evaluate(()=>snap.winner),0);
    await a.click('#restart');await a.waitForFunction(()=>snap.state==='selecting');await b.waitForFunction(()=>snap.state==='selecting');assert.equal(await a.evaluate(()=>me().gun),null);
    assert.deepEqual(errors,[]);console.log('PASS: two-page join, map drop, concealed interior, weapon/ammo/reload, wall collision, manual PvP, minimap, victory and restart; no page errors.');
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
