import React from 'react';
import MasterDataTable from '../shared/MasterDataTable';
import { shipToConfig } from './shipToConfig';
export default function ShipToTable(props) { return <MasterDataTable config={shipToConfig} {...props} />; }
