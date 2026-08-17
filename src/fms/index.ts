import { fmsRegistry } from './_framework/registry';
import { orderToDeliveryFms } from './order-to-delivery/definition';
import { purchaseFms } from './purchase/definition';
import { jobSlipFms } from './job-slip/definition';

// Register standard Phase 1 FMS modules
fmsRegistry.register(orderToDeliveryFms);
fmsRegistry.register(purchaseFms);
fmsRegistry.register(jobSlipFms);

export { fmsRegistry };
export * from './_framework/types';
export * from './_framework/engine';
export * from './_framework/numbering';
export * from './_framework/bill-sequence';
