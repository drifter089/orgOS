# Components Overview

This project includes a comprehensive set of UI components from Shadcn/ui, along with custom components.

## Available Components

The project includes 53 Shadcn/ui components ready to use:

### Layout Components

- **Card** - Container for content with header and footer
- **Separator** - Visual divider between sections
- **Scroll Area** - Custom scrollable container
- **Resizable** - Resizable panel layouts

### Form Components

- **Button** - Interactive buttons with variants
- **Input** - Text input fields
- **Textarea** - Multi-line text input
- **Select** - Dropdown selection
- **Checkbox** - Boolean input
- **Radio Group** - Single selection from options
- **Switch** - Toggle between states
- **Slider** - Range input

### Navigation

- **Navigation Menu** - Complex navigation patterns
- **Menubar** - Application menu bar
- **Dropdown Menu** - Contextual menu options
- **Tabs** - Tabbed content switching

### Feedback

- **Alert** - Important messages
- **Toast** - Temporary notifications
- **Dialog** - Modal dialogs
- **Alert Dialog** - Confirmation dialogs
- **Popover** - Floating content container

## Component Examples

### Basic Button

```tsx
import { Button } from "~/components/ui/button";

export default function Example() {
  return (
    <div className="flex gap-2">
      <Button>Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
    </div>
  );
}
```

### Card Component

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "~/components/ui/card";

export default function CardExample() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here</CardDescription>
      </CardHeader>
      <CardContent>
        <p>This is the card content.</p>
      </CardContent>
    </Card>
  );
}
```

### Alert Component

```tsx
import { Alert, AlertTitle, AlertDescription } from "~/components/ui/alert";
import { InfoIcon } from "lucide-react";

export default function AlertExample() {
  return (
    <Alert>
      <InfoIcon className="h-4 w-4" />
      <AlertTitle>Heads up!</AlertTitle>
      <AlertDescription>
        You can add components to your app using the CLI.
      </AlertDescription>
    </Alert>
  );
}
```

## Using Components in MDX

You can use any Shadcn component directly in your MDX documentation:

<Card>
  <CardHeader>
    <CardTitle>MDX Component Example</CardTitle>
    <CardDescription>This card is rendered directly in MDX!</CardDescription>
  </CardHeader>
  <CardContent>
    You can embed any React component in your markdown files.
  </CardContent>
</Card>

## Styling

All components use CSS variables for theming and support dark mode out of the box.

### Color Palette

The project uses OKLCH color space for better color perception:

- **Primary** - Main brand color
- **Secondary** - Supporting color
- **Muted** - Subdued elements
- **Accent** - Highlighting color
- **Destructive** - Error states

## Customization

Components can be customized by:

1. Modifying the component files in `src/components/ui/`
2. Updating CSS variables in `src/styles/globals.css`
3. Using the `cn()` utility to add custom classes

```tsx
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export default function CustomButton() {
  return (
    <Button className={cn("bg-gradient-to-r from-purple-500 to-pink-500")}>
      Gradient Button
    </Button>
  );
}
```

## Icons

The project uses **Lucide React** for icons. All icons are tree-shakeable and only what you use gets bundled.

```tsx
import { Home, User, Settings, Menu } from "lucide-react";

export default function Icons() {
  return (
    <div className="flex gap-4">
      <Home className="h-6 w-6" />
      <User className="h-6 w-6" />
      <Settings className="h-6 w-6" />
      <Menu className="h-6 w-6" />
    </div>
  );
}
```

## Best Practices

1. **Use semantic HTML** - Components render proper HTML elements
2. **Accessibility** - All components follow ARIA best practices
3. **Responsive** - Components adapt to different screen sizes
4. **Type-safe** - Full TypeScript support with IntelliSense
5. **Performance** - Components are optimized for production

## More Resources

- [Shadcn/ui Documentation](https://ui.shadcn.com)
- [Radix UI Primitives](https://www.radix-ui.com)
- [Lucide Icons](https://lucide.dev)
