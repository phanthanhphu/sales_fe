import React from 'react';
import MasterDataFormDialog from '../shared/MasterDataFormDialog';
import { materialShipToConfig } from './materialShipToConfig';
export default function MaterialShipToAddDialog(props) { return <MasterDataFormDialog config={materialShipToConfig} mode="add" {...props} />; }
