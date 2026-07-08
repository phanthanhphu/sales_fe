import React from 'react';
import MasterDataTable from '../shared/MasterDataTable';
import { lossConfig } from './lossConfig';

export default function LossTable(props) {
  return <MasterDataTable config={lossConfig} {...props} />;
}
