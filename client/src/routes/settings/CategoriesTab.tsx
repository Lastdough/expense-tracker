import { categoriesApi } from '../../api/categorization';
import type { CategoryView } from '../../api/types';
import { ReferenceDataTab } from './ReferenceDataTab';
import { ReferenceTable } from './components/ReferenceTable';

const DEFAULTS = { name: '', bgColor: '#e8eaed', textColor: '#000000' };

interface CategoriesTabProps {
  readonly onSuccess: (msg: string) => void;
  readonly onError: (msg: string) => void;
  readonly onCountChange?: (n: number) => void;
}

export function CategoriesTab(props: CategoriesTabProps) {
  return (
    <ReferenceDataTab<CategoryView>
      api={categoriesApi}
      singularLabel="Category"
      pluralLabel="categories"
      defaults={DEFAULTS}
      View={ReferenceTable}
      {...props}
    />
  );
}
