import { ReactNode, ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'error' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    fullWidth?: boolean;
}

export function Button({
                           children,
                           variant = 'primary',
                           size = 'md',
                           loading = false,
                           fullWidth = false,
                           className = '',
                           disabled,
                           ...props
                       }: ButtonProps) {
    const variants = {
        primary: 'btn-primary',
        secondary: 'btn-secondary',
        success: 'btn-success',
        error: 'btn-error',
        ghost: 'btn-ghost',
        outline: 'btn-outline'
    };

    const sizes = {
        sm: 'btn-sm',
        md: 'btn-md',
        lg: 'btn-lg'
    };

    return (
        <button
            className={`btn ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : children}
        </button>
    );
}