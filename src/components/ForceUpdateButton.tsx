 import { useState } from 'react';
 import { RefreshCw, AlertTriangle } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { useLanguage } from '@/contexts/LanguageContext';
 import { useToast } from '@/hooks/use-toast';
 import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
 } from '@/components/ui/alert-dialog';
 
// Version must match RegisterSW.tsx
declare const __APP_VERSION__: string;
const CURRENT_VERSION = __APP_VERSION__;
 
 export function ForceUpdateButton() {
   const { t } = useLanguage();
   const { toast } = useToast();
   const [isUpdating, setIsUpdating] = useState(false);
   const [showConfirm, setShowConfirm] = useState(false);
 
   const handleForceUpdate = async () => {
     setIsUpdating(true);
     setShowConfirm(false);
     
     console.log(`[DTS v${CURRENT_VERSION}] Force update initiated by user`);
     
     try {
       // Step 1: Unregister all service workers
       if ('serviceWorker' in navigator) {
         const registrations = await navigator.serviceWorker.getRegistrations();
         for (const registration of registrations) {
           await registration.unregister();
           console.log('[DTS] Service worker unregistered');
         }
       }
 
       // Step 2: Clear all caches
       if ('caches' in window) {
         const cacheNames = await caches.keys();
         await Promise.all(
           cacheNames.map(cacheName => {
             console.log('[DTS] Deleting cache:', cacheName);
             return caches.delete(cacheName);
           })
         );
         console.log('[DTS] All caches cleared');
       }
 
        // Step 3: Clear ALL localStorage version markers
        localStorage.removeItem('dts-app-version');
        localStorage.removeItem('dts-build-timestamp');
        localStorage.removeItem('dts-html-version');
        localStorage.removeItem('dts-html-version-v2');
        localStorage.removeItem('dts-force-clear-v2');
        localStorage.removeItem('dts-force-clear-v3');
        localStorage.removeItem('dts-last-update-check');
        sessionStorage.clear();
 
       toast({
         title: t('updateInProgress'),
         description: t('pageWillReload'),
       });
 
       // Step 4: Force reload with cache bust
       setTimeout(() => {
         const url = new URL(window.location.href);
         url.searchParams.set('_v', Date.now().toString());
         window.location.href = url.toString();
       }, 500);
 
     } catch (error) {
       console.error('[DTS] Force update failed:', error);
       toast({
         variant: 'destructive',
         title: t('error'),
         description: t('updateCheckFailed'),
       });
       setIsUpdating(false);
     }
   };
 
   return (
     <>
       <Button
         variant="outline"
         size="sm"
         onClick={() => setShowConfirm(true)}
         disabled={isUpdating}
         className="gap-2 border-amber-500/50 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
       >
         <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
         <span className="hidden sm:inline">{t('forceUpdate')}</span>
       </Button>
 
       <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle className="flex items-center gap-2">
               <AlertTriangle className="w-5 h-5 text-amber-500" />
               {t('forceUpdate')}
             </AlertDialogTitle>
             <AlertDialogDescription>
               {t('forceUpdateDescription')}
               <br /><br />
               <span className="text-xs text-muted-foreground">
                 {t('currentVersion')}: v{CURRENT_VERSION}
               </span>
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
             <AlertDialogAction onClick={handleForceUpdate} className="bg-amber-600 hover:bg-amber-700">
               <RefreshCw className="w-4 h-4 me-2" />
               {t('updateNow')}
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
     </>
   );
 }
 
 // Standalone force update function for use anywhere
 export async function forceAppUpdate() {
   console.log('[DTS] Force update triggered programmatically');
   
   // Unregister service workers
   if ('serviceWorker' in navigator) {
     const registrations = await navigator.serviceWorker.getRegistrations();
     await Promise.all(registrations.map(r => r.unregister()));
   }
 
   // Clear caches
   if ('caches' in window) {
     const cacheNames = await caches.keys();
     await Promise.all(cacheNames.map(name => caches.delete(name)));
   }
 
  // Clear ALL storage
  localStorage.removeItem('dts-app-version');
  localStorage.removeItem('dts-build-timestamp');
  localStorage.removeItem('dts-html-version');
  localStorage.removeItem('dts-html-version-v2');
  localStorage.removeItem('dts-force-clear-v2');
  localStorage.removeItem('dts-force-clear-v3');
  localStorage.removeItem('dts-last-update-check');
  sessionStorage.clear();
 
   // Reload
   window.location.href = window.location.origin + '?_v=' + Date.now();
 }