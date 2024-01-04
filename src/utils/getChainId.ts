import { chainIdByEnvironment } from '@multiversx/sdk-dapp/constants/network';
import { environment } from 'config';

export const getChainId = () => {
  return chainIdByEnvironment[environment];
};

export const delay = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));
