import { fmsRegistry } from './_framework/registry';
import { orderToCollectionFms } from './order-to-collection/definition';
import { purchaseFms } from './purchase/definition';
import { jobSlipFms } from './job-slip/definition';

// Register standard FMS modules
fmsRegistry.register(orderToCollectionFms);
fmsRegistry.register(purchaseFms);
fmsRegistry.register(jobSlipFms);

export { fmsRegistry };
export * from './_framework/types';
export * from './_framework/engine';
export * from './_framework/numbering';
export * from './_framework/bill-sequence';
export * from './order-to-collection/whatsappTemplates';
