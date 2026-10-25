// PageLayout — Complete page layout with sidebar, navbar, footer
'use client';

import { ReactNode, CSSProperties, useState, useEffect } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';
import { Sidebar, SidebarProps } from './Sidebar';
import { Navbar, NavbarProps } from './Navbar';
import { Footer, FooterProps } from './Footer';
import { Container } from './Container';
import { Card } from '../composite/Card';
import { Text } from '../primitives/Text';
import { useIsMobile } from '../../hooks';

const pageLayoutVariants = tv({
  base: 'min-h-screen flex flex-col',
  variants: {
    hasSidebar: {
      true: '',
      false: ''
    }
  },
  defaultVariants: {
    hasSidebar: false
  }
});

export interface PageLayoutProps {
  // Sidebar
  sidebar?: SidebarProps;
  sidebarTrigger?: ReactNode;
  // Navbar
  navbar?: Omit<NavbarProps, 'sidebarTrigger'>;
  // Footer
  footer?: FooterProps;
  // Content
  children: ReactNode;
  // Layout options
  containerSize?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  className?: string;
}

export function PageLayout({
  sidebar,
  sidebarTrigger,
  navbar,
  footer,
  children,
  containerSize = 'lg',
  className
}: PageLayoutProps) {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Sync sidebar collapsed state
  useEffect(() => {
    if (sidebar?.collapsible === false) {
      setSidebarCollapsed(false);
    }
  }, [sidebar?.collapsible]);

  const handleSidebarToggle = () => {
    if (isMobile) {
      setSidebarOpen(!sidebarOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const defaultSidebarTrigger = (
    <button
      className="md:hidden"
      onClick={handleSidebarToggle}
      aria-label={sidebarOpen ? 'Fechar menu' : 'Abrir menu'}
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
      </svg>
    </button>
  );

  const navbarProps: NavbarProps = {
    ...navbar,
    sidebarTrigger: sidebarTrigger ?? defaultSidebarTrigger,
    sticky: true,
    glass: true
  };

  return (
    <div className={cn(pageLayoutVariants({ hasSidebar: !!sidebar }), className)}>
      {/* Mobile sidebar overlay */}
      {isMobile && sidebar && sidebarOpen && (
        <div
          className="fixed inset-0 z-[250] bg-black/50 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      {sidebar && (
        <Sidebar
          {...sidebar}
          collapsible={!isMobile}
          defaultCollapsed={sidebarCollapsed}
          onCollapseChange={setSidebarCollapsed}
          className={cn(
            isMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
            sidebarOpen && 'translate-x-0',
            sidebar.className
          )}
        />
      )}

      {/* Main content wrapper */}
      <div
        className={cn('flex-1 flex flex-col min-w-0', sidebar && !isMobile && 'md:ml-[var(--sidebar-offset)]')}
        style={{
          '--sidebar-offset': `${sidebarCollapsed ? sidebar?.collapsedWidth || 72 : sidebar?.width || 260}px`
        } as CSSProperties}
      >
        {/* Navbar */}
        {navbar && <Navbar {...navbarProps} />}

        {/* Page content */}
        <main
          className={cn('flex-1 w-full pt-16', sidebar && !isMobile && 'md:pt-16')}
          id="main-content"
          role="main"
        >
          <Container size={containerSize} className="py-6">
            {children}
          </Container>
        </main>

        {/* Footer */}
        {footer && <Footer {...footer} />}
      </div>
    </div>
  );
}

// Auth layout (centered card)
export interface AuthLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  logo?: ReactNode;
  className?: string;
  cardProps?: React.ComponentProps<'div'>;
}

export function AuthLayout({
  children,
  title,
  subtitle,
  logo,
  className,
  cardProps
}: AuthLayoutProps) {
  return (
    <div className={cn('min-h-screen flex items-center justify-center p-4 bg-[var(--color-background)]', className)}>
      <div className="w-full max-w-md">
        {logo && (
          <div className="flex justify-center mb-8">
            {logo}
          </div>
        )}
        <Card variant="glass-strong" padding="lg" {...cardProps}>
          {(title || subtitle) && (
            <div className="text-center mb-8">
              {title && <Text as="h1" className="text-h3 font-semibold mb-2">{title}</Text>}
              {subtitle && <Text as="p" color="muted" size="body-lg">{subtitle}</Text>}
            </div>
          )}
          {children}
        </Card>
      </div>
    </div>
  );
}

// Dashboard layout (with sidebar always visible on desktop)
export interface DashboardLayoutProps {
  sidebar: SidebarProps;
  navbar?: Omit<NavbarProps, 'sidebarTrigger'>;
  children: ReactNode;
  className?: string;
}

export function DashboardLayout({
  sidebar,
  navbar,
  children,
  className
}: DashboardLayoutProps) {
  return (
    <PageLayout
      sidebar={sidebar}
      navbar={navbar}
      className={className}
    >
      {children}
    </PageLayout>
  );
}

// Simple layout (no sidebar, just navbar + content)
export interface SimpleLayoutProps {
  navbar?: Omit<NavbarProps, 'sidebarTrigger'>;
  footer?: FooterProps;
  children: ReactNode;
  className?: string;
}

export function SimpleLayout({
  navbar,
  footer,
  children,
  className
}: SimpleLayoutProps) {
  return (
    <PageLayout
      navbar={navbar}
      footer={footer}
      className={className}
    >
      {children}
    </PageLayout>
  );
}