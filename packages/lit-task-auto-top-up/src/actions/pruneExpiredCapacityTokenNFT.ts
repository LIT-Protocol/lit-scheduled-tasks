import { toErrorWithMessage } from '../errors';
import { PruneCapacityTokensFailure } from '../errors/PruneCapacityTokensFailure';
import { getConfig } from '../singletons/getConfig';
import { getLitContractsInstance } from '../singletons/getLitContracts';
import { RecipientDetail } from '../types/types';

export async function pruneExpiredCapacityTokenNFT({
  recipientDetail,
}: {
  recipientDetail: RecipientDetail;
}) {
  const litContracts = await getLitContractsInstance();
  const { logger } = getConfig();

  const { recipientAddress } = recipientDetail;

  try {
    logger.log('Pruning expired capacity token NFTs for', recipientDetail);

    // @ts-ignore FIXME: This contract method has not yet been published
    await litContracts.rateLimitNftContract.write.pruneExpired(recipientAddress);
  } catch (e) {
    const err = toErrorWithMessage(e);

    throw new PruneCapacityTokensFailure(
      {
        cause: err,
        info: {
          recipientAddress,
        },
        name: 'PruneCapacityTokensFailure',
      },
      'Failed to prune capacity tokens'
    );
  }
}
