import React from 'react';
import MasterDataFormDialog from '../shared/MasterDataFormDialog';
import { vendorCodeConfig } from './vendorCodeConfig';

export default function VendorCodeAddDialog(props) {
  return <MasterDataFormDialog config={vendorCodeConfig} mode="add" {...props} />;
}
