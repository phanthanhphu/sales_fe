import React from 'react';
import MasterDataFormDialog from '../shared/MasterDataFormDialog';
import { matInfoConfig } from './matInfoConfig';

export default function MatInfoAddDialog(props) {
  return <MasterDataFormDialog config={matInfoConfig} mode="add" {...props} />;
}
