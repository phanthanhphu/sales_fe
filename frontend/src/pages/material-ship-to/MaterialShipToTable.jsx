import React from 'react';
import MasterDataTable from '../shared/MasterDataTable';
import { materialShipToConfig } from './materialShipToConfig';
export default function MaterialShipToTable(props) { return <MasterDataTable config={materialShipToConfig} {...props} />; }
