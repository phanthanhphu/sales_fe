import React from 'react';
import { useParams } from 'react-router-dom';
import MasterDataFeaturePage from '../shared/MasterDataFeaturePage';
import { lossConfig } from './lossConfig';
import LossAddDialog from './LossAddDialog';
import LossEditDialog from './LossEditDialog';
import LossSearch from './LossSearch';
import LossTable from './LossTable';
import { getBuyerDefinition, normalizeBuyerKey } from 'utils/buyerContext';

export default function LossPage() {
  const { buyerKey: routeBuyerKey } = useParams();
  const buyerKey = normalizeBuyerKey(routeBuyerKey);
  const buyer = getBuyerDefinition(buyerKey);

  return (
    <MasterDataFeaturePage
      config={lossConfig}
      AddDialog={LossAddDialog}
      EditDialog={LossEditDialog}
      SearchComponent={LossSearch}
      TableComponent={LossTable}
      scopeParams={{ buyerKey }}
      scopeTitle={`${buyer.buyerName} — Loss`}
    />
  );
}
