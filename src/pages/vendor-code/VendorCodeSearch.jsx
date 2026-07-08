import React from 'react';
import MasterDataSearchPanel from '../shared/MasterDataSearchPanel';
import { vendorCodeConfig } from './vendorCodeConfig';

export default function VendorCodeSearch(props) {
  return <MasterDataSearchPanel config={vendorCodeConfig} {...props} />;
}
