import {NextResponse} from 'next/server';import {getReport} from '@/lib/report';
export const dynamic='force-dynamic';
export async function GET(){return NextResponse.json(await getReport(),{headers:{'Cache-Control':'no-store'}})}
