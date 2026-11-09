"use client";
import {motion,useReducedMotion} from "framer-motion";
import type {CSSProperties,ReactNode} from "react";
export function Reveal({children,className,style,delay=0,distance=18}:{children:ReactNode;className?:string;style?:CSSProperties;delay?:number;distance?:number}){const reduce=useReducedMotion();return <motion.div className={className} style={style} initial={reduce?false:{opacity:0,y:distance}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.16,margin:"0px 0px -36px 0px"}} transition={{duration:reduce?0:.58,delay:reduce?0:delay,ease:[.22,1,.36,1]}}>{children}</motion.div>}
