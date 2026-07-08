import React from 'react';
import MasterDataFormDialog from '../shared/MasterDataFormDialog';
import { lossConfig } from './lossConfig';

export default function LossEditDialog(props) {
  return <MasterDataFormDialog config={lossConfig} mode="edit" {...props} />;
}
