import React from 'react';
import MasterDataFormDialog from '../shared/MasterDataFormDialog';
import { matInfoConfig } from './matInfoConfig';

export default function MatInfoEditDialog(props) {
  return <MasterDataFormDialog config={matInfoConfig} mode="edit" {...props} />;
}
