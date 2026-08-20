import * as React from "react";
import type { LucideProps } from "lucide-react";

export const PawIcon = React.forwardRef<SVGSVGElement, LucideProps>(
  ({ size, className = "size-5", ...props }, ref) => {
    return (
      <svg
        ref={ref}
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        width={size}
        height={size}
        aria-hidden="true"
        {...props}
      >
        {/* 4 Digital Toe Pads */}
        <ellipse cx="5.2" cy="9.6" rx="2.2" ry="3.2" transform="rotate(-24 5.2 9.6)" />
        <ellipse cx="9.6" cy="5.2" rx="2.3" ry="3.3" transform="rotate(-8 9.6 5.2)" />
        <ellipse cx="14.4" cy="5.2" rx="2.3" ry="3.3" transform="rotate(8 14.4 5.2)" />
        <ellipse cx="18.8" cy="9.6" rx="2.2" ry="3.2" transform="rotate(24 18.8 9.6)" />
        {/* Main Metacarpal Pad */}
        <path d="M12 11C9.6 11 7.2 13 6.8 15.6C6.4 17.8 7.6 20 9.6 20.6C10.5 20.9 11.2 20.6 12 20C12.8 20.6 13.5 20.9 14.4 20.6C16.4 20 17.6 17.8 17.2 15.6C16.8 13 14.4 11 12 11Z" />
      </svg>
    );
  }
);
PawIcon.displayName = "PawIcon";
