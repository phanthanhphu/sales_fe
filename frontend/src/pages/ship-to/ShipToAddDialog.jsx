import React from 'react';
import MasterDataFormDialog from '../shared/MasterDataFormDialog';
import { shipToConfig } from './shipToConfig';
export default function ShipToAddDialog(props) { return <MasterDataFormDialog config={shipToConfig} mode="add" {...props} />; }
