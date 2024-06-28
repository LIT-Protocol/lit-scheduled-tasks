import {
  TaskHandler as AutoTopUpTaskHandler,
  taskName as autoTopUpTaskName,
  getConfig as getAutoTopUpTaskConfig,
} from 'lit-task-auto-top-up';
import { getConfig as getTaskClientConfig, createTaskClient } from 'lit-task-client';

const taskClientConfig = getTaskClientConfig();
const taskClient = createTaskClient({ config: taskClientConfig });

const autoTopUpTaskConfig = getAutoTopUpTaskConfig();
const autoTopUpTaskHandler = new AutoTopUpTaskHandler({ config: autoTopUpTaskConfig });
const AUTO_TOP_UP_TASK_NAME = `daily ${autoTopUpTaskName} - ${autoTopUpTaskConfig.envConfig.LIT_NETWORK}`;

async function gogo() {
  taskClient.start().then(async () => {
    taskClientConfig.logger.log('Agenda is running.');

    await taskClient.every('0 22 * * *', AUTO_TOP_UP_TASK_NAME, null, { timezone: 'GMT' }); // 10PM UTC every day
    taskClient.define(AUTO_TOP_UP_TASK_NAME, async (job) => {
      // The task will only fail if we are unable to fetch JSON from Github
      // Otherwise we log successes and failures internally for individual mints/transfer ops
      // and exit without an error code
      await autoTopUpTaskHandler.handleTask(job);
    });
  });
}

gogo();
