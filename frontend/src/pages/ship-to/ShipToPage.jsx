import React from 'react';
import MasterDataFeaturePage from '../shared/MasterDataFeaturePage';
import { shipToConfig } from './shipToConfig';
import ShipToAddDialog from './ShipToAddDialog';
import ShipToEditDialog from './ShipToEditDialog';
import ShipToSearch from './ShipToSearch';
import ShipToTable from './ShipToTable';

export default function ShipToPage() {
  return <MasterDataFeaturePage config={shipToConfig} AddDialog={ShipToAddDialog} EditDialog={ShipToEditDialog} SearchComponent={ShipToSearch} TableComponent={ShipToTable} />;
}
