// Icon — Lucide React wrapper with design system sizing
'use client';

import { forwardRef, SVGAttributes, ComponentType } from 'react';
import * as LucideIcons from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import { cn } from '@elo-digital/ui/utils/classnames';

export type LucideIconName = keyof typeof LucideIcons;

// Converts a kebab-case icon slug ('chevron-left') into the PascalCase
// name lucide-react exports ('ChevronLeft').
function kebabToPascal(slug: string): string {
  return slug.replace(/(^\w|-\w)/g, (match) => match.replace('-', '').toUpperCase());
}

const iconSizes = {
  xs: 'w-3 h-3',      // 12px
  sm: 'w-4 h-4',      // 16px
  md: 'w-5 h-5',      // 20px
  lg: 'w-6 h-6',      // 24px
  xl: 'w-7 h-7',      // 28px
  '2xl': 'w-8 h-8',   // 32px
  '3xl': 'w-10 h-10', // 40px
  '4xl': 'w-12 h-12'  // 48px
} as const;

export type IconName = keyof typeof Icons;

export interface IconProps extends SVGAttributes<SVGSVGElement> {
  name: IconName;
  size?: keyof typeof iconSizes | number | string;
  weight?: 'thin' | 'light' | 'normal' | 'medium' | 'bold';
  color?: 'current' | 'primary' | 'muted' | 'destructive' | 'success' | 'warning' | 'inverse';
  animated?: boolean;
  'aria-label'?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
}

export const Icon = forwardRef<SVGSVGElement, IconProps>(
  ({
    className,
    name,
    size = 'md',
    weight = 'normal',
    color = 'current',
    animated = false,
    'aria-label': ariaLabel,
    'aria-hidden': ariaHidden = true,
    ...props
  }, ref) => {
    const lucideName = kebabToPascal(Icons[name]) as LucideIconName;
    const LucideIcon = LucideIcons[lucideName] as ComponentType<LucideProps> | undefined;

    if (!LucideIcon) {
      console.warn(`Icon "${name}" not found in lucide-react`);
      return null;
    }

    const sizeClass = typeof size === 'number' ? `w-[${size}px] h-[${size}px]` : iconSizes[size as keyof typeof iconSizes] ?? iconSizes.md;

    const weightStyles = {
      thin: 'stroke-[1]',
      light: 'stroke-[1.5]',
      normal: 'stroke-[2]',
      medium: 'stroke-[2.5]',
      bold: 'stroke-[3]'
    };

    const colorClass = {
      current: 'text-current',
      primary: 'text-[var(--color-primary)]',
      muted: 'text-[var(--color-muted-foreground)]',
      destructive: 'text-[var(--color-destructive)]',
      success: 'text-[var(--color-status-success, #10B981)]',
      warning: 'text-[var(--color-status-warning, #F59E0B)]',
      inverse: 'text-[var(--color-primary-foreground)]'
    };

    return (
      <LucideIcon
        ref={ref}
        className={cn(
          sizeClass,
          weightStyles[weight],
          colorClass[color],
          animated && 'animate-spin',
          className
        )}
        aria-label={ariaLabel}
        aria-hidden={ariaHidden}
        {...props}
      />
    );
  }
);

Icon.displayName = 'Icon';

