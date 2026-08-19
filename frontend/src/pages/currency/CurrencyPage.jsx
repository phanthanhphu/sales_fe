import React from 'react';
import MasterDataFeaturePage from '../shared/MasterDataFeaturePage';
import { currencyConfig } from './currencyConfig';
import CurrencyAddDialog from './CurrencyAddDialog';
import CurrencyEditDialog from './CurrencyEditDialog';
import CurrencySearch from './CurrencySearch';
import CurrencyTable from './CurrencyTable';

export default function CurrencyPage() {
  return (
    <MasterDataFeaturePage
      config={currencyConfig}
      AddDialog={CurrencyAddDialog}
      EditDialog={CurrencyEditDialog}
      SearchComponent={CurrencySearch}
      TableComponent={CurrencyTable}
    />
  );
}
