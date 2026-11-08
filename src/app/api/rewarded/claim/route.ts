import {NextResponse} from 'next/server';
// No credits are ever issued from an untrusted browser callback.
// This endpoint remains deliberately disabled until Google's signed web SSV
// callback and a transactional one-time credit ledger are connected.
export async function POST(){
 return NextResponse.json({error:'Los créditos por publicidad requieren confirmación verificable del proveedor. Ninguna operación de pago puede desbloquearse desde el navegador.'},{status:503,headers:{'Cache-Control':'no-store'}});
}
