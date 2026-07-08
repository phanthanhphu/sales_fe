import React from 'react';
import MasterDataTable from '../shared/MasterDataTable';
import { vendorCodeConfig } from './vendorCodeConfig';

export default function VendorCodeTable(props) {
  return <MasterDataTable config={vendorCodeConfig} {...props} />;
}
