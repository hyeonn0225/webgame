const fs=require('node:fs');
const url=(process.env.SUPABASE_URL||'').trim();
// Copy/paste from Supabase can include wrapped lines; never ship whitespace in a JWT.
const key=(process.env.SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_ANON_KEY||'').replace(/\s/g,'');
if(key.startsWith('sb_secret_'))throw Error('Use a publishable key, never a secret key.');
if(key.split('.').length===3){try{if(JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role==='service_role')throw Error('Service role keys must not be public.');}catch(e){if(e.message.includes('Service role'))throw e;}}
fs.mkdirSync('dist',{recursive:true});
for(const file of ['index.html','engine.js','network.js'])fs.copyFileSync(file,'dist/'+file);
fs.writeFileSync('dist/config.js','window.GAME_CONFIG='+JSON.stringify({url,key})+';');
if(!url||!key)console.log('Supabase settings missing: UI builds, online play requires environment variables.');
