"use client";
import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import {usePathname} from "next/navigation";
import {AnimatePresence,motion,useReducedMotion} from "framer-motion";
import {Menu,X,Search,Heart,ShoppingBag,Sun,Moon,ArrowUpRight} from "lucide-react";
import {useStore} from "./store-provider";
import {SearchBox} from "@/components/products/search-box";

const navigation=[{label:"Home",href:"/"},{label:"Shop",href:"/shop"},{label:"About us",href:"/about"},{label:"Contact",href:"/contact"}];
export function Header(){
 const pathname=usePathname(),{cartCount,wishlist,theme,toggleTheme}=useStore(),reduce=useReducedMotion();
 const[scrolled,setScrolled]=useState(pathname!=="/"),[open,setOpen]=useState(false),[search,setSearch]=useState(false),openButton=useRef<HTMLButtonElement>(null),closeButton=useRef<HTMLButtonElement>(null);
 const heroTop=pathname==="/"&&!scrolled;
 useEffect(()=>{const update=()=>setScrolled(pathname!=="/"||window.scrollY>24);update();window.addEventListener("scroll",update,{passive:true});return()=>window.removeEventListener("scroll",update)},[pathname]);
 useEffect(()=>{document.body.style.overflow=open?"hidden":"";if(open)requestAnimationFrame(()=>closeButton.current?.focus());else openButton.current?.focus();return()=>{document.body.style.overflow=""}},[open]);
 useEffect(()=>{const onKey=(event:KeyboardEvent)=>{if(event.key==="Escape"){setOpen(false);setSearch(false)}};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey)},[]);
 const headerColor=heroTop?"#f5f1e5":"var(--ink)";
 return <>
  <header style={{position:"fixed",zIndex:50,top:0,left:0,right:0,color:headerColor,background:heroTop?"transparent":"color-mix(in srgb, var(--bg) 88%, transparent)",backdropFilter:heroTop?"none":"blur(18px)",borderBottom:heroTop?"1px solid transparent":"1px solid var(--line)",transition:"color .3s,background .3s,border-color .3s,backdrop-filter .3s"}}>
   <div className="shell" style={{height:76,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
    <Link href="/" aria-label="Amla House home" className="display" style={{fontWeight:800,fontSize:19,letterSpacing:"-.08em"}}>AMLA<span style={{color:"var(--gold)"}}>.</span>HOUSE</Link>
    <nav aria-label="Main navigation" className="desktop-nav">{navigation.map(item=><Link key={item.href} href={item.href} aria-current={pathname===item.href?"page":undefined} className={pathname===item.href?"active-nav":""}>{item.label}</Link>)}</nav>
    <div className="header-actions">
     <button onClick={()=>setSearch(value=>!value)} aria-label={search?"Close product search":"Search products"} aria-expanded={search} className="icon-action"><Search size={18}/></button>
     <Link href="/wishlist" aria-label={`Wishlist, ${wishlist.length} items`} className="counter-link"><Heart size={18}/>{wishlist.length>0&&<i className="counter">{wishlist.length}</i>}</Link>
     <Link href="/cart" aria-label={`Cart, ${cartCount} items`} className="counter-link"><ShoppingBag size={18}/>{cartCount>0&&<i className="counter">{cartCount}</i>}</Link>
     <button onClick={toggleTheme} aria-label={`Switch to ${theme==="dark"?"light":"dark"} theme`} className="icon-action">{theme==="dark"?<Sun size={17}/>:<Moon size={17}/>}</button>
     <button ref={openButton} className="mobile-trigger icon-action" onClick={()=>setOpen(true)} aria-label="Open menu" aria-expanded={open}><Menu size={22}/></button>
    </div>
   </div>
   <AnimatePresence initial={false}>{search&&<motion.div className="shell search-drop" initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}><SearchBox compact onSelect={()=>setSearch(false)}/></motion.div>}</AnimatePresence>
  </header>
  <style>{`.desktop-nav{display:flex;gap:35px;font-size:13px;font-weight:600;letter-spacing:.1em;text-transform:uppercase}.desktop-nav a{position:relative;padding:8px 0}.desktop-nav a:after{content:"";position:absolute;left:0;right:0;bottom:0;height:1px;background:var(--gold);transform:scaleX(0);transform-origin:left;transition:transform .25s}.desktop-nav a:hover:after,.desktop-nav a.active-nav:after{transform:scaleX(1)}.header-actions{display:flex;align-items:center;gap:19px}.icon-action,.counter-link{color:inherit;position:relative;display:grid;place-items:center}.icon-action{border:0;background:none;cursor:pointer;padding:4px}.counter-link{width:22px;height:28px}.counter{position:absolute;top:-3px;right:-8px;width:16px;height:16px;border-radius:50%;background:var(--gold);color:#101c14;font-size:9px;font-style:normal;display:grid;place-items:center}.mobile-trigger{display:none!important}.search-drop{padding-bottom:12px;background:var(--bg);color:var(--ink)}@media(max-width:750px){.desktop-nav{display:none}.mobile-trigger{display:grid!important}.header-actions{gap:15px}}`}</style>
  <AnimatePresence>{open&&<motion.div initial={reduce?false:{opacity:0}} animate={{opacity:1}} exit={reduce?{opacity:0}:{opacity:0}} transition={{duration:reduce?0:.2}} role="dialog" aria-modal="true" aria-label="Mobile navigation" className="mobile-menu" onKeyDown={event=>{if(event.key==="Tab"){const items=event.currentTarget.querySelectorAll<HTMLElement>('a[href],button:not([disabled])');const first=items[0],last=items[items.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}}}}>
   <div className="menu-top"><Link href="/" onClick={()=>setOpen(false)} className="display" style={{fontWeight:800}}>AMLA<span style={{color:"var(--gold)"}}>.</span>HOUSE</Link><button ref={closeButton} onClick={()=>setOpen(false)} aria-label="Close menu" className="icon-action"><X size={22}/></button></div>
   <nav className="mobile-links" aria-label="Mobile navigation">{[...navigation,{label:"Wishlist",href:"/wishlist"},{label:"Cart",href:"/cart"}].map((item,i)=><motion.div key={item.href} initial={reduce?false:{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:reduce?0:.24,delay:reduce?0:i*.045}}><Link href={item.href} aria-current={pathname===item.href?"page":undefined} onClick={()=>setOpen(false)}>{item.label}<ArrowUpRight size={20} color="var(--gold)"/></Link></motion.div>)}</nav>
   <div className="menu-bottom"><button onClick={()=>{setOpen(false);setSearch(true)}} className="btn btn-outline"><Search size={15}/> Search collection</button><button onClick={toggleTheme} className="btn btn-outline">{theme==="dark"?<Sun size={16}/>:<Moon size={16}/>} Switch theme</button></div>
  </motion.div>}</AnimatePresence>
  <style>{`.mobile-menu{position:fixed;inset:0;z-index:70;background:var(--bg);color:var(--ink);padding:26px 28px;display:flex;flex-direction:column}.menu-top{display:flex;justify-content:space-between;align-items:center}.mobile-links{display:flex;flex-direction:column;gap:7px;margin:auto 0}.mobile-links a{display:flex;align-items:center;gap:12px;font-size:clamp(38px,12vw,68px);font-weight:600;letter-spacing:-.07em}.menu-bottom{display:flex;gap:10px;flex-wrap:wrap}.menu-bottom .btn{padding:13px 15px}@media(prefers-reduced-motion:reduce){.mobile-menu *{transition:none!important}}`}</style>
 </>
}
