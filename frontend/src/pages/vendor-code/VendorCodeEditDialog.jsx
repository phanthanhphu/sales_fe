import React from 'react';
import MasterDataFormDialog from '../shared/MasterDataFormDialog';
import { vendorCodeConfig } from './vendorCodeConfig';

export default function VendorCodeEditDialog(props) {
  return <MasterDataFormDialog config={vendorCodeConfig} mode="edit" {...props} />;
}
