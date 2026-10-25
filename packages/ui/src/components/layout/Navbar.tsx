// Navbar — Top navigation bar component
'use client';

import { forwardRef, ReactNode, useState, useEffect } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';
import { Icon, Icons } from '../primitives/Icon';
import { Button } from '../base/Button';
import { Text } from '../primitives/Text';
import { Avatar, AvatarGroup } from '../composite/Avatar';
import { Dropdown, DropdownItem } from '../composite/Dropdown';
import { useIsMobile } from '../../hooks';
import { Sheet } from '../composite/Sheet';

export interface NavItem {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: keyof typeof Icons;
  badge?: string | number;
  disabled?: boolean;
}

export interface NavbarProps {
  logo?: ReactNode;
  title?: string;
  navigation?: NavItem[];
  actions?: ReactNode;
  user?: {
    name: string;
    email?: string;
    avatar?: string;
    menuItems?: DropdownItem[];
  };
  sidebarTrigger?: ReactNode;
  className?: string;
  sticky?: boolean;
  transparent?: boolean;
  glass?: boolean;
}

export const Navbar = forwardRef<HTMLElement, NavbarProps>(
  ({
    className,
    logo,
    title,
    navigation = [],
    actions,
    user,
    sidebarTrigger,
    sticky = true,
    transparent = false,
    glass = true
  }, ref) => {
    const [scrolled, setScrolled] = useState(false);
    const isMobile = useIsMobile();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
      if (!sticky) return;
      const handleScroll = () => setScrolled(window.scrollY > 10);
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
    }, [sticky]);

    const showGlass = glass && (scrolled || !transparent);

    return (
      <nav
        ref={ref}
        className={cn(
          'fixed top-0 left-0 right-0 z-[200] transition-all duration-normal',
          sticky && 'w-full',
          showGlass && 'glass-navbar',
          !showGlass && transparent && 'bg-transparent',
          className
        )}
        role="navigation"
        aria-label="Navegação principal"
      >
        <div className="flex items-center justify-between h-16 px-4">
          {/* Left: Logo/Title + Sidebar trigger */}
          <div className="flex items-center gap-4">
            {sidebarTrigger && (
              <Button variant="ghost" size="icon" aria-label="Abrir menu">
                <Icon name="menu" size="md" aria-hidden="true" />
              </Button>
            )}
            {logo && <div className="flex-shrink-0">{logo}</div>}
            {title && !isMobile && (
              <Text as="h1" className="text-h4 font-semibold truncate max-w-[300px]">
                {title}
              </Text>
            )}
          </div>

          {/* Center: Navigation (desktop only) */}
          {!isMobile && navigation.length > 0 && (
            <div className="hidden md:flex items-center gap-1">
              {navigation.map((item, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  onClick={item.onClick}
                  disabled={item.disabled}
                  className="gap-1.5"
                >
                  {item.icon && <Icon name={item.icon} size="sm" aria-hidden="true" />}
                  {item.label}
                  {item.badge && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-destructive)] text-[var(--color-destructive-foreground)] text-xs font-medium px-1">
                      {item.badge}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          )}

          {/* Right: Actions + User menu */}
          <div className="flex items-center gap-2 ml-auto">
            {actions && <div className="flex items-center gap-2">{actions}</div>}

            {user && (
              <Dropdown
                trigger={
                  <Button variant="ghost" size="icon" className="relative">
                    <Avatar
                      name={user.name}
                      src={user.avatar}
                      size="sm"
                    />
                    {user.menuItems && <Icon name="chevronDown" size="xs" className="ml-1" aria-hidden="true" />}
                  </Button>
                }
                items={user.menuItems || [
                  { label: 'Perfil', onClick: () => {}, icon: 'user' },
                  { label: 'Configurações', onClick: () => {}, icon: 'settings' },
                  { label: 'Sair', onClick: () => {}, icon: 'logOut', dangerous: true }
                ]}
                side="bottom"
                align="end"
              />
            )}

            {/* Mobile menu trigger */}
            {isMobile && navigation.length > 0 && (
              <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)} aria-label="Abrir menu">
                <Icon name="menu" size="md" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>

        {/* Mobile navigation sheet */}
        {isMobile && (
          <Sheet open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} side="right" size="half">
            <div className="space-y-2 p-4">
              {title && (
                <Text as="h2" className="text-h3 font-semibold mb-4">
                  {title}
                </Text>
              )}
              {navigation.map((item, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  fullWidth
                  size="lg"
                  onClick={() => { item.onClick?.(); setMobileMenuOpen(false); }}
                  disabled={item.disabled}
                  className="gap-3 justify-start"
                >
                  {item.icon && <Icon name={item.icon} size="md" aria-hidden="true" />}
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--color-destructive)] text-[var(--color-destructive-foreground)] text-xs font-medium px-2">
                      {item.badge}
                    </span>
                  )}
                </Button>
              ))}
              {actions && (
                <div className="pt-4 border-t border-[var(--glass-border)]">
                  {actions}
                </div>
              )}
            </div>
          </Sheet>
        )}
      </nav>
    );
    }
);

Navbar.displayName = 'Navbar';

// Navbar with breadcrumbs
export interface NavbarBreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface NavbarWithBreadcrumbsProps extends Omit<NavbarProps, 'navigation'> {
  breadcrumbs?: NavbarBreadcrumbItem[];
}

export function NavbarWithBreadcrumbs({
  breadcrumbs = [],
  className,
  ...props
}: NavbarWithBreadcrumbsProps) {
  return (
    <div className={cn('w-full', className)}>
      <Navbar {...props} />
      {breadcrumbs.length > 0 && (
        <div className="pt-16 px-4">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-body-sm text-[var(--color-muted-foreground)]">
            {breadcrumbs.map((item, index) => (
              <span key={index} className="flex items-center gap-2">
                {index > 0 && <Icon name="chevronRight" size="xs" aria-hidden="true" />}
                {item.href || item.onClick ? (
                  <button
                    onClick={item.onClick}
                    className="hover:text-[var(--color-foreground)] transition-colors font-medium"
                  >
                    {item.label}
                  </button>
                ) : (
                  <span className="font-medium text-[var(--color-foreground)]">{item.label}</span>
                )}
              </span>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}