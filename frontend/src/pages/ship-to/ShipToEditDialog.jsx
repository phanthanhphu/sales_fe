import React from 'react';
import MasterDataFormDialog from '../shared/MasterDataFormDialog';
import { shipToConfig } from './shipToConfig';
export default function ShipToEditDialog(props) { return <MasterDataFormDialog config={shipToConfig} mode="edit" {...props} />; }
