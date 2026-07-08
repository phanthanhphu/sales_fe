import React from 'react';
import MasterDataFeaturePage from '../shared/MasterDataFeaturePage';
import { matInfoConfig } from './matInfoConfig';
import MatInfoAddDialog from './MatInfoAddDialog';
import MatInfoEditDialog from './MatInfoEditDialog';
import MatInfoSearch from './MatInfoSearch';
import MatInfoTable from './MatInfoTable';

export default function MatInfoPage() {
  return (
    <MasterDataFeaturePage
      config={matInfoConfig}
      AddDialog={MatInfoAddDialog}
      EditDialog={MatInfoEditDialog}
      SearchComponent={MatInfoSearch}
      TableComponent={MatInfoTable}
    />
  );
}
