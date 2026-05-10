import { TxnListPage } from './_txnList';
export default function Page(){ return <TxnListPage txnTypes={['receipt','in']} newType="in" titleKey="wms.nav.receipts" />; }
