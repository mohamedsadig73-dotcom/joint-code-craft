/**
 * MaintenanceModule — unified entry for the Maintenance domain (S5/P3).
 * Thin wrapper over the existing Maintenance page; tabs already split by
 * concern (Dashboard / Schedule / Items / Assets / Vendors).
 */
import Maintenance from '@/pages/Maintenance';

export default function MaintenanceModule() {
  return <Maintenance />;
}