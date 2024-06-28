import { recipientDetailSchema } from 'lit-task-auto-top-up';
// eslint-disable-next-line import/no-extraneous-dependencies
import { z } from 'zod';

// TODO: Delete this file and reference once PR #5 is merged and the existing worker has been updated to use the new habanero-specific path
import deprecatedHabaneroRecipientList from '../worker/recipient_list.json' assert { type: 'json' };
import habanberoRecipientList from '../worker/recipient_list_habanero.json' assert { type: 'json' };
import manzanoRecipientList from '../worker/recipient_list_manzano.json' assert { type: 'json' };

z.array(recipientDetailSchema).parse(deprecatedHabaneroRecipientList);
z.array(recipientDetailSchema).parse(habanberoRecipientList);
z.array(recipientDetailSchema).parse(manzanoRecipientList);
