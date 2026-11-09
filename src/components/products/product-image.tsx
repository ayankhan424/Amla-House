"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Leaf } from "lucide-react";

type Props={src:string|null;alt:string;name:string;priority?:boolean;sizes?:string;className?:string;style?:React.CSSProperties};
export function ProductImage({src,alt,name,priority=false,sizes="(max-width: 600px) 45vw, (max-width: 1100px) 30vw, 22vw",className="product-image",style}:Props){
 const [failed,setFailed]=useState(!src);
 useEffect(()=>setFailed(!src),[src]);
 if(!src||failed)return <div className="product-image-fallback" role="img" aria-label={`Product image unavailable: ${name}`}><Leaf size={27} strokeWidth={1.35}/><strong>{name}</strong><small>Image unavailable</small></div>;
 return <Image src={src} alt={alt} fill unoptimized priority={priority} sizes={sizes} className={className} style={style} onError={()=>setFailed(true)}/>;
}
