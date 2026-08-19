import React from 'react';
import MasterDataTable from '../shared/MasterDataTable';
import { currencyConfig } from './currencyConfig';

export default function CurrencyTable(props) {
  return <MasterDataTable config={currencyConfig} {...props} />;
}
