 import { useState } from 'react';
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
 } from '@/components/ui/dialog';
 import { Button } from '@/components/ui/button';
 import { Label } from '@/components/ui/label';
 import { Textarea } from '@/components/ui/textarea';
 import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
 import { Card, CardContent } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { useLanguage } from '@/contexts/LanguageContext';
 import { useAuth } from '@/contexts/AuthContext';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from 'sonner';
 import { formatNumber } from '@/utils/numberFormat';
 import { 
   ArrowRightLeft, 
   Undo2, 
   FileX, 
   AlertTriangle,
   Settings
 } from 'lucide-react';
 
 interface PettyCashPeriod {
   id: string;
   period_number: string;
   current_balance: number;
   total_expenses: number;
   opening_balance: number;
   status: string;
 }
 
 interface EditDispositionDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   period: PettyCashPeriod;
   onSuccess: () => void;
 }
 
 type DispositionType = 'carried_forward' | 'refunded' | 'written_off';
 
 export function EditDispositionDialog({ 
   open, 
   onOpenChange, 
   period, 
   onSuccess 
 }: EditDispositionDialogProps) {
   const { t, language } = useLanguage();
   const { user } = useAuth();
   const isRTL = language === 'ar';
   
   const [disposition, setDisposition] = useState<DispositionType>('carried_forward');
   const [reference, setReference] = useState('');
   const [notes, setNotes] = useState('');
   const [loading, setLoading] = useState(false);
 
   const isSmallAmount = period.current_balance <= 10;
 
   const handleSave = async () => {
     setLoading(true);
     
     try {
       // Update period with disposition info
       const { error: updateError } = await supabase
         .from('petty_cash_periods')
         .update({
           balance_disposition: disposition,
           disposition_amount: period.current_balance,
           disposition_reference: reference || null
         })
         .eq('id', period.id);
 
       if (updateError) throw updateError;
 
       // Record the transaction
       const transactionType = disposition === 'carried_forward' 
         ? 'carry_forward_out' 
         : disposition === 'refunded' 
           ? 'refund' 
           : 'write_off';
 
       const { error: txError } = await supabase
         .from('petty_cash_transactions')
         .insert({
           period_id: period.id,
           transaction_type: transactionType,
           amount: period.current_balance,
           reference_number: reference || null,
           notes: notes || getDefaultNote(disposition),
           created_by: user?.id
         });
 
       if (txError) throw txError;
 
       toast.success(language === 'ar' ? 'تم حفظ مصير الرصيد' : 'Balance disposition saved');
       onSuccess();
       onOpenChange(false);
       
       // Reset form
       setDisposition('carried_forward');
       setReference('');
       setNotes('');
     } catch (error: unknown) {
       console.error('Error saving disposition:', error);
       const errorMessage = error instanceof Error ? error.message : t('errorOccurred');
       toast.error(errorMessage);
     } finally {
       setLoading(false);
     }
   };
 
   const getDefaultNote = (type: DispositionType): string => {
     switch (type) {
       case 'carried_forward':
         return language === 'ar' 
           ? `ترحيل الرصيد المتبقي من النثرية ${period.period_number} (تحديث لاحق)`
           : `Balance carried forward from period ${period.period_number} (retroactive update)`;
       case 'refunded':
         return language === 'ar'
           ? `إرجاع الرصيد المتبقي للصندوق الرئيسي (تحديث لاحق)`
           : `Remaining balance refunded to main cash (retroactive update)`;
       case 'written_off':
         return language === 'ar'
           ? `إهلاك فروقات بسيطة (تحديث لاحق)`
           : `Small variance written off (retroactive update)`;
       default:
         return '';
     }
   };
 
   const dispositionOptions = [
     {
       value: 'carried_forward' as DispositionType,
       icon: ArrowRightLeft,
       title: language === 'ar' ? 'ترحيل للنثرية الجديدة' : 'Carry Forward',
       description: language === 'ar' 
         ? 'يُنقل الرصيد المتبقي كرصيد افتتاحي للنثرية القادمة'
         : 'Transfer remaining balance as opening balance for next period',
       recommended: true
     },
     {
       value: 'refunded' as DispositionType,
       icon: Undo2,
       title: language === 'ar' ? 'إرجاع للصندوق الرئيسي' : 'Refund to Main Cash',
       description: language === 'ar'
         ? 'يُعاد المبلغ المتبقي للصندوق الرئيسي أو البنك'
         : 'Return remaining amount to main cash or bank account',
       recommended: false
     },
     {
       value: 'written_off' as DispositionType,
       icon: FileX,
       title: language === 'ar' ? 'إهلاك (فروقات بسيطة)' : 'Write Off',
       description: language === 'ar'
         ? 'للمبالغ الصغيرة فقط - يتطلب موافقة إدارية'
         : 'For small amounts only - requires management approval',
       recommended: false,
       warning: !isSmallAmount
     }
   ];
 
   const statusLabels: Record<string, string> = {
     closed: language === 'ar' ? 'مغلقة' : 'Closed',
     rejected: language === 'ar' ? 'مرفوضة' : 'Rejected',
     pending_approval: language === 'ar' ? 'بانتظار الموافقة' : 'Pending Approval'
   };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-lg" dir={isRTL ? 'rtl' : 'ltr'}>
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <Settings className="w-5 h-5 text-yellow-600" />
             {language === 'ar' ? 'تحديد مصير الرصيد المتبقي' : 'Set Balance Disposition'}
           </DialogTitle>
           <DialogDescription>
             {language === 'ar' 
               ? `النثرية رقم: ${period.period_number} (${statusLabels[period.status]})`
               : `Period: ${period.period_number} (${statusLabels[period.status]})`}
           </DialogDescription>
         </DialogHeader>
 
         {/* Warning */}
         <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
           <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
           <p className="text-sm text-yellow-700 dark:text-yellow-400">
             {language === 'ar' 
               ? 'هذه النثرية أُغلقت قبل تفعيل نظام تصريف الرصيد. يرجى تحديد مصير الرصيد المتبقي.'
               : 'This period was closed before the balance disposition system was enabled. Please specify how the remaining balance was handled.'}
           </p>
         </div>
 
         {/* Balance Summary */}
         <Card className="bg-muted/50">
           <CardContent className="p-4">
             <div className="flex justify-between items-center">
               <span className="font-semibold">
                 {language === 'ar' ? 'الرصيد المتبقي' : 'Remaining Balance'}
               </span>
               <Badge variant="secondary" className="text-base px-3 py-1">
                 {formatNumber(period.current_balance)} {t('currency')}
               </Badge>
             </div>
           </CardContent>
         </Card>
 
         {/* Balance Disposition Options */}
         <div className="space-y-3">
           <Label className="text-base font-medium">
             {language === 'ar' ? 'كيف تم التعامل مع الرصيد المتبقي؟' : 'How was the remaining balance handled?'}
           </Label>
           
           <RadioGroup 
             value={disposition} 
             onValueChange={(v) => setDisposition(v as DispositionType)}
             className="space-y-2"
           >
             {dispositionOptions.map((option) => (
               <label
                 key={option.value}
                 className={`
                   flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all
                   ${disposition === option.value 
                     ? 'border-primary bg-primary/5' 
                     : 'border-border hover:border-primary/50'}
                   ${option.warning ? 'opacity-60' : ''}
                 `}
               >
                 <RadioGroupItem value={option.value} className="mt-1" />
                 <div className="flex-1 min-w-0">
                   <div className="flex items-center gap-2">
                     <option.icon className="w-4 h-4 text-primary" />
                     <span className="font-medium">{option.title}</span>
                     {option.recommended && (
                       <Badge variant="secondary" className="text-xs">
                         {language === 'ar' ? 'موصى به' : 'Recommended'}
                       </Badge>
                     )}
                   </div>
                   <p className="text-sm text-muted-foreground mt-1">
                     {option.description}
                   </p>
                   {option.warning && (
                     <div className="flex items-center gap-1 mt-1 text-yellow-600">
                       <AlertTriangle className="w-3 h-3" />
                       <span className="text-xs">
                         {language === 'ar' 
                           ? 'المبلغ كبير - يُفضل الترحيل أو الإرجاع'
                           : 'Amount too large - prefer carry forward or refund'}
                       </span>
                     </div>
                   )}
                 </div>
               </label>
             ))}
           </RadioGroup>
 
           {/* Reference Number (for refund) */}
           {disposition === 'refunded' && (
             <div className="space-y-2">
               <Label>
                 {language === 'ar' ? 'رقم سند الاستلام' : 'Receipt/Voucher Number'}
               </Label>
               <input
                 type="text"
                 value={reference}
                 onChange={(e) => setReference(e.target.value)}
                 className="w-full px-3 py-2 border rounded-md bg-background"
                 placeholder={language === 'ar' ? 'أدخل رقم السند...' : 'Enter voucher number...'}
               />
             </div>
           )}
 
           {/* Notes */}
           <div className="space-y-2">
             <Label>
               {language === 'ar' ? 'ملاحظات (اختياري)' : 'Notes (Optional)'}
             </Label>
             <Textarea
               value={notes}
               onChange={(e) => setNotes(e.target.value)}
               rows={2}
               placeholder={language === 'ar' ? 'أي ملاحظات إضافية...' : 'Any additional notes...'}
             />
           </div>
         </div>
 
         <DialogFooter className={`gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
           <Button variant="outline" onClick={() => onOpenChange(false)}>
             {t('cancel')}
           </Button>
           <Button 
             onClick={handleSave} 
             disabled={loading}
           >
             {loading 
               ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') 
               : (language === 'ar' ? 'حفظ' : 'Save')}
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>
   );
 }