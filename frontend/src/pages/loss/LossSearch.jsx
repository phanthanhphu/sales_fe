import React from 'react';
import MasterDataSearchPanel from '../shared/MasterDataSearchPanel';
import { lossConfig } from './lossConfig';

export default function LossSearch(props) {
  return <MasterDataSearchPanel config={lossConfig} {...props} />;
}
