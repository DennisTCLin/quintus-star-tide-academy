import {afterEach,expect,it,vi} from 'vitest';
import {observePortrait,refreshPortraitVisibility} from '../portrait-visibility';

afterEach(()=>vi.unstubAllGlobals());
it('waits for image load, pauses unseen/hidden portraits and cleans up one shared observer',()=>{
 const listeners=new Map<string,()=>void>();
 const doc={hidden:false,addEventListener:vi.fn((name:string,fn:()=>void)=>listeners.set(name,fn)),removeEventListener:vi.fn((name:string)=>listeners.delete(name))};
 let intersect:(entries:{target:HTMLImageElement;isIntersecting:boolean}[])=>void=()=>{};
 const watcher={observe:vi.fn(),unobserve:vi.fn(),disconnect:vi.fn()};
 const constructor=vi.fn(function(cb:typeof intersect){intersect=cb;return watcher;});
 vi.stubGlobal('document',doc);vi.stubGlobal('IntersectionObserver',constructor);
 const first={dataset:{},complete:false,naturalWidth:0} as unknown as HTMLImageElement;
 const second={dataset:{},complete:true,naturalWidth:120} as unknown as HTMLImageElement;
 const stopFirst=observePortrait(first),stopSecond=observePortrait(second);
 try {
  expect(constructor).toHaveBeenCalledTimes(1);expect(doc.addEventListener).toHaveBeenCalledTimes(1);
  intersect([{target:first,isIntersecting:true},{target:second,isIntersecting:false}]);
  expect(first.dataset.characterActive).toBe('false');expect(second.dataset.characterActive).toBe('false');
  Object.assign(first,{complete:true,naturalWidth:120});refreshPortraitVisibility();expect(first.dataset.characterActive).toBe('true');
  doc.hidden=true;listeners.get('visibilitychange')!();expect(first.dataset.characterActive).toBe('false');
  doc.hidden=false;listeners.get('visibilitychange')!();expect(first.dataset.characterActive).toBe('true');
  intersect([{target:first,isIntersecting:false},{target:second,isIntersecting:true}]);
  expect(first.dataset.characterActive).toBe('false');expect(second.dataset.characterActive).toBe('true');
  Object.assign(second,{complete:true,naturalWidth:0});refreshPortraitVisibility();expect(second.dataset.characterActive).toBe('false');
 } finally {stopFirst();stopSecond();}
 expect(watcher.unobserve).toHaveBeenCalledTimes(2);expect(watcher.disconnect).toHaveBeenCalledTimes(1);expect(listeners.size).toBe(0);
 // A late callback must not retain an unmounted image or suppress future listeners.
 intersect([{target:first,isIntersecting:true}]);
 const stopAgain=observePortrait(first);stopAgain();expect(doc.addEventListener).toHaveBeenCalledTimes(2);
});
it('keeps image readiness and hidden-page safeguards without IntersectionObserver',()=>{
 const doc={hidden:false,addEventListener:vi.fn(),removeEventListener:vi.fn()};
 vi.stubGlobal('document',doc);vi.stubGlobal('IntersectionObserver',undefined);
 const img={dataset:{},complete:true,naturalWidth:100} as unknown as HTMLImageElement;
 const stop=observePortrait(img);
 try {expect(img.dataset.characterActive).toBe('true');doc.hidden=true;refreshPortraitVisibility();expect(img.dataset.characterActive).toBe('false');} finally {stop();}
});
