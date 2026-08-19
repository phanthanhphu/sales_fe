import React from 'react';
import MasterDataSearchPanel from '../shared/MasterDataSearchPanel';
import { shipToConfig } from './shipToConfig';
export default function ShipToSearch(props) { return <MasterDataSearchPanel config={shipToConfig} {...props} />; }
