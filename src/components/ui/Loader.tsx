import { Loader2 } from 'lucide-react';

interface LoaderProps {
    size?: 'sm' | 'md' | 'lg';
    text?: string;
}

export function Loader({ size = 'md', text }: LoaderProps) {
    const sizes = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12'
    };

    return (
        <div className="flex items-center justify-center gap-2">
            <Loader2 className={`animate-spin ${sizes[size]} text-primary`} />
            {text && <span>{text}</span>}
        </div>
    );
}