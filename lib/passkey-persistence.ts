import type {SupabaseClient} from '@supabase/supabase-js';

/**
 * Supabase mutations that did not throw can still be followed by a mismatched
 * read (e.g. wrong deployment/database, stale API, or an unexpected policy).
 * Do not tell a device that enrollment worked until its credential is visible.
 */
export async function verifyStoredPasskey(db:Pick<SupabaseClient,'from'>,credentialId:string):Promise<boolean>{
 if(!credentialId||credentialId.length>1024)return false;
 try{
  const {data,error}=await db.from('owner_passkeys')
   .select('credential_id').eq('credential_id',credentialId).maybeSingle();
  return !error&&data?.credential_id===credentialId;
 }catch{return false;}
}
