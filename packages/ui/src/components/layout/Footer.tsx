// Footer — Page footer component
'use client';

import { forwardRef, ReactNode } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';
import { Icon, Icons } from '../primitives/Icon';
import { Text } from '../primitives/Text';
import { Container } from './Container';

const footerVariants = tv({
  base: 'w-full border-t border-[var(--color-border)]',
  variants: {
    variant: {
      default: 'bg-[var(--color-surface)]',
      glass: 'glass',
      minimal: 'bg-transparent'
    },
    size: {
      sm: 'py-6',
      md: 'py-10',
      lg: 'py-16'
    }
  },
  defaultVariants: {
    variant: 'default',
    size: 'md'
  }
});

export interface FooterLink {
  label: string;
  href?: string;
  onClick?: () => void;
  external?: boolean;
}

export interface FooterSection {
  title?: string;
  links: FooterLink[];
}

export interface FooterProps {
  sections?: FooterSection[];
  brand?: {
    logo?: ReactNode;
    name: string;
    description?: string;
    socialLinks?: Array<{ label: string; href: string; icon: keyof typeof Icons; external?: boolean }>;
  };
  copyright?: string;
  variant?: keyof typeof footerVariants.variants.variant;
  size?: keyof typeof footerVariants.variants.size;
  className?: string;
  children?: ReactNode;
}

export const Footer = forwardRef<HTMLElement, FooterProps>(
    ({
        className,
        sections = [],
        brand,
        copyright,
        variant = 'default',
        size = 'md',
        children
    }, ref) => {
        const currentYear = new Date().getFullYear();

        return (
            <footer
                ref={ref}
                className={cn(footerVariants({ variant, size }), className)}
                role="contentinfo"
            >
                <Container size="lg" className="flex flex-col md:flex-row items-start justify-between gap-8">
                    {/* Brand section */}
                    {brand && (
                        <div className="flex-1 md:w-1/3 max-w-xs">
                            {brand.logo && (
                                <div className="mb-4">{brand.logo}</div>
                            )}
                            <Text as="h3" className="text-h4 font-semibold mb-2">
                                {brand.name}
                            </Text>
                            {brand.description && (
                                <Text as="p" color="muted" size="body-sm" className="mb-4">
                                    {brand.description}
                                </Text>
                            )}
                            {brand.socialLinks && brand.socialLinks.length > 0 && (
                                <div className="flex items-center gap-3">
                                    {brand.socialLinks.map((social, index) => (
                                        <a
                                            key={index}
                                            href={social.href}
                                            target={social.external ? '_blank' : undefined}
                                            rel={social.external ? 'noopener noreferrer' : undefined}
                                            className="glass-subtle p-2 rounded-lg hover:bg-[var(--glass-bg-hover)] transition-colors"
                                            aria-label={social.label}
                                        >
                                            <Icon name={social.icon} size="md" aria-hidden="true" />
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Navigation sections */}
                    {sections.length > 0 && (
                        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-8">
                            {sections.map((section, sectionIndex) => (
                                <div key={sectionIndex}>
                                    {section.title && (
                                        <Text as="h4" className="text-label font-semibold mb-3">
                                            {section.title}
                                        </Text>
                                    )}
                                    <ul className="space-y-2" role="list">
                                        {section.links.map((link, linkIndex) => (
                                            <li key={linkIndex}>
                                                {link.href || link.onClick ? (
                                                    <a
                                                        href={link.href}
                                                        onClick={link.onClick}
                                                        target={link.external ? '_blank' : undefined}
                                                        rel={link.external ? 'noopener noreferrer' : undefined}
                                                        className="text-body-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
                                                    >
                                                        {link.label}
                                                    </a>
                                                ) : (
                                                    <Text as="span" size="body-sm" color="muted">
                                                        {link.label}
                                                    </Text>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Custom children */}
                    {children && <div className="flex-1">{children}</div>}
                </Container>

                {/* Copyright */}
                {(copyright || brand) && (
                    <div className="border-t border-[var(--color-border)] mt-8">
                        <Container size="lg" className="py-4 flex flex-col md:flex-row items-center justify-between gap-4">
                            <Text as="p" size="body-sm" color="muted">
                                {copyright || `© ${currentYear} ${brand?.name || 'Elo Digital'}. Todos os direitos reservados.`}
                            </Text>
                        </Container>
                    </div>
                )}
            </footer>
        );
    }
);

Footer.displayName = 'Footer';