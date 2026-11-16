import { useQuery } from '@tanstack/react-query'
import { fetchImportDatasets, fetchImportFormats, type ImportDataset } from '../customers/imports.api'

// Setup > Import Assistant on imports/fapi (key-authenticated JSON). Checked on newecuenta on 6 Nov 2026 against the classic imports/import.php?step=1:
//  - datasets.php (no filter) answers the 34 datasets of the classic "Module/Application | Importable dataset" table, in the same order, with the
//    same module and label texts; each row of the classic table links to import.php?step=2&datatoimport=<code>, which is the step the app's import
//    wizard (customers/ImportCustomersWizard, /import/customers?dataset=<code>) already runs for every dataset code.
//  - formats.php?datatoimport=<code> answers the formats of a dataset (Csv, Excel 2007). The classic overview (imports/index.php) prints them with a
//    "Library" and a "Library version" column (Ecuenta 9.0.0, PhpSpreadSheet 1.8.0); the answer's own version field is another number (1.34 / 1.0), so
//    only the format names are shown.
export function useAllImportDatasets() {
  return useQuery({
    queryKey: ['imports', 'datasets', 'all'],
    queryFn: async (): Promise<ImportDataset[]> => (await fetchImportDatasets()).datasets,
    staleTime: 1000 * 60 * 10,
    retry: false,
  })
}

export function useImportFormatNames(datasetCode: string | undefined) {
  return useQuery({
    queryKey: ['imports', 'formats', 'names', datasetCode],
    queryFn: async (): Promise<string[]> => (await fetchImportFormats(datasetCode!)).formats.map((f) => f.label),
    enabled: !!datasetCode,
    staleTime: 1000 * 60 * 10,
    retry: false,
  })
}
