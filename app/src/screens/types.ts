import type { PafaController } from '../state/usePafa';

export interface ScreenProps {
  vm: PafaController['vm'];
  actions: PafaController['actions'];
}
