import { ReactNode, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

type AlertType = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
    message: string;
    type?: AlertType;
    className?: string;
    icon?: ReactNode;
    duration?: number; // zamān dar hāng-gē (ms)
    onClose?: () => void; // function barāy baste šodan
}

export function Alert({
                          message,
                          type = 'info',
                          className = '',
                          icon,
                          duration = 2000, // pishfarz: 2 saniye
                          onClose
                      }: AlertProps) {
    const [isVisible, setIsVisible] = useState(true);

    const icons = {
        info: <Info className="w-5 h-5" />,
        success: <CheckCircle className="w-5 h-5" />,
        warning: <AlertCircle className="w-5 h-5" />,
        error: <XCircle className="w-5 h-5" />
    };

    const classes = {
        info: 'alert-info',
        success: 'alert-success',
        warning: 'alert-warning',
        error: 'alert-error'
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            onClose?.();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    if (!isVisible) return null;

    return (
        <div className={`alert ${classes[type]} ${className}`}>
            {icon || icons[type]}
            <span>{message}</span>
        </div>
    );
}