// Common icon exports for convenience
export const Icons = {
  // Navigation
  chevronLeft: 'chevron-left',
  chevronRight: 'chevron-right',
  chevronUp: 'chevron-up',
  chevronDown: 'chevron-down',
  chevronsLeft: 'chevrons-left',
  chevronsRight: 'chevrons-right',
  chevronsUp: 'chevrons-up',
  chevronsDown: 'chevrons-down',
  arrowLeft: 'arrow-left',
  arrowRight: 'arrow-right',
  arrowUp: 'arrow-up',
  arrowDown: 'arrow-down',
  menu: 'menu',
  x: 'x',

  // Actions
  plus: 'plus',
  minus: 'minus',
  check: 'check',
  checkCircle: 'check-circle',
  xCircle: 'x-circle',
  alertCircle: 'alert-circle',
  alertTriangle: 'alert-triangle',
  info: 'info',
  helpCircle: 'help-circle',
  save: 'save',
  edit: 'edit',
  edit2: 'edit-2',
  delete: 'trash-2',
  trash: 'trash',
  copy: 'copy',
  download: 'download',
  upload: 'upload',
  refresh: 'refresh-cw',
  rotateCcw: 'rotate-ccw',
  search: 'search',
  filter: 'filter',
  sort: 'arrow-up-down',
  moreHorizontal: 'more-horizontal',
  moreVertical: 'more-vertical',
  plusCircle: 'plus-circle',
  inbox: 'inbox',

  // Status
  loader: 'loader-2',
  spinner: 'loader',
  trendingUp: 'trending-up',
  trendingDown: 'trending-down',
  checkCheck: 'check-check',
  circle: 'circle',
  circleDot: 'circle-dot',
  dot: 'circle-dot',

  // UI
  home: 'home',
  settings: 'settings',
  user: 'user',
  users: 'users',
  userPlus: 'user-plus',
  userMinus: 'user-minus',
  userCheck: 'user-check',
  userX: 'user-x',
  logIn: 'log-in',
  logOut: 'log-out',
  lock: 'lock',
  unlock: 'unlock',
  key: 'key',
  shield: 'shield',
  eye: 'eye',
  eyeOff: 'eye-off',
  bell: 'bell',
  bellOff: 'bell-off',
  mail: 'mail',
  messageSquare: 'message-square',
  phone: 'phone',
  mapPin: 'map-pin',
  navigation: 'navigation',
  calendar: 'calendar',
  clock: 'clock',
  timer: 'timer',
  calendarDays: 'calendar-days',
  calendarRange: 'calendar-range',

  // Restaurant specific
  utensils: 'utensils',
  utensilsCrossed: 'utensils-crossed',
  chefHat: 'chef-hat',
  coffee: 'coffee',
  beer: 'beer',
  wine: 'wine',
  pizza: 'pizza',
  hamburger: 'hamburger',
  sandwich: 'sandwich',
  salad: 'salad',
  soup: 'soup',
  cookie: 'cookie',
  iceCream: 'ice-cream',
  cake: 'cake',
  candy: 'candy',
  bread: 'bread',
  fish: 'fish',
  drumstick: 'drumstick',
  egg: 'egg',
  carrot: 'carrot',
  apple: 'apple',
  grapes: 'grapes',
  lemon: 'lemon',
  orange: 'orange',
  wheat: 'wheat',
  rice: 'rice-off',
  milk: 'milk',
  glassWater: 'glass-water',
  cupSoda: 'cup-soda',

  // Table/Kitchen
  table: 'table-2',
  tableCells: 'table-cells',
  layoutGrid: 'layout-grid',
  layoutList: 'layout-list',
  layoutDashboard: 'layout-dashboard',
  grid: 'grid',
  list: 'list',
  listOrdered: 'list-ordered',
  listTodo: 'list-todo',
  checkSquare: 'check-square',
  square: 'square',
  clipboard: 'clipboard',
  clipboardCheck: 'clipboard-check',
  clipboardList: 'clipboard-list',
  fileText: 'file-text',
  receipt: 'receipt',
  receiptText: 'receipt-text',
  calculator: 'calculator',
  creditCard: 'credit-card',
  banknote: 'banknote',
  coins: 'coins',
  wallet: 'wallet',
  piggyBank: 'piggy-bank',
  tag: 'tag',
  tags: 'tags',
  barcode: 'barcode',
  qrCode: 'qr-code',
  scan: 'scan',
  scanLine: 'scan-line',
  scanEye: 'scan-eye',
  nfc: 'nfc',
  wifi: 'wifi',
  wifiOff: 'wifi-off',
  signal: 'signal',
  signalZero: 'signal-zero',

  // Feedback
  star: 'star',
  heart: 'heart',
  thumbsUp: 'thumbs-up',
  thumbsDown: 'thumbs-down',
  flag: 'flag',
  bookmark: 'bookmark',
  share: 'share-2',
  share2: 'share-2',
  link: 'link',
  link2: 'link-2',
  externalLink: 'external-link',
  download2: 'download',
  upload2: 'upload',
  print: 'printer',
  printer: 'printer',

  // Data
  database: 'database',
  server: 'server',
  hardDrive: 'hard-drive',
  cpu: 'cpu',
  memoryStick: 'memory-stick',
  monitor: 'monitor',
  smartphone: 'smartphone',
  tablet: 'tablet',
  laptop: 'laptop',
  desktop: 'desktop',
  tv: 'tv',
  camera: 'camera',
  video: 'video',
  mic: 'mic',
  micOff: 'mic-off',
  headphones: 'headphones',
  speaker: 'speaker',
  volume2: 'volume-2',
  volumeX: 'volume-x',
  music: 'music',
  music2: 'music-2',
  film: 'film',
  clapperboard: 'clapperboard',
  image: 'image',
  images: 'images',
  palette: 'palette',
  brush: 'brush',
  pen: 'pen',
  pencil: 'pencil',
  type: 'type',
  font: 'font',
  code: 'code',
  code2: 'code-2',
  terminal: 'terminal',
  bug: 'bug',
  gitBranch: 'git-branch',
  gitCommit: 'git-commit',
  gitMerge: 'git-merge',
  gitPullRequest: 'git-pull-request',
  github: 'github',
  gitlab: 'gitlab',
  bitbucket: 'bitbucket',

  // Misc
  sparkles: 'sparkles',
  tool: 'wrench',
  package: 'package'
} as const;