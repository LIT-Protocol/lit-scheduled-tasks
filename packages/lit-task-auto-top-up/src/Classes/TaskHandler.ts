import { TZDate } from '@date-fns/tz';
import { Job } from '@hokify/agenda';
import awaity from 'awaity'; // Awaity is a cjs package, breaks `import` with named imports in ESM
import { ConsolaInstance } from 'consola';
import { addDays, isSameDay } from 'date-fns';
import VError from 'verror';

import { mintCapacityCreditNFT } from '../actions/mintCapacityCreditNFT';
import { pruneExpiredCapacityTokenNFT } from '../actions/pruneExpiredCapacityTokenNFT';
import { transferCapacityTokenNFT } from '../actions/transferCapacityTokenNFT';
import { toErrorWithMessage } from '../errors';
import { getLitContractsInstance } from '../singletons/getLitContracts';
import { getRecipientList } from '../singletons/getRecipientList';
import { tryTouchTask, printTaskResultsAndFailures } from '../taskHelpers';
import { TaskResultEnum } from '../types/enums';
import { Config, EnvConfig, RecipientDetail, TaskResult, CapacityToken } from '../types/types';

export class TaskHandler {
  private envConfig: EnvConfig;

  private logger: ConsolaInstance;

  constructor({ config }: { config: Config }) {
    const { envConfig, logger } = config;
    this.envConfig = envConfig;
    this.logger = logger;
  }

  async handleRecipient({
    recipientDetail,
  }: {
    recipientDetail: RecipientDetail;
  }): Promise<TaskResult> {
    const { recipientAddress } = recipientDetail;

    const tokens = await this.fetchExistingTokens({ recipientAddress });
    const { noUsableTokensTomorrow, unexpiredTokens } = this.getExistingTokenDetails({
      tokens,
      today: TZDate.tz('UTC'),
    });

    if (noUsableTokensTomorrow) {
      const capacityTokenIdStr = await mintCapacityCreditNFT({ recipientDetail });
      await transferCapacityTokenNFT({ capacityTokenIdStr, recipientAddress });
      await pruneExpiredCapacityTokenNFT({ recipientDetail });

      return { capacityTokenIdStr, result: TaskResultEnum.minted, ...recipientDetail };
    }

    // If we got here, there should be some `unexpiredTokens` to log for clarity later.
    return {
      ...recipientDetail,
      unexpiredTokens,
      result: TaskResultEnum.skipped,
    };
  }

  private async fetchExistingTokens({ recipientAddress }: { recipientAddress: string }) {
    const litContracts = await getLitContractsInstance();

    // :sad_panda:, `getTokensByOwnerAddress()` returns <any> :(
    const existingTokens: CapacityToken[] =
      await litContracts.rateLimitNftContractUtils.read.getTokensByOwnerAddress(recipientAddress);

    return existingTokens;
  }

  getExistingTokenDetails({ today, tokens }: { today: Date; tokens: CapacityToken[] }) {
    const tomorrow = addDays(today, 1);

    // Only mint a new token if the recipient...
    // 1. Has no NFTs at all
    // 2. All unexpired NFTs they have will expire later today or tomorrow
    // 3. All of their NFTs are already expired
    const noUsableTokensTomorrow = tokens.every((token) => {
      // NOTE: `every()` on an empty array === true :)
      const {
        capacity: {
          expiresAt: { timestamp },
        },
        isExpired,
      } = token;
      if (isExpired) {
        return true;
      }
      const tokenExpiresDate = new TZDate(timestamp * 1000, 'UTC');
      return isSameDay(tokenExpiresDate, tomorrow) || isSameDay(tokenExpiresDate, today);
    });
    return {
      noUsableTokensTomorrow,
      unexpiredTokens: tokens.filter(({ isExpired }) => !isExpired).map(this.mapUnexpiredToken),
    };
  }

  mapUnexpiredToken(token: CapacityToken): { expiresAt: string; tokenId: number } {
    const {
      capacity: {
        expiresAt: { formatted },
      },
      tokenId,
    } = token;

    return { tokenId, expiresAt: formatted };
  }

  async handleTask(task: Job) {
    this.logger.log('Running auto-top-up task; fetching recipient list');

    try {
      const recipientList = await getRecipientList();
      this.logger.log(`Loaded ${recipientList.length} recipient addresses from JSON`);

      const results = await awaity.mapSeries<RecipientDetail, PromiseSettledResult<TaskResult>>(
        recipientList,
        async (recipientDetail) => {
          const [settledResult] = await Promise.allSettled([
            this.handleRecipient({ recipientDetail }),
          ]);

          this.logger.log(`Finished processing ${recipientDetail.recipientAddress}`);
          tryTouchTask(task).then(() => true); // Fire-and-forget; touching job is not critical

          return settledResult;
        }
      );

      printTaskResultsAndFailures({ results, logger: this.logger });
    } catch (e) {
      const err = toErrorWithMessage(e);
      this.logger.error('CRITICAL ERROR', e, JSON.stringify(VError.info(err), null, 2));

      // Re-throw so the job is retried by the task worker
      throw err;
    }
  }
}
