import React from 'react';
import MasterDataFeaturePage from '../shared/MasterDataFeaturePage';
import { lossConfig } from './lossConfig';
import LossAddDialog from './LossAddDialog';
import LossEditDialog from './LossEditDialog';
import LossSearch from './LossSearch';
import LossTable from './LossTable';

export default function LossPage() {
  return (
    <MasterDataFeaturePage
      config={lossConfig}
      AddDialog={LossAddDialog}
      EditDialog={LossEditDialog}
      SearchComponent={LossSearch}
      TableComponent={LossTable}
    />
  );
}
