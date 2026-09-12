const fs=require('node:fs');
const url=(process.env.SUPABASE_URL||'').trim();
// Copy/paste from Supabase can include wrapped lines or box-drawing characters.
// Keep only characters valid in a JWT / Supabase public key.
const key=(process.env.SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_ANON_KEY||'').replace(/[^A-Za-z0-9._-]/g,'');
if(key.startsWith('sb_secret_'))throw Error('Use a publishable key, never a secret key.');
if(key.split('.').length===3){try{if(JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role==='service_role')throw Error('Service role keys must not be public.');}catch(e){if(e.message.includes('Service role'))throw e;}}
fs.mkdirSync('dist',{recursive:true});
for(const file of ['index.html','battle.js','game.js','motion.js','network.js'])fs.copyFileSync(file,'dist/'+file);
fs.writeFileSync('dist/config.js','window.GAME_CONFIG='+JSON.stringify({url,key})+';');
if(!url||!key)console.log('Supabase settings missing: UI builds, online play requires environment variables.');
