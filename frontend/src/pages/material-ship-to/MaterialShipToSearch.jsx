import React from 'react';
import MasterDataSearchPanel from '../shared/MasterDataSearchPanel';
import { materialShipToConfig } from './materialShipToConfig';
export default function MaterialShipToSearch(props) { return <MasterDataSearchPanel config={materialShipToConfig} {...props} />; }
