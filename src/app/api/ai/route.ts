import {NextResponse} from "next/server";
import {z} from "zod";
import {products} from "@/data/products";
import {siteConfig} from "@/config/site";
import {hasGroqKey,streamGroq,type ChatTurn} from "@/lib/ai/provider";

export const runtime="nodejs";

const chatMessageSchema=z.discriminatedUnion("role",[
  z.object({role:z.literal("user"),content:z.string().trim().min(1).max(1200)}),
  z.object({role:z.literal("assistant"),content:z.string().trim().min(1).max(4000)}),
]);
const schema=z.object({messages:z.array(chatMessageSchema).min(1).max(12)});
const windows=new Map<string,{start:number;count:number}>();
const WINDOW_MS=60_000,MAX_REQUESTS=12,MAX_BODY_BYTES=16_000;
const encoder=new TextEncoder();

function rateLimitKey(req:Request){
  const forwarded=req.headers.get("x-vercel-forwarded-for")||req.headers.get("x-forwarded-for")||"unknown";
  return forwarded.split(",")[0].trim().slice(0,80)||"unknown";
}

function isRateLimited(req:Request){
  const now=Date.now();
  for(const [ip,state] of windows)if(now-state.start>WINDOW_MS)windows.delete(ip);
  const key=rateLimitKey(req),current=windows.get(key);
  if(!current||now-current.start>WINDOW_MS){windows.set(key,{start:now,count:1});return false;}
  current.count+=1;
  return current.count>MAX_REQUESTS;
}

function recommendationsFrom(text:string){
  const requested=[...text.matchAll(/\[\[product:([a-z0-9-]+)\]\]/gi)].map((match)=>match[1].toLowerCase());
  const ids=requested.length?requested:products.filter((product)=>text.toLowerCase().includes(product.name.toLowerCase())).map((product)=>product.id);
  return [...new Set(ids)].filter((id)=>products.some((product)=>product.id===id)).slice(0,3);
}

function cleanMarkers(text:string){return text.replace(/\s*\[\[product:[a-z0-9-]+\]\]/gi,"").trim();}

async function readBoundedBody(req:Request){
  const reader=req.body?.getReader();
  if(!reader)return "";
  const chunks:Uint8Array[]=[];
  let length=0;
  while(true){
    const {done,value}=await reader.read();
    if(done)break;
    length+=value.byteLength;
    if(length>MAX_BODY_BYTES){await reader.cancel();throw new RangeError("BODY_TOO_LARGE");}
    chunks.push(value);
  }
  const body=new Uint8Array(length);
  let offset=0;
  for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength;}
  return new TextDecoder().decode(body);
}

function demoAnswer(text:string,history:ChatTurn[]=[]){
  const query=text.toLowerCase();
  let chosen=products.filter((product)=>product.keywords.some((keyword)=>query.includes(keyword.toLowerCase()))||query.includes(product.name.toLowerCase())||query.includes(product.id));
  if(/parachute/.test(query))return {text:"Parachute is not in Amla House’s catalogue, so I can’t verify or compare its products. I can compare two listed Dabur oils by their catalogue details if you tell me which ones.",recommendations:[]};
  if(/which|good|best|better|one/.test(query)&&!chosen.length){
    const priorAssistant=history.filter((turn)=>turn.role==="assistant").map((turn)=>turn.content.toLowerCase()).join(" ");
    const contextProducts=products.filter((product)=>priorAssistant.includes(product.name.toLowerCase())).slice(0,2);
    if(contextProducts.length)return {text:"I can’t verify which one works best; this catalogue has no comparative performance evidence. I can compare their listed sizes and retailer prices instead. Which matters more to you?",recommendations:contextProducts.map((product)=>product.id)};
  }
  if(/compare|difference|versus|\bvs\b/.test(query)&&!chosen.length)chosen=products.slice(0,3);
  if(/recommend|choose|suggest|which|concern|dry|frizz|breakage/.test(query)&&!chosen.length)chosen=products.slice(0,3);
  if(/price|cost|how much|sizes|size|variant|available/.test(query)&&!chosen.length)chosen=products.slice(0,4);
  if(/use|routine|apply|how do i/.test(query)){
    const usageProduct=products.find((product)=>product.usage?.length);
    chosen=usageProduct?[usageProduct]:[];
    return {text:usageProduct?`${usageProduct.name} is the only item in this catalogue with verified usage instructions: ${usageProduct.usage!.join(" ")} Other product-specific usage has not been verified. This is product information, not medical advice.`:"I don’t have verified usage instructions for the products in this catalogue yet. Please follow the product packaging.",recommendations:chosen.map((product)=>product.id)};
  }
  if(/pain|rash|itch|sore|bleed|sudden|persistent|medical|diagnos/.test(query))return {text:"I can’t diagnose or assess scalp and hair conditions. If symptoms are painful, sudden, severe, or persistent, please speak with a qualified healthcare professional.",recommendations:[]};
  if(/contact|email|support/.test(query))return {text:siteConfig.contactEmail?`You can contact Amla House at ${siteConfig.contactEmail}.`:`A contact email has not been configured for Amla House.`,recommendations:[]};
  if(/order|buy|purchase|whatsapp|bag|cart/.test(query))return {text:"You can add priced catalogue items to your bag, review the selections, then use the WhatsApp order button to ask the seller to confirm current price, stock, delivery, and payment. No payment is taken on this site.",recommendations:chosen.filter((product)=>product.sizes.some((size)=>size.price!==null)).slice(0,3).map((product)=>product.id)};
  if(!chosen.length)return {text:"I’m in demo mode because a Groq API key isn’t configured, so I can only answer a few catalogue questions. I can show listed sizes, retailer price snapshots, or the verified usage instructions for Dabur Amla Hair Oil. Ask me about one of those, or add GROQ_API_KEY to .env.local for live Groq replies.",recommendations:[]};
  return {text:`I’m in demo mode because a Groq API key isn’t configured. Here are catalogue matches for your question:\n${chosen.slice(0,4).map((product)=>{
    const sizes=product.sizes.map((size)=>`${size.label}${size.price===null?" (price unavailable)":` — PKR ${size.price}${size.retailer?` retailer snapshot from ${size.retailer}`:""}`}`).join(", ");
    return `${product.name}: ${sizes}. ${product.ingredients.length?`Verified ingredients: ${product.ingredients.join(", ")}.`:"Ingredients are not verified in this catalogue."}`;
  }).join("\n")} These are retailer snapshots, not official Dabur prices; availability is not verified.`,recommendations:chosen.slice(0,4).map((product)=>product.id)};
}

