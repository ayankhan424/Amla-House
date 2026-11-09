"use client";
import {useEffect,useState,type ReactNode} from "react";
import {usePathname} from "next/navigation";
import {AnimatePresence,motion,useReducedMotion} from "framer-motion";
import {Leaf} from "lucide-react";

export function SiteMotion({children}:{children:ReactNode}){
 const pathname=usePathname(),reduce=useReducedMotion();
 const [intro,setIntro]=useState(false);
 useEffect(()=>{if(pathname!=="/")return;try{if(!sessionStorage.getItem("amla-intro-seen")){sessionStorage.setItem("amla-intro-seen","1");setIntro(true)}}catch{setIntro(false)}},[pathname]);
 useEffect(()=>{if(!intro)return;const timer=window.setTimeout(()=>setIntro(false),1700);return()=>window.clearTimeout(timer)},[intro]);
 return <>
  <AnimatePresence>{intro&&!reduce&&<motion.div className="intro-overlay" initial={{opacity:1}} animate={{opacity:1}} exit={{opacity:0,transition:{duration:.55,ease:[.76,0,.24,1]}}} aria-hidden="true"><motion.div className="intro-leaf" initial={{opacity:0,y:10,rotate:-24}} animate={{opacity:1,y:0,rotate:0,transition:{duration:.45}}} exit={{opacity:0,y:-9}}><Leaf size={24}/></motion.div><motion.div className="intro-wordmark" initial={{opacity:0,y:12,letterSpacing:"-.03em"}} animate={{opacity:1,y:0,letterSpacing:"-.08em",transition:{duration:.65,ease:[.22,1,.36,1]}}} exit={{opacity:0,y:-8,transition:{duration:.25}}}>AMLA<span>.</span>HOUSE</motion.div></motion.div>}</AnimatePresence>
  <AnimatePresence mode="wait" initial={false}><motion.div key={pathname} initial={false} animate={{opacity:1,y:0}} exit={reduce?{opacity:1}:{opacity:0,y:-5}} transition={{duration:reduce?0:.22}}>{children}</motion.div></AnimatePresence>
 </>;
}
