"use client";
import {createContext,useCallback,useContext,useEffect,useMemo,useSyncExternalStore} from "react";
import {getTranslation} from "@/src/i18n/getTranslation";
import type {AppLanguage} from "@/src/i18n/types";
const KEY="uni-predictor:language",EVENT="uni-predictor:language-change";
interface Value{language:AppLanguage;setLanguage:(language:AppLanguage)=>void;t:(key:string)=>string;locale:string}
const DEFAULT_VALUE:Value={language:"tr",setLanguage:()=>undefined,t:(key)=>getTranslation("tr",key),locale:"tr-TR"};
const Context=createContext<Value>(DEFAULT_VALUE);
const subscribe=(callback:()=>void)=>{window.addEventListener("storage",callback);window.addEventListener(EVENT,callback);return()=>{window.removeEventListener("storage",callback);window.removeEventListener(EVENT,callback)}};
const getSnapshot=():AppLanguage=>window.localStorage.getItem(KEY)==="en"?"en":"tr";
const getServerSnapshot=():AppLanguage=>"tr";
export function AppLanguageProvider({children}:{children:React.ReactNode}){
  const language=useSyncExternalStore(subscribe,getSnapshot,getServerSnapshot);
  useEffect(()=>{document.documentElement.lang=language},[language]);
  const setLanguage=useCallback((next:AppLanguage)=>{window.localStorage.setItem(KEY,next);window.dispatchEvent(new Event(EVENT))},[]);
  const value=useMemo<Value>(()=>({language,setLanguage,t:(key:string)=>getTranslation(language,key),locale:language==="tr"?"tr-TR":"en-US"}),[language,setLanguage]);
  return <Context.Provider value={value}>{children}</Context.Provider>
}
export function useAppLanguage(){return useContext(Context)}