export async function GET(){return NextResponse.json({mode:hasGroqKey()?"live":"demo"},{headers:{"Cache-Control":"no-store"}});}

export async function POST(req:Request){
  if(isRateLimited(req))return NextResponse.json({error:"You’ve sent several messages. Please wait a moment and try again."},{status:429,headers:{"Retry-After":"60"}});
  try{
    const declaredLength=Number(req.headers.get("content-length")||0);
    if(declaredLength>MAX_BODY_BYTES)return NextResponse.json({error:"Please send a shorter message."},{status:413});
    const raw=await readBoundedBody(req);
    const parsed=schema.safeParse(JSON.parse(raw));
    if(!parsed.success||parsed.data.messages.at(-1)?.role!=="user")return NextResponse.json({error:"Please send a valid message (up to 1,200 characters)."},{status:400});
    const turns=parsed.data.messages as ChatTurn[];
    if(!hasGroqKey())return NextResponse.json({mode:"demo",...demoAnswer(turns.at(-1)!.content,turns.slice(0,-1))});
    const iterator=await streamGroq(turns);
    const stream=new ReadableStream<Uint8Array>({
      async start(controller){
        let assembled="";
        try{
          for await(const chunk of iterator){
            const delta=chunk;
            if(!delta)continue;
            assembled+=delta;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({type:"delta",text:delta})}\n\n`));
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({type:"done",recommendations:recommendationsFrom(assembled),text:cleanMarkers(assembled)})}\n\n`));
        }catch{
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({type:"error",error:"Amla AI had trouble reaching Groq. Please try again."})}\n\n`));
        }finally{controller.close();}
      },
      cancel(){void iterator.return?.(undefined);},
    });
    return new Response(stream,{headers:{"Content-Type":"text/event-stream; charset=utf-8","Cache-Control":"no-cache, no-transform","Connection":"keep-alive","X-Accel-Buffering":"no"}});
  }catch(error){
    if(error instanceof RangeError)return NextResponse.json({error:"Please send a shorter message."},{status:413});
    if(error instanceof SyntaxError)return NextResponse.json({error:"Please send a valid message."},{status:400});
    if(error instanceof Error&&error.message==="GROQ_AUTH_ERROR")return NextResponse.json({error:"Groq rejected the configured API key. Check that GROQ_API_KEY is an active GroqCloud key."},{status:502});
    if(error instanceof Error&&error.message==="GROQ_HTTP_429")return NextResponse.json({error:"Groq rate limit or quota was reached. Check your GroqCloud usage and try again later."},{status:502});
    if(error instanceof Error&&error.message==="GROQ_HTTP_404")return NextResponse.json({error:"Groq does not recognize the configured model ID. Check GROQ_MODEL in .env.local."},{status:502});
    if(error instanceof Error&&error.message==="GROQ_HTTP_400")return NextResponse.json({error:"Groq rejected the request format. Check GROQ_MODEL and the model’s supported request options."},{status:502});
    return NextResponse.json({error:"Amla AI is temporarily unavailable. Please try again."},{status:502});
  }
}
