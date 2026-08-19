import React from 'react';
import MasterDataFormDialog from '../shared/MasterDataFormDialog';
import { currencyConfig } from './currencyConfig';

export default function CurrencyEditDialog(props) {
  return <MasterDataFormDialog config={currencyConfig} mode="edit" {...props} />;
}
