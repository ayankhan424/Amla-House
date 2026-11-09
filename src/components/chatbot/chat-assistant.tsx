"use client";

import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import {AnimatePresence,motion,useReducedMotion} from "framer-motion";
import {ArrowUpRight,Check,MessageCircle,RotateCcw,Send,ShoppingBag,Sparkles,X} from "lucide-react";
import {products,type Product,formatPKR} from "@/data/products";
import {ProductImage} from "@/components/products/product-image";
import {useStore} from "@/components/layout/store-provider";

type Turn={role:"user"|"assistant";content:string;recommendations?:string[];mode?:"live"|"demo"};
type StreamEvent={type:"delta";text:string}|{type:"done";recommendations:string[];text:string}|{type:"error";error:string};
const welcome="Hello, I’m Amla AI, your personal hair-care consultant and shopping assistant. I can help you explore the catalogue, compare listed oils, and prepare a WhatsApp order. I can’t diagnose scalp conditions or promise results.";
const prompts=["Help me choose an oil","Compare the Amla oils","What usage is verified?","How do I order on WhatsApp?"];

function renderable(text:string){return text.replace(/\s*\[\[product:[a-z0-9-]+\]\]/gi,"").trim();}

function Recommendation({product,onClose}:{product:Product;onClose:()=>void}){
  const {addToCart}=useStore();
  const [added,setAdded]=useState(false);
  const priced=product.sizes.find((size)=>size.price!==null);
  const shownSize=priced||product.sizes[0];
  return <article className="ai-recommendation">
    <Link href={`/products/${product.slug}`} onClick={onClose} className="ai-rec-image"><ProductImage src={product.image} alt={product.alt} name={product.name} sizes="92px"/></Link>
    <div className="ai-rec-copy">
      <span className="ai-rec-label">Catalogue match</span>
      <Link href={`/products/${product.slug}`} onClick={onClose} className="ai-rec-name">{product.name}<ArrowUpRight size={13} aria-hidden="true"/></Link>
      <span className="ai-rec-detail">{shownSize.label}{priced?` · ${formatPKR(priced.price!)} retailer snapshot${priced.retailer?` · ${priced.retailer}`:""}`:" · Price unavailable"}</span>
      {priced?<button className="ai-rec-add" onClick={()=>{addToCart(product,priced.label,priced.price!);setAdded(true);}}>{added?<Check size={13} aria-hidden="true"/>:<ShoppingBag size={13} aria-hidden="true"/>} {added?"Added to bag":"Add to bag"}</button>:<Link href={`/products/${product.slug}`} onClick={onClose} className="ai-rec-add">View details <ArrowUpRight size={12} aria-hidden="true"/></Link>}
    </div>
  </article>;
}

