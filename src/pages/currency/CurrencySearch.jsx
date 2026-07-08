import React from 'react';
import MasterDataSearchPanel from '../shared/MasterDataSearchPanel';
import { currencyConfig } from './currencyConfig';

export default function CurrencySearch(props) {
  return <MasterDataSearchPanel config={currencyConfig} {...props} />;
}
