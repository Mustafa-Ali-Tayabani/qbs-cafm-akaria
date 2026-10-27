/* Read-only JSX control audit: distinguishes working controls from legacy reference-only buttons. */
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
let directMissing=[],legacyReferenceOnly=[];
for(const file of fs.readdirSync(path.join(__dirname,'src')).filter(x=>x.endsWith('.tsx'))){
 const full=path.join(__dirname,'src',file),src=fs.readFileSync(full,'utf8'),tree=ts.createSourceFile(file,src,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 function visit(node){
  if(ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node)){
   const tag=node.tagName.getText(tree),attrs=node.attributes.properties.map(p=>p.name?.getText(tree));
   if(['button','Button'].includes(tag)&&!attrs.includes('onClick')&&!attrs.includes('onChange')&&!attrs.includes('onKeyDown')&&!attrs.includes('disabled')&&!attrs.includes('type')){
    const line=tree.getLineAndCharacterOfPosition(node.pos).line+1;
    // App.Button is a wrapper that disables unhandled controls with explanatory title.
    (tag==='Button'&&file==='App.tsx'?legacyReferenceOnly:directMissing).push({file,line,source:src.slice(node.pos,node.end).slice(0,120)});
   }
  }
  ts.forEachChild(node,visit)
 }
 visit(tree)
}
console.log(JSON.stringify({unhandledNativeControls:directMissing.length,autoDisabledReferenceButtons:legacyReferenceOnly.length,details:{unhandled:directMissing,reference:legacyReferenceOnly}},null,2));
if(directMissing.length)process.exitCode=1;