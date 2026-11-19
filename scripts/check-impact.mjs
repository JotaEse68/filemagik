import {execFileSync} from 'node:child_process';
const base=process.env.FM_BASE_SHA;
if(!base){console.error('FM_BASE_SHA es obligatorio para comparar el PR');process.exit(1);}
let changes;
try{changes=execFileSync('git',['diff','--name-only',base,'HEAD'],{encoding:'utf8'}).split('\n').filter(Boolean);}
catch{console.error('Falta historial de la base. Configurar fetch-depth:0.');process.exit(1);}
const touched=changes.filter(path=>/^src\/(lib\/|app\/api\/|components\/)/.test(path)||/^pdf-engine\/(?!tests\/)/.test(path)||path==='package.json');
if(!touched.length){console.log('Sin cambios de lógica de producto');process.exit(0);}
const tests=changes.some(path=>/^e2e\/.*\.spec\.ts$/.test(path)||/^tests\/.*\.test\.mjs$/.test(path)||/^pdf-engine\/tests\/.*\.py$/.test(path));
if(!changes.includes('docs/IMPACTO_CAMBIOS.md')||!tests){
 console.error('Bloqueo: actualizar docs/IMPACTO_CAMBIOS.md y pruebas en cada PR crítica.',touched);
 process.exit(1);
}
console.log('Mapa de impacto y nuevas pruebas presentes.');