export function ChatAssistant(){
  const reduce=useReducedMotion();
  const [open,setOpen]=useState(false);
  const [mode,setMode]=useState<"checking"|"live"|"demo">("checking");
  const [messages,setMessages]=useState<Turn[]>([{role:"assistant",content:welcome}]);
  const [input,setInput]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const listRef=useRef<HTMLDivElement>(null);
  const controllerRef=useRef<AbortController|null>(null);

  useEffect(()=>{let active=true;fetch("/api/ai").then((response)=>response.ok?response.json():null).then((data)=>{if(active)setMode(data?.mode==="live"?"live":"demo");}).catch(()=>{if(active)setMode("demo");});return()=>{active=false;};},[]);
  useEffect(()=>{if(listRef.current)listRef.current.scrollTop=listRef.current.scrollHeight;},[messages,busy,open]);

  async function send(value=input){
    const text=value.trim();
    if(!text||busy)return;
    const history=[...messages,{role:"user" as const,content:text}].slice(-12);
    setMessages([...history,{role:"assistant",content:""}]);
    setInput("");setBusy(true);setError("");
    const controller=new AbortController();controllerRef.current=controller;
    const updateAssistant=(update:Partial<Turn>)=>setMessages((current)=>current.map((turn,index)=>index===current.length-1&&turn.role==="assistant"?{...turn,...update}:turn));
    try{
      const response=await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:history}),signal:controller.signal});
      if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||"Amla AI is temporarily unavailable. Please try again.");}
      if(response.headers.get("content-type")?.includes("application/json")){
        const data=await response.json();
        if(data.mode==="demo")setMode("demo");
        updateAssistant({content:data.text||"I couldn’t prepare a response just now. Please try again.",recommendations:data.recommendations||[],mode:data.mode||"live"});
        return;
      }
      setMode("live");
      if(!response.body)throw new Error("This browser could not open the response stream. Please try again.");
      const reader=response.body.getReader(),decoder=new TextDecoder();let buffer="",fullText="",finished=false;
      while(!finished){
        const {value,done}=await reader.read();
        if(done)break;
        buffer+=decoder.decode(value,{stream:true});
        const events=buffer.split("\n\n");buffer=events.pop()||"";
        for(const event of events){
          const line=event.split("\n").find((part)=>part.startsWith("data: "));
          if(!line)continue;
          const payload=JSON.parse(line.slice(6)) as StreamEvent;
          if(payload.type==="delta"){fullText+=payload.text;updateAssistant({content:fullText});}
          if(payload.type==="done"){fullText=payload.text||renderable(fullText);updateAssistant({content:fullText,recommendations:payload.recommendations,mode:"live"});finished=true;break;}
          if(payload.type==="error")throw new Error(payload.error);
        }
      }
      if(!fullText.trim())throw new Error("Amla AI returned an empty response. Please try again.");
    }catch(caught){
      if(caught instanceof DOMException&&caught.name==="AbortError")return;
      setMessages(history);setError(caught instanceof Error?caught.message:"Could not reach Amla AI. Please try again.");
    }finally{if(controllerRef.current===controller){controllerRef.current=null;setBusy(false);}}
  }

  function clear(){controllerRef.current?.abort();controllerRef.current=null;setMessages([{role:"assistant",content:welcome}]);setInput("");setBusy(false);setError("");}

  return <>
    <motion.button className="ai-launch" aria-label={open?"Close Amla AI":"Open Amla AI shopping assistant"} aria-expanded={open} onClick={()=>setOpen(!open)} whileTap={reduce?undefined:{scale:.96}}>
      <span className="ai-launch-icon" aria-hidden="true">{open?<X size={19}/>:<Sparkles size={19}/>}</span><span><strong>Amla AI</strong><small>Hair-care assistant</small></span><i className="ai-live-dot" aria-hidden="true"/>
    </motion.button>
    <AnimatePresence>
      {open&&<motion.section className="ai-panel" role="dialog" aria-modal="false" aria-label="Amla AI shopping assistant" initial={reduce?false:{opacity:0,y:18,scale:.97}} animate={{opacity:1,y:0,scale:1}} exit={reduce?{opacity:0}:{opacity:0,y:18,scale:.97}} transition={{duration:reduce?0:.24,ease:[.22,1,.36,1]}}>
        <header className="ai-header"><div className="ai-brand-icon" aria-hidden="true"><Sparkles size={17}/></div><div className="ai-title"><strong>Amla AI</strong><span>Personal hair-care consultant</span></div><span className={`ai-status ${mode}`}><i aria-hidden="true"/>{mode==="checking"?"Connecting":mode==="live"?"Groq live":"Demo mode"}</span><button onClick={clear} aria-label="Clear conversation" title="Clear conversation"><RotateCcw size={15} aria-hidden="true"/></button><button onClick={()=>setOpen(false)} aria-label="Close Amla AI" title="Close"><X size={18} aria-hidden="true"/></button></header>
        {mode==="demo"&&<div className="ai-demo-note"><Sparkles size={13}/> Demo guidance · Add <code>GROQ_API_KEY</code> to <code>.env.local</code> for live Groq replies.</div>}
        <div className="ai-messages" ref={listRef} aria-live="polite" aria-relevant="additions text">
          {messages.map((turn,index)=>{
            const recs=(turn.recommendations||[]).map((id)=>products.find((product)=>product.id===id)).filter((product):product is Product=>Boolean(product));
            return <motion.div key={`${index}-${turn.role}`} className={`ai-message-row ${turn.role}`} initial={reduce?false:{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:reduce?0:.18}}>
              {turn.role==="assistant"&&<span className="ai-avatar"><Sparkles size={13}/></span>}
              <div className={`ai-bubble ${turn.role}`}>
                {turn.content?<p>{renderable(turn.content)}</p>:busy&&index===messages.length-1?<div className="ai-typing" aria-label="Amla AI is typing"><i/><i/><i/></div>:null}
                {turn.mode==="demo"&&<small className="ai-demo-label">Demo guidance · no live AI response</small>}
                {recs.length>0&&<div className="ai-recommendations">{recs.map((product)=><Recommendation key={product.id} product={product} onClose={()=>setOpen(false)}/>)}</div>}
              </div>
            </motion.div>;
          })}
          {error&&<div className="ai-error" role="alert">{error}<button onClick={()=>void send(messages.at(-1)?.role==="user"?messages.at(-1)!.content:input)}>Try again</button></div>}
        </div>
        {messages.length===1&&!busy&&<div className="ai-prompts"><span>TRY ASKING</span>{prompts.map((prompt)=><button key={prompt} onClick={()=>void send(prompt)}>{prompt}<ArrowUpRight size={12}/></button>)}</div>}
        <form className="ai-compose" onSubmit={(event)=>{event.preventDefault();void send();}}><input value={input} onChange={(event)=>setInput(event.target.value)} maxLength={1200} placeholder="Ask about oils, sizes or ordering…" aria-label="Message Amla AI"/><span className="ai-char-count">{input.length}/1200</span><button aria-label="Send message" disabled={busy||!input.trim()}><Send size={16}/></button></form>
        <footer className="ai-footer"><span><MessageCircle size={12}/> Shopping guidance · not medical advice</span><Link href="/cart" onClick={()=>setOpen(false)}>Review bag <ArrowUpRight size={11}/></Link></footer>
      </motion.section>}
    </AnimatePresence>
    <style>{`.ai-launch{position:fixed;z-index:55;left:22px;bottom:22px;display:flex;align-items:center;gap:11px;min-width:178px;padding:10px 14px;border:1px solid color-mix(in srgb,var(--gold) 44%,var(--line));border-radius:999px;background:color-mix(in srgb,var(--surface) 92%,transparent);color:var(--ink);backdrop-filter:blur(14px);box-shadow:0 10px 32px #07180e28;cursor:pointer;text-align:left;animation:ai-appear .4s ease-out both;transition:box-shadow .2s,transform .2s}.ai-launch:hover{box-shadow:0 14px 40px #07180e38;transform:translateY(-2px)}.ai-launch-icon{width:37px;height:37px;display:grid;place-items:center;border-radius:50%;background:linear-gradient(145deg,#264934,#10251b);color:#e6cf91}.ai-launch>span:nth-child(2){display:grid;gap:2px}.ai-launch strong{font:600 12px Manrope, sans-serif;letter-spacing:.01em}.ai-launch small{font-size:9px;color:var(--muted)}.ai-live-dot,.ai-status i{width:7px;height:7px;border-radius:50%;background:#66a77a;box-shadow:0 0 0 3px #66a77a22}.ai-live-dot{margin-left:auto}.ai-panel{position:fixed;z-index:80;left:22px;bottom:86px;width:min(430px,calc(100vw - 32px));height:min(650px,calc(100svh - 116px));display:flex;flex-direction:column;overflow:hidden;border:1px solid color-mix(in srgb,var(--gold) 35%,var(--line));border-radius:18px;background:var(--bg);color:var(--ink);box-shadow:0 28px 90px #06140d55}.ai-header{min-height:68px;padding:12px 14px;display:flex;align-items:center;gap:10px;background:linear-gradient(112deg,#11271c,#1b3828);color:#f5f1e5}.ai-brand-icon{width:36px;height:36px;display:grid;place-items:center;border:1px solid #d7bd7b55;border-radius:50%;color:#d7bd7b}.ai-title{flex:1;display:grid;gap:3px}.ai-title strong{font-size:13px;letter-spacing:.02em}.ai-title span{font-size:9px;color:#d7ded2}.ai-status{display:flex;align-items:center;gap:6px;font-size:8px;white-space:nowrap;color:#d1dbce}.ai-status i{width:6px;height:6px}.ai-status.demo i{background:#d3b86e;box-shadow:0 0 0 3px #d3b86e20}.ai-header>button{width:28px;height:28px;display:grid;place-items:center;border:0;border-radius:50%;background:#ffffff10;color:inherit;cursor:pointer}.ai-header>button:hover{background:#ffffff20}.ai-demo-note{padding:8px 14px;display:flex;align-items:center;gap:6px;background:#d8c78d20;color:var(--muted);font-size:9px}.ai-demo-note svg{color:var(--gold)}.ai-demo-note code{font-size:9px;color:var(--ink)}.ai-messages{flex:1;min-height:0;overflow:auto;padding:15px 13px;display:flex;flex-direction:column;gap:12px;scroll-behavior:smooth}.ai-message-row{display:flex;align-items:flex-end;gap:7px;max-width:100%}.ai-message-row.user{justify-content:flex-end}.ai-avatar{flex:0 0 25px;width:25px;height:25px;display:grid;place-items:center;border-radius:50%;background:#163321;color:#d7bd7b}.ai-bubble{max-width:88%;padding:11px 13px;border:1px solid var(--line);border-radius:14px 14px 14px 3px;background:var(--surface);font-size:11px;line-height:1.75;white-space:pre-wrap;overflow-wrap:anywhere}.ai-bubble.user{border-color:#294c36;background:#203e2c;color:#f3f0e6;border-radius:14px 14px 3px 14px}.ai-bubble p{margin:0}.ai-demo-label{display:block;margin-top:8px;color:var(--muted);font-size:8px}.ai-typing{height:18px;display:flex;align-items:center;gap:4px}.ai-typing i{width:6px;height:6px;border-radius:50%;background:#a59058;animation:ai-dot .9s ease-in-out infinite alternate}.ai-typing i:nth-child(2){animation-delay:.16s}.ai-typing i:nth-child(3){animation-delay:.32s}.ai-recommendations{display:grid;gap:7px;margin-top:9px}.ai-recommendation{display:grid;grid-template-columns:68px minmax(0,1fr);gap:9px;padding:7px;border:1px solid var(--line);border-radius:10px;background:var(--bg)}.ai-rec-image{position:relative;width:68px;height:77px;display:block;overflow:hidden;background:var(--surface);border-radius:6px}.ai-rec-copy{min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:3px}.ai-rec-label{font-size:7px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}.ai-rec-name{display:flex;align-items:center;gap:3px;font-size:10px;font-weight:700;line-height:1.3}.ai-rec-detail{font-size:8px;color:var(--muted);line-height:1.3}.ai-rec-add{margin-top:auto;min-height:24px;padding:4px 8px;display:inline-flex;align-items:center;gap:5px;border:1px solid color-mix(in srgb,var(--gold) 60%,var(--line));border-radius:5px;background:color-mix(in srgb,var(--gold) 12%,var(--bg));color:var(--ink);font-size:8px;text-decoration:none;cursor:pointer}.ai-prompts{padding:2px 14px 10px;display:grid;grid-template-columns:1fr 1fr;gap:6px}.ai-prompts>span{grid-column:1/-1;font-size:8px;letter-spacing:.14em;color:var(--muted)}.ai-prompts button{min-height:33px;padding:6px 8px;display:flex;align-items:center;justify-content:space-between;gap:5px;border:1px solid var(--line);border-radius:6px;background:transparent;color:var(--ink);font-size:9px;text-align:left;cursor:pointer}.ai-prompts button:hover{border-color:var(--gold)}.ai-compose{min-height:53px;margin:0 12px 8px;padding:5px 6px 5px 12px;display:flex;align-items:center;gap:7px;border:1px solid var(--line);border-radius:9px;background:var(--surface)}.ai-compose input{flex:1;min-width:0;border:0;outline:none;background:none;color:var(--ink);font-size:11px}.ai-char-count{font-size:8px;color:var(--muted)}.ai-compose button{width:34px;height:34px;display:grid;place-items:center;border:0;border-radius:7px;background:#1b3928;color:#e6cf91;cursor:pointer}.ai-compose button:disabled{opacity:.4;cursor:default}.ai-footer{display:flex;align-items:center;justify-content:space-between;padding:0 15px 11px;color:var(--muted);font-size:8px}.ai-footer span,.ai-footer a{display:flex;align-items:center;gap:5px}.ai-footer a{color:var(--ink)}.ai-error{margin:0 12px 8px;padding:9px 11px;display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #a9564c55;border-radius:7px;color:#a9564c;font-size:9px}.ai-error button{border:0;background:none;color:inherit;text-decoration:underline;cursor:pointer}@keyframes ai-appear{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes ai-dot{to{opacity:.35;transform:translateY(-3px)}}@media(max-width:600px){.ai-launch{left:12px;bottom:76px;min-width:156px;padding:8px 11px}.ai-panel{left:10px;bottom:128px;width:calc(100vw - 20px);height:min(660px,calc(100svh - 148px));border-radius:15px}.ai-header{gap:7px;padding:10px}.ai-status{font-size:7px}.ai-title span{font-size:8px}.ai-bubble{max-width:92%}.ai-demo-note{font-size:8px}.ai-char-count{display:none}}@media(prefers-reduced-motion:reduce){.ai-launch{animation:none;transition:none}.ai-messages{scroll-behavior:auto}.ai-typing i{animation:none;opacity:.7}}`}</style>
  </>;
}
