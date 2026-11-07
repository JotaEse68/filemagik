'use client';
import Placement from './placement';
import type {AdPlacement} from '@/lib/advertising/config';
export default function AdSlot({slot}:{slot:AdPlacement;label?:string}){return <Placement placement={slot}/>;}
