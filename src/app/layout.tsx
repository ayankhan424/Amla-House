import type { Metadata, Viewport } from "next";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { StoreProvider } from "@/components/layout/store-provider";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ChatAssistant } from "@/components/chatbot/chat-assistant";
import { FloatingWhatsApp } from "@/components/layout/whatsapp-float";
import { SiteMotion } from "@/components/ui/site-motion";
export const metadata:Metadata={metadataBase:new URL(siteConfig.url),title:{default:"Amla House — Amla, in its element",template:"%s | Amla House"},description:siteConfig.description,alternates:{canonical:"/"},openGraph:{type:"website",siteName:"Amla House",title:"Amla House — Amla, in its element",description:siteConfig.description},twitter:{card:"summary_large_image",title:"Amla House — Amla, in its element",description:siteConfig.description},applicationName:"Amla House"};
export const viewport:Viewport={themeColor:"#0a1712",width:"device-width",initialScale:1};
const themeInit=`try{var t=localStorage.getItem('amla-theme');document.documentElement.dataset.theme=t||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}catch(e){document.documentElement.dataset.theme='light'}`;
const websiteJson={"@context":"https://schema.org","@type":"WebSite",name:"Amla House",url:siteConfig.url,description:siteConfig.description};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:themeInit}}/></head><body><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(websiteJson).replace(/</g,"\\u003c")}}/><a className="skip-link" href="#main-content">Skip to content</a><StoreProvider><Header/><div id="main-content"><SiteMotion>{children}</SiteMotion></div><Footer/><FloatingWhatsApp/><ChatAssistant/></StoreProvider></body></html>}
