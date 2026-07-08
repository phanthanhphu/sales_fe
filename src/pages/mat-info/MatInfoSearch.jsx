import React from 'react';
import MasterDataSearchPanel from '../shared/MasterDataSearchPanel';
import { matInfoConfig } from './matInfoConfig';

export default function MatInfoSearch(props) {
  return <MasterDataSearchPanel config={matInfoConfig} {...props} />;
}
