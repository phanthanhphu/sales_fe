import React from 'react';
import { useParams } from 'react-router-dom';
import MasterDataFeaturePage from '../shared/MasterDataFeaturePage';
import { vendorCodeConfig } from './vendorCodeConfig';
import VendorCodeAddDialog from './VendorCodeAddDialog';
import VendorCodeEditDialog from './VendorCodeEditDialog';
import VendorCodeSearch from './VendorCodeSearch';
import VendorCodeTable from './VendorCodeTable';
import { getBuyerDefinition, normalizeBuyerKey } from 'utils/buyerContext';

export default function VendorCodePage() {
  const { buyerKey: routeBuyerKey } = useParams();
  const buyerKey = normalizeBuyerKey(routeBuyerKey);
  const buyer = getBuyerDefinition(buyerKey);

  return (
    <MasterDataFeaturePage
      config={vendorCodeConfig}
      AddDialog={VendorCodeAddDialog}
      EditDialog={VendorCodeEditDialog}
      SearchComponent={VendorCodeSearch}
      TableComponent={VendorCodeTable}
      scopeParams={{ buyerKey }}
      scopeTitle={`${buyer.buyerName} — Vendor Code`}
    />
  );
}
