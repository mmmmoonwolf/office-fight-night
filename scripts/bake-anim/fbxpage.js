// opens a blank page with three r128 + FBXLoader; serves /fbx/<name> from the extracted folder
const {chromium}=require('playwright');const path=require('path'),fs=require('fs');
module.exports=async function(T,DIR){const b=await chromium.launch();const p=await b.newPage();
  await p.route('http://bake.local/**',r=>{const u=decodeURIComponent(new URL(r.request().url()).pathname);
    if(u==='/')return r.fulfill({body:'<html><body></body></html>',contentType:'text/html'});
    if(u.startsWith('/fbx/'))return r.fulfill({body:fs.readFileSync(path.join(DIR,u.slice(5))),contentType:'application/octet-stream'});
    return r.fulfill({status:404,body:''});});
  await p.goto('http://bake.local/');
  for(const f of['build/three.min.js','examples/js/libs/fflate.min.js','examples/js/curves/NURBSUtils.js','examples/js/curves/NURBSCurve.js','examples/js/loaders/FBXLoader.js'])if(fs.existsSync(path.join(T,f)))await p.addScriptTag({path:path.join(T,f)});
  return {b,p};};
