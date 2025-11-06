import {
  Ban,
  // Import other icons as needed
  CheckCheck,
  Merge,
  Rocket,
  Spline,
  Split,
} from "lucide-react";

export const iconMapping: Record<
  string,
  React.FC<React.SVGProps<SVGSVGElement>>
> = {
  Rocket: Rocket,
  Spline: Spline,
  Split: Split,
  Merge: Merge,
  CheckCheck: CheckCheck,
  Ban: Ban,
  // Add other mappings here
};
