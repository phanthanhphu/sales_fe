import React from 'react';
import MasterDataFeaturePage from '../shared/MasterDataFeaturePage';
import { vendorCodeConfig } from './vendorCodeConfig';
import VendorCodeAddDialog from './VendorCodeAddDialog';
import VendorCodeEditDialog from './VendorCodeEditDialog';
import VendorCodeSearch from './VendorCodeSearch';
import VendorCodeTable from './VendorCodeTable';

export default function VendorCodePage() {
  return (
    <MasterDataFeaturePage
      config={vendorCodeConfig}
      AddDialog={VendorCodeAddDialog}
      EditDialog={VendorCodeEditDialog}
      SearchComponent={VendorCodeSearch}
      TableComponent={VendorCodeTable}
    />
  );
}
