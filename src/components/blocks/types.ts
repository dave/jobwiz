/**
 * Shared types for block components
 */

/** Theme colors for company branding */
export interface BlockTheme {
  primary?: string;
  secondary?: string;
  accent?: string;
}

/** Base props shared by all block components */
export interface BlockBaseProps {
  /** Called when the block is completed (watched, answered, etc.) */
  onComplete?: () => void;
  /** Theme colors for company branding */
  theme?: BlockTheme;
}
