/**
 * Generation priority queue system
 * Issue #32 - Generation priority queue system
 *
 * Manages queue of company/role combinations for content generation
 * Priority is based on search volume data
 */

// Types
export type {
  QueueStatus,
  DbQueueItem,
  AddQueueItemInput,
  QueueStatusSummary,
  SearchVolumeData,
  SearchVolumeCompany,
  PriorityEntry,
} from "./types";

// Storage operations
export {
  addToQueue,
  addToQueueBatch,
  claimNextItem,
  completeQueueItem,
  failQueueItem,
  getQueueStatus,
  getQueueItems,
  queueItemExists,
  clearCompleted,
  resetStaleItems,
} from "./storage";

// Priority calculation
export {
  loadSearchVolumeData,
  getPriorityScore,
  getPriorityEntriesForCompany,
  buildQueueItemsForCompany,
  buildQueueItemsFromSearchVolume,
  getAllCompanySlugs,
  getAllRoleSlugs,
  isValidCompanySlug,
  isValidRoleSlug,
  createQueueItemWithPriority,
} from "./priority";
