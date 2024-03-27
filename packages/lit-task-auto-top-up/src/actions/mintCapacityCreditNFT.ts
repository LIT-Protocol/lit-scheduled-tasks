import consola from 'consola';

import getLitContractsInstance from './getLitContracts';
import { toErrorWithMessage } from '../errors';
import MintCapacityTokenFailure from '../errors/MintCapacityTokenFailure';
import { RecipientDetail } from '../types/types';

export default async function mintCapacityCreditNFT({
  recipientDetail,
}: {
  recipientDetail: RecipientDetail;
}) {
  const litContracts = await getLitContractsInstance();

  const { daysUntilExpires, recipientAddress, requestsPerSecond } = recipientDetail;

  try {
    consola.log('Minting capacity token', recipientDetail);

    const { capacityTokenIdStr } = await litContracts.mintCapacityCreditsNFT({
      requestsPerSecond,
      daysUntilUTCMidnightExpiration: daysUntilExpires,
    });

    return capacityTokenIdStr;
  } catch (e) {
    const err = toErrorWithMessage(e);

    throw new MintCapacityTokenFailure(
      {
        cause: err,
        info: {
          recipientAddress,
          requestsPerSecond,
          daysUntilUTCMidnightExpiration: daysUntilExpires,
        },
        name: 'MintCapacityTokenFailure',
      },
      'Failed to mint capacity token'
    );
  }
}