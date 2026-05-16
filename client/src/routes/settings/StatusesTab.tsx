import { statusesApi } from '../../api/categorization';
import type { ReimbursementStatusView } from '../../api/types';
import { ReferenceDataTab } from './ReferenceDataTab';
import { ReferenceTable } from './components/ReferenceTable';

const DEFAULTS = { name: '', bgColor: '#e8eaed', textColor: '#000000' };

interface StatusesTabProps {
  readonly onSuccess: (msg: string) => void;
  readonly onError: (msg: string) => void;
  readonly onCountChange?: (n: number) => void;
}

export function StatusesTab(props: StatusesTabProps) {
  return (
    <ReferenceDataTab<ReimbursementStatusView>
      api={statusesApi}
      singularLabel="Status"
      pluralLabel="statuses"
      defaults={DEFAULTS}
      View={ReferenceTable}
      {...props}
    />
  );
}
