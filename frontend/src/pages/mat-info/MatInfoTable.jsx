import React from 'react';
import MasterDataTable from '../shared/MasterDataTable';
import { matInfoConfig } from './matInfoConfig';

export default function MatInfoTable(props) {
  return <MasterDataTable config={matInfoConfig} {...props} />;
}
