import React from 'react';
import { useParams } from 'react-router-dom';
import MasterDataFeaturePage from '../shared/MasterDataFeaturePage';
import { getBuyerDefinition, normalizeBuyerKey } from 'utils/buyerContext';
import { materialShipToConfig } from './materialShipToConfig';
import MaterialShipToAddDialog from './MaterialShipToAddDialog';
import MaterialShipToEditDialog from './MaterialShipToEditDialog';
import MaterialShipToSearch from './MaterialShipToSearch';
import MaterialShipToTable from './MaterialShipToTable';

export default function MaterialShipToPage() {
  const { buyerKey } = useParams();
  const normalizedBuyer = normalizeBuyerKey(buyerKey);
  const buyer = getBuyerDefinition(normalizedBuyer);

  return (
    <MasterDataFeaturePage
      config={materialShipToConfig}
      AddDialog={MaterialShipToAddDialog}
      EditDialog={MaterialShipToEditDialog}
      SearchComponent={MaterialShipToSearch}
      TableComponent={MaterialShipToTable}
      scopeParams={{ buyerKey: normalizedBuyer }}
      scopeTitle={`${buyer.buyerName} — Material Ship To Mapping`}
    />
  );
}
