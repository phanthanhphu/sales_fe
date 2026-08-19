import React from 'react';
import MasterDataFormDialog from '../shared/MasterDataFormDialog';
import { lossConfig } from './lossConfig';

export default function LossAddDialog(props) {
  return <MasterDataFormDialog config={lossConfig} mode="add" {...props} />;
}
