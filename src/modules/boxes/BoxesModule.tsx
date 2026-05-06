/**
 * BoxesModule — unified entry for the Boxes domain (S5/P3).
 * Thin wrapper over the existing BoxesManagement page so consumers can
 * migrate to `@/modules/boxes` without touching live tabs/logic.
 */
import BoxesManagement from '@/pages/BoxesManagement';

export default function BoxesModule() {
  return <BoxesManagement />;
}