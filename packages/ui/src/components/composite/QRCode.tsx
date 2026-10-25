// QRCode — QR code generator component
'use client';

import { forwardRef, HTMLAttributes, useEffect, useRef, useState } from 'react';
import { tv } from '@elo-digital/ui/utils/tv';
import { cn } from '@elo-digital/ui/utils/classnames';
import { Text } from '../primitives/Text';

const qrCodeVariants = tv({
  base: 'inline-flex flex-col items-center gap-2',
  variants: {
    size: {
      sm: '',
      md: '',
      lg: ''
    }
  },
  defaultVariants: {
    size: 'md'
  }
});

export interface QRCodeProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
  size?: number | keyof typeof qrCodeVariants.variants.size;
  level?: 'L' | 'M' | 'Q' | 'H';
  includeMargin?: boolean;
  label?: string;
  showLabel?: boolean;
  className?: string;
}

export const QRCode = forwardRef<HTMLDivElement, QRCodeProps>(
  ({
    className,
    value,
    size = 128,
    level = 'M',
    includeMargin = true,
    label,
    showLabel = false,
    ...props
  }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [dataUrl, setDataUrl] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    // Dynamic import for qrcode to avoid SSR issues
    useEffect(() => {
      let mounted = true;

      const generateQR = async () => {
        try {
          const QRCode = (await import('qrcode')).default;
          const canvas = canvasRef.current;
          if (!canvas || !mounted) return;

          const qrSize = typeof size === 'number' ? size : 128;
          canvas.width = qrSize;
          canvas.height = qrSize;

          await QRCode.toCanvas(canvas, value, {
            width: qrSize,
            margin: includeMargin ? 2 : 0,
            errorCorrectionLevel: level,
            color: {
              dark: '#000000',
              light: '#ffffff00' // Transparent background for glass effect
            }
          });

          if (mounted) {
            setDataUrl(canvas.toDataURL('image/png'));
            setError(null);
          }
        } catch (err) {
          if (mounted) {
            setError('Erro ao gerar QR Code');
            console.error('QRCode generation failed:', err);
          }
        }
      };

      generateQR();

      return () => {
        mounted = false;
      };
    }, [value, size, level, includeMargin]);

    const pixelSize = typeof size === 'number' ? size : 128;

    if (error) {
      return (
        <div ref={ref} className={cn(qrCodeVariants({ size: 'md' }), className)} {...props}>
          <div className="glass rounded-lg p-6 text-center min-w-[128px]">
            <Text color="destructive" size="body-sm" weight="medium">
              {error}
            </Text>
          </div>
        </div>
      );
    }

    return (
      <div ref={ref} className={cn(qrCodeVariants({ size: 'md' }), className)} {...props}>
        <canvas
          ref={canvasRef}
          width={pixelSize}
          height={pixelSize}
          className="glass rounded-lg"
          aria-label={label || 'Código QR'}
          role="img"
        />
        {showLabel && label && (
          <Text as="p" size="body-sm" color="muted" className="text-center break-all max-w-[200px]">
            {label}
          </Text>
        )}
      </div>
    );
  }
);

QRCode.displayName = 'QRCode';

// Helper to generate QR code data URL (for server-side or non-React usage)
export async function generateQRCodeDataURL(
  value: string,
  options: {
    width?: number;
    margin?: number;
    level?: 'L' | 'M' | 'Q' | 'H';
    darkColor?: string;
    lightColor?: string;
  } = {}
): Promise<string> {
  const QRCode = (await import('qrcode')).default;
  return QRCode.toDataURL(value, {
    width: options.width ?? 256,
    margin: options.margin ?? 2,
    errorCorrectionLevel: options.level ?? 'M',
    color: {
      dark: options.darkColor ?? '#000000',
      light: options.lightColor ?? '#ffffff00'
    }
  });
}

// QRCode with download button
export interface QRCodeWithDownloadProps extends QRCodeProps {
  downloadName?: string;
}

export function QRCodeWithDownload({
  value,
  downloadName = 'qrcode',
  className,
  ...props
}: QRCodeWithDownloadProps) {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    generateQRCodeDataURL(value).then(setDataUrl).catch(console.error);
  }, [value]);

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <QRCode value={value} {...props} />
      {dataUrl && (
        <a
          href={dataUrl}
          download={`${downloadName}.png`}
          className="text-body-sm text-[var(--color-primary)] hover:underline"
        >
          Baixar QR Code
        </a>
      )}
    </div>
  );
}