import React from 'react';
import MasterDataFormDialog from '../shared/MasterDataFormDialog';
import { currencyConfig } from './currencyConfig';

export default function CurrencyAddDialog(props) {
  return <MasterDataFormDialog config={currencyConfig} mode="add" {...props} />;
}
