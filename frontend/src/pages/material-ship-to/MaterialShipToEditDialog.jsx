import React from 'react';
import MasterDataFormDialog from '../shared/MasterDataFormDialog';
import { materialShipToConfig } from './materialShipToConfig';
export default function MaterialShipToEditDialog(props) { return <MasterDataFormDialog config={materialShipToConfig} mode="edit" {...props} />; }
