/**
 * QA.Interceptor — Component Library Index
 * 
 * Central export point for all components
 * Makes imports easier: import { Button, Input, Card } from './components'
 */

// ============================================================================
// BUTTONS (Phase FE-1 tasks: BTN-001 to BTN-005)
// ============================================================================

export {
  Button,
  PrimaryButton,
  SecondaryButton,
  DangerButton,
  IconButton,
  type ButtonProps,
  type ButtonVariant,
  type ButtonSize,
} from "./Button";

// ============================================================================
// INPUTS (Phase FE-1 tasks: INP-001 to INP-008)
// ============================================================================

export {
  Input,
  EmailInput,
  PasswordInput,
  SearchInput,
  NumberInput,
  type InputProps,
  type InputVariant,
  type InputSize,
  type InputType,
} from "./Input";

export {
  Toggle,
  type ToggleProps,
} from "./Toggle";

export {
  Checkbox,
  type CheckboxProps,
} from "./Checkbox";

export {
  Textarea,
  type TextareaProps,
  type TextareaVariant,
  type TextareaSize,
} from "./Textarea";

export {
  RadioGroup,
  type RadioGroupProps,
  type RadioOption,
} from "./RadioGroup";

export {
  NumberStepperInput,
  type NumberStepperInputProps,
  type NumberStepperSize,
  type NumberStepperVariant,
} from "./NumberStepperInput";

export {
  SearchInputField,
  type SearchInputFieldProps,
} from "./SearchInputField";

export {
  SelectDropdown,
  type SelectDropdownProps,
  type SelectOption,
  type SelectGroup,
} from "./SelectDropdown";

// ============================================================================
// DISPLAY COMPONENTS (Phase FE-1 tasks: DSP-001 to DSP-007)
// ============================================================================

export {
  Card,
  type CardProps,
  type CardVariant,
} from "./Card";

export {
  Badge,
  type BadgeProps,
  type BadgeColor,
  type BadgeSize,
} from "./Badge";

export {
  StatusIndicator,
  type StatusIndicatorProps,
  type StatusState,
} from "./StatusIndicator";

export {
  Spinner,
  type SpinnerProps,
  type SpinnerSize,
  type SpinnerColor,
} from "./Spinner";

export {
  Tabs,
  type TabsProps,
  type TabItem,
} from "./Tabs";

export {
  Accordion,
  type AccordionProps,
  type AccordionItem,
} from "./Accordion";

export {
  Toast,
  type ToastProps,
  type ToastType,
} from "./Toast";

export {
  Table,
  type TableProps,
  type TableColumn,
  type TableDensity,
  type SortDirection,
} from "./Table";

export {
  ListItem,
  type ListItemProps,
  type ListItemAction,
} from "./ListItem";

export {
  CodeBlock,
  type CodeBlockProps,
} from "./CodeBlock";

export {
  DiffViewer,
  type DiffViewerProps,
} from "./DiffViewer";

export {
  Modal,
  type ModalProps,
} from "./Modal";

export {
  Dialog,
  type DialogProps,
} from "./Dialog";

export {
  ConfirmationDialog,
  type ConfirmationDialogProps,
  type ConfirmationVariant,
} from "./ConfirmationDialog";

export {
  Popover,
  type PopoverProps,
  type PopoverPlacement,
  type PopoverVariant,
} from "./Popover";

// ============================================================================
// COMING SOON (Phase FE-1)
// ============================================================================

// Input Components - In Development
// - All input components completed in Phase FE-1

// Display Components - In Development
// - All display components completed in Phase FE-1

// Data Display - In Development
// - TAB-004: DiffViewer

// Modal & Dialog - In Development
// - All modal/dialog components completed in Phase FE-1
