import { methodsApi } from '../../api/categorization';
import type { MethodView } from '../../api/types';
import { ReferenceDataTab } from './ReferenceDataTab';
import { SwatchGrid } from './components/SwatchGrid';

const DEFAULTS = { name: '', bgColor: '#143361', textColor: '#a8c0e0' };

interface MethodsTabProps {
  readonly onSuccess: (msg: string) => void;
  readonly onError: (msg: string) => void;
  readonly onCountChange?: (n: number) => void;
}

export function MethodsTab(props: MethodsTabProps) {
  return (
    <ReferenceDataTab<MethodView>
      api={methodsApi}
      singularLabel="Method"
      pluralLabel="methods"
      defaults={DEFAULTS}
      View={SwatchGrid}
      {...props}
    />
  );
}
