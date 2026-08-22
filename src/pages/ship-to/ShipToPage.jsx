import React from 'react';
import { useParams } from 'react-router-dom';
import MasterDataFeaturePage from '../shared/MasterDataFeaturePage';
import { shipToConfig } from './shipToConfig';
import ShipToAddDialog from './ShipToAddDialog';
import ShipToEditDialog from './ShipToEditDialog';
import ShipToSearch from './ShipToSearch';
import ShipToTable from './ShipToTable';
import { getBuyerDefinition, normalizeBuyerKey } from 'utils/buyerContext';

export default function ShipToPage() {
  const { buyerKey: routeBuyerKey } = useParams();
  const buyerKey = normalizeBuyerKey(routeBuyerKey);
  const buyer = getBuyerDefinition(buyerKey);

  return (
    <MasterDataFeaturePage
      config={shipToConfig}
      AddDialog={ShipToAddDialog}
      EditDialog={ShipToEditDialog}
      SearchComponent={ShipToSearch}
      TableComponent={ShipToTable}
      scopeParams={{ buyerKey }}
      scopeTitle={`${buyer.buyerName} — Ship To`}
    />
  );
}
