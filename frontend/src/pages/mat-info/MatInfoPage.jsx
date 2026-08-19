import React from 'react';
import { useParams } from 'react-router-dom';
import MasterDataFeaturePage from '../shared/MasterDataFeaturePage';
import { matInfoConfig } from './matInfoConfig';
import MatInfoAddDialog from './MatInfoAddDialog';
import MatInfoEditDialog from './MatInfoEditDialog';
import MatInfoSearch from './MatInfoSearch';
import MatInfoTable from './MatInfoTable';
import { getBuyerDefinition, normalizeBuyerKey } from 'utils/buyerContext';

export default function MatInfoPage() {
  const { buyerKey: routeBuyerKey } = useParams();
  const buyerKey = normalizeBuyerKey(routeBuyerKey);
  const buyer = getBuyerDefinition(buyerKey);

  return (
    <MasterDataFeaturePage
      config={matInfoConfig}
      AddDialog={MatInfoAddDialog}
      EditDialog={MatInfoEditDialog}
      SearchComponent={MatInfoSearch}
      TableComponent={MatInfoTable}
      scopeParams={{ buyerKey }}
      scopeTitle={`${buyer.buyerName} — MAT Info`}
    />
  );
}
