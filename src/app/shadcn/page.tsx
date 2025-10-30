"use client";

import { useState } from "react";

import {
  Activity,
  AlertCircle,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  CalendarIcon,
  Check,
  ChevronDown,
  ChevronRight,
  Info,
  Italic,
  MoreHorizontal,
  Settings,
  Underline,
  User,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function ShadcnShowcasePage() {
  const [checkedState, setCheckedState] = useState(false);
  const [switchState, setSwitchState] = useState(false);
  const [sliderValue, setSliderValue] = useState([50]);
  const [radioValue, setRadioValue] = useState("option1");
  const [selectedValue, setSelectedValue] = useState("apple");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [openCollapsible, setOpenCollapsible] = useState(false);
  const [position, setPosition] = useState("bottom");

  return (
    <TooltipProvider>
      <div className="container mx-auto space-y-8 p-8">
        {/* Header with Breadcrumbs */}
        <div className="space-y-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/components">Components</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink>Showcase</BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <h1 className="text-4xl font-bold tracking-tight">
            Shadcn Component Showcase
          </h1>
          <p className="text-muted-foreground text-lg">
            Comprehensive demonstration of all shadcn/ui components and how
            global CSS variables control their theming
          </p>
        </div>

        <Separator />

        {/* Complete Color Palette Display */}
        <Card>
          <CardHeader>
            <CardTitle>Complete Color Palette</CardTitle>
            <CardDescription>
              All CSS variables defined in globals.css that control component
              styling
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Primary Colors */}
            <div>
              <h3 className="mb-3 text-sm font-medium">Primary Colors</h3>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
                <div className="space-y-2">
                  <div className="bg-background border-border flex h-20 items-center justify-center rounded-lg border">
                    <span className="text-foreground text-xs font-medium">
                      Aa
                    </span>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Background</p>
                    <p className="text-muted-foreground text-xs">
                      --color-background
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="bg-foreground flex h-20 items-center justify-center rounded-lg">
                    <span className="text-background text-xs font-medium">
                      Aa
                    </span>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Foreground</p>
                    <p className="text-muted-foreground text-xs">
                      --color-foreground
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="bg-primary flex h-20 items-center justify-center rounded-lg">
                    <span className="text-primary-foreground text-xs font-medium">
                      Aa
                    </span>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Primary</p>
                    <p className="text-muted-foreground text-xs">
                      --color-primary
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="bg-secondary flex h-20 items-center justify-center rounded-lg">
                    <span className="text-secondary-foreground text-xs font-medium">
                      Aa
                    </span>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Secondary</p>
                    <p className="text-muted-foreground text-xs">
                      --color-secondary
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="bg-muted flex h-20 items-center justify-center rounded-lg">
                    <span className="text-muted-foreground text-xs font-medium">
                      Aa
                    </span>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Muted</p>
                    <p className="text-muted-foreground text-xs">
                      --color-muted
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="bg-accent flex h-20 items-center justify-center rounded-lg">
                    <span className="text-accent-foreground text-xs font-medium">
                      Aa
                    </span>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Accent</p>
                    <p className="text-muted-foreground text-xs">
                      --color-accent
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Semantic Colors */}
            <div>
              <h3 className="mb-3 text-sm font-medium">Semantic Colors</h3>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
                <div className="space-y-2">
                  <div className="bg-destructive flex h-20 items-center justify-center rounded-lg">
                    <span className="text-destructive-foreground text-xs font-medium">
                      Error
                    </span>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Destructive</p>
                    <p className="text-muted-foreground text-xs">
                      --color-destructive
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="bg-card border-border flex h-20 items-center justify-center rounded-lg border">
                    <span className="text-card-foreground text-xs font-medium">
                      Card
                    </span>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Card</p>
                    <p className="text-muted-foreground text-xs">
                      --color-card
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="bg-popover border-border flex h-20 items-center justify-center rounded-lg border">
                    <span className="text-popover-foreground text-xs font-medium">
                      Popover
                    </span>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Popover</p>
                    <p className="text-muted-foreground text-xs">
                      --color-popover
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="border-border flex h-20 items-center justify-center rounded-lg border-2">
                    <span className="text-xs font-medium">Border</span>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Border</p>
                    <p className="text-muted-foreground text-xs">
                      --color-border
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="border-input flex h-20 items-center justify-center rounded-lg border-2">
                    <span className="text-xs font-medium">Input</span>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Input</p>
                    <p className="text-muted-foreground text-xs">
                      --color-input
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="border-ring flex h-20 items-center justify-center rounded-lg border-4">
                    <span className="text-xs font-medium">Ring</span>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Ring (Focus)</p>
                    <p className="text-muted-foreground text-xs">
                      --color-ring
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Chart Colors with Visual Examples */}
            <div>
              <h3 className="mb-3 text-sm font-medium">
                Chart Colors for Data Visualization
              </h3>
              <div className="grid grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((num) => (
                  <div key={num} className="space-y-2">
                    <div
                      className={`bg-chart-${num} relative h-24 overflow-hidden rounded-lg`}
                    >
                      <div
                        className={`absolute right-0 bottom-0 left-0 bg-chart-${num} h-12 opacity-75`}
                      ></div>
                      <div
                        className={`absolute right-0 bottom-0 left-0 bg-chart-${num} h-6 opacity-50`}
                      ></div>
                    </div>
                    <p className="text-center text-sm font-medium">
                      Chart {num}
                    </p>
                    <p className="text-muted-foreground text-center text-xs">
                      --color-chart-{num}
                    </p>
                  </div>
                ))}
              </div>
              {/* Mini Bar Chart Demo */}
              <div className="mt-4 flex h-32 items-end gap-2">
                <div
                  className="bg-chart-1 flex-1 rounded-t"
                  style={{ height: "80%" }}
                ></div>
                <div
                  className="bg-chart-2 flex-1 rounded-t"
                  style={{ height: "60%" }}
                ></div>
                <div
                  className="bg-chart-3 flex-1 rounded-t"
                  style={{ height: "90%" }}
                ></div>
                <div
                  className="bg-chart-4 flex-1 rounded-t"
                  style={{ height: "40%" }}
                ></div>
                <div
                  className="bg-chart-5 flex-1 rounded-t"
                  style={{ height: "70%" }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Components */}
        <Card>
          <CardHeader>
            <CardTitle>Navigation Components</CardTitle>
            <CardDescription>
              Navigation Menu, Tabs, and Breadcrumbs using various color
              variables
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger>Getting started</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid gap-3 p-6 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
                      <li className="row-span-3">
                        <div className="from-muted/50 to-muted flex h-full w-full flex-col justify-end rounded-md bg-gradient-to-b p-6 select-none">
                          <div className="mt-4 mb-2 text-lg font-medium">
                            shadcn/ui
                          </div>
                          <p className="text-muted-foreground text-sm leading-tight">
                            Beautifully designed components built with Radix UI
                            and Tailwind CSS.
                          </p>
                        </div>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <a className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground block space-y-1 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none">
                            <div className="text-sm leading-none font-medium">
                              Introduction
                            </div>
                            <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
                              Re-usable components built using Radix UI and
                              Tailwind CSS.
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuTrigger>Components</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2">
                      <li>
                        <NavigationMenuLink asChild>
                          <a className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground block space-y-1 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none">
                            <div className="text-sm leading-none font-medium">
                              Alert Dialog
                            </div>
                            <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
                              A modal dialog that interrupts interaction.
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>

            <Separator />

            <Tabs defaultValue="account" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="account">Account</TabsTrigger>
                <TabsTrigger value="password">Password</TabsTrigger>
                <TabsTrigger value="team">Team</TabsTrigger>
                <TabsTrigger value="billing">Billing</TabsTrigger>
              </TabsList>
              <TabsContent value="account" className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Account Settings</h3>
                  <p className="text-muted-foreground text-sm">
                    Make changes to your account here. Click save when
                    you&apos;re done.
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="password" className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Password</h3>
                  <p className="text-muted-foreground text-sm">
                    Change your password here. After saving, you&apos;ll be
                    logged out.
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="team" className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Team Members</h3>
                  <p className="text-muted-foreground text-sm">
                    Invite and manage team members.
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="billing" className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Billing</h3>
                  <p className="text-muted-foreground text-sm">
                    Manage billing and subscription.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Form Components */}
        <Card>
          <CardHeader>
            <CardTitle>Form Components</CardTitle>
            <CardDescription>
              Input fields, selects, checkboxes, and switches using
              --color-input, --color-ring, --color-border
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="m@example.com" />
                <p className="text-muted-foreground text-xs">
                  Uses --color-input for border
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="disabled">Disabled Input</Label>
                <Input id="disabled" placeholder="Disabled field" disabled />
                <p className="text-muted-foreground text-xs">
                  Disabled state styling
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" placeholder="Type your message here..." />
              <p className="text-muted-foreground text-xs">
                Textarea with focus ring using --color-ring
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="select">Select Framework</Label>
                <Select value={selectedValue} onValueChange={setSelectedValue}>
                  <SelectTrigger id="select">
                    <SelectValue placeholder="Select a framework" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="next">Next.js</SelectItem>
                    <SelectItem value="sveltekit">SvelteKit</SelectItem>
                    <SelectItem value="astro">Astro</SelectItem>
                    <SelectItem value="nuxt">Nuxt.js</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  Dropdown using --color-popover
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="calendar">Date Picker</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? date.toLocaleDateString() : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-muted-foreground text-xs">
                  Calendar in popover
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={checkedState}
                  onCheckedChange={(checked) =>
                    setCheckedState(checked === true)
                  }
                />
                <Label
                  htmlFor="terms"
                  className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Accept terms and conditions
                </Label>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="airplane-mode">Airplane Mode</Label>
                <Switch
                  id="airplane-mode"
                  checked={switchState}
                  onCheckedChange={setSwitchState}
                />
              </div>

              <div className="space-y-2">
                <Label>Choose an option</Label>
                <RadioGroup value={radioValue} onValueChange={setRadioValue}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="option1" id="option1" />
                    <Label htmlFor="option1">Option 1</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="option2" id="option2" />
                    <Label htmlFor="option2">Option 2</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="option3" id="option3" />
                    <Label htmlFor="option3">Option 3</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slider">Volume: {sliderValue[0]}%</Label>
                <Slider
                  id="slider"
                  min={0}
                  max={100}
                  step={1}
                  value={sliderValue}
                  onValueChange={setSliderValue}
                  className="w-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interactive Overlays */}
        <Card>
          <CardHeader>
            <CardTitle>Interactive Overlays</CardTitle>
            <CardDescription>
              Dialogs, Sheets, Popovers, and Tooltips using --color-popover
              backgrounds
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Open Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Are you sure?</DialogTitle>
                  <DialogDescription>
                    This dialog uses --color-popover for its background and
                    --color-popover-foreground for text.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline">Cancel</Button>
                  <Button>Continue</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">Open Sheet</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Edit profile</SheetTitle>
                  <SheetDescription>
                    Make changes to your profile here. This sheet also uses
                    popover colors.
                  </SheetDescription>
                </SheetHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="name"
                      value="Pedro Duarte"
                      className="col-span-3"
                    />
                  </div>
                </div>
                <SheetFooter>
                  <Button type="submit">Save changes</Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">Open Popover</Button>
              </PopoverTrigger>
              <PopoverContent>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <h4 className="leading-none font-medium">Dimensions</h4>
                    <p className="text-muted-foreground text-sm">
                      Set the dimensions for the layer.
                    </p>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">Hover for Tooltip</Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>This tooltip uses theme colors</p>
              </TooltipContent>
            </Tooltip>

            <HoverCard>
              <HoverCardTrigger asChild>
                <Button variant="link">@nextjs</Button>
              </HoverCardTrigger>
              <HoverCardContent className="w-80">
                <div className="flex justify-between space-x-4">
                  <Avatar>
                    <AvatarFallback>VC</AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold">@nextjs</h4>
                    <p className="text-sm">
                      The React Framework – created and maintained by @vercel.
                    </p>
                    <div className="flex items-center pt-2">
                      <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
                      <span className="text-muted-foreground text-xs">
                        Joined December 2021
                      </span>
                    </div>
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
          </CardContent>
        </Card>

        {/* Dropdown and Context Menus */}
        <Card>
          <CardHeader>
            <CardTitle>Menu Components</CardTitle>
            <CardDescription>
              Dropdown and Context menus with various states
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Open Dropdown <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={position}
                  onValueChange={setPosition}
                >
                  <DropdownMenuRadioItem value="top">Top</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="bottom">
                    Bottom
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="right">
                    Right
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <ContextMenu>
              <ContextMenuTrigger asChild>
                <div className="border-border rounded-lg border-2 border-dashed p-8 text-center">
                  <p className="text-muted-foreground text-sm">
                    Right click here
                  </p>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem>Back</ContextMenuItem>
                <ContextMenuItem disabled>Forward</ContextMenuItem>
                <ContextMenuItem>Reload</ContextMenuItem>
                <ContextMenuItem>More Tools</ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          </CardContent>
        </Card>

        {/* Accordion and Collapsible */}
        <Card>
          <CardHeader>
            <CardTitle>Expandable Content</CardTitle>
            <CardDescription>
              Accordion and Collapsible components
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>Is it accessible?</AccordionTrigger>
                <AccordionContent>
                  Yes. It adheres to the WAI-ARIA design pattern.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>Is it styled?</AccordionTrigger>
                <AccordionContent>
                  Yes. It comes with default styles that match the other
                  components&apos; aesthetic.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>Is it animated?</AccordionTrigger>
                <AccordionContent>
                  Yes. It&apos;s animated by default, but you can disable it if
                  you prefer.
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Separator />

            <Collapsible
              open={openCollapsible}
              onOpenChange={setOpenCollapsible}
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">
                  @peduarte starred 3 repositories
                </h4>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-9 p-0">
                    <ChevronRight className="h-4 w-4" />
                    <span className="sr-only">Toggle</span>
                  </Button>
                </CollapsibleTrigger>
              </div>
              <div className="rounded-md border px-4 py-3 font-mono text-sm">
                @radix-ui/primitives
              </div>
              <CollapsibleContent className="space-y-2">
                <div className="rounded-md border px-4 py-3 font-mono text-sm">
                  @radix-ui/colors
                </div>
                <div className="rounded-md border px-4 py-3 font-mono text-sm">
                  @stitches/react
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        {/* Buttons Extended */}
        <Card>
          <CardHeader>
            <CardTitle>Button Variants & States</CardTitle>
            <CardDescription>
              All button variants with sizes and loading states
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button>Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </div>
            <Separator />
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
            <Separator />
            <div className="flex flex-wrap gap-2">
              <Button disabled>Disabled</Button>
              <Button disabled variant="secondary">
                Disabled
              </Button>
              <Button>
                <Spinner className="mr-2 h-4 w-4" />
                Loading
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Badges Extended */}
        <Card>
          <CardHeader>
            <CardTitle>Badge Variations</CardTitle>
            <CardDescription>
              Status indicators with different semantic meanings
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge className="bg-green-500 text-white">Success</Badge>
            <Badge className="bg-yellow-500 text-white">Warning</Badge>
            <Badge className="bg-blue-500 text-white">Info</Badge>
            <Badge className="bg-purple-500 text-white">Purple</Badge>
          </CardContent>
        </Card>

        {/* Alerts Extended */}
        <Card>
          <CardHeader>
            <CardTitle>Alert Components</CardTitle>
            <CardDescription>
              Information, warning, and error states
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Information</AlertTitle>
              <AlertDescription>
                This is an informational alert using default styling.
              </AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                This is an error alert using the destructive variant.
              </AlertDescription>
            </Alert>
            <Alert className="border-yellow-500 text-yellow-800 dark:text-yellow-300">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                This is a custom warning alert with modified colors.
              </AlertDescription>
            </Alert>
            <Alert className="border-green-500 text-green-800 dark:text-green-300">
              <Check className="h-4 w-4" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>
                This is a custom success alert.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Loading States */}
        <Card>
          <CardHeader>
            <CardTitle>Loading & Skeleton States</CardTitle>
            <CardDescription>
              Skeleton loaders and spinners for async content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Spinner className="h-4 w-4" />
              <Spinner className="h-6 w-6" />
              <Spinner className="h-8 w-8" />
              <span className="text-muted-foreground text-sm">
                Spinner sizes
              </span>
            </div>
            <Separator />
            <div className="space-y-3">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-4 w-[150px]" />
            </div>
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Toggle Components */}
        <Card>
          <CardHeader>
            <CardTitle>Toggle Components</CardTitle>
            <CardDescription>
              Toggle buttons and groups for toolbars
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Toggle aria-label="Toggle italic">
                <Italic className="h-4 w-4" />
              </Toggle>
              <Toggle aria-label="Toggle bold">
                <Bold className="h-4 w-4" />
              </Toggle>
              <Toggle aria-label="Toggle underline">
                <Underline className="h-4 w-4" />
              </Toggle>
            </div>
            <Separator />
            <ToggleGroup type="single" defaultValue="center">
              <ToggleGroupItem value="left" aria-label="Toggle left align">
                <AlignLeft className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="center" aria-label="Toggle center align">
                <AlignCenter className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="right" aria-label="Toggle right align">
                <AlignRight className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </CardContent>
        </Card>

        {/* Scroll Area Demo */}
        <Card>
          <CardHeader>
            <CardTitle>Scroll Area</CardTitle>
            <CardDescription>
              Custom scrollbars for overflowing content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-72 w-full rounded-md border p-4">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Tags</h4>
                {Array.from({ length: 50 }).map((_, i) => (
                  <div key={i} className="text-sm">
                    <div className="flex items-center justify-between">
                      <span>Tag {i + 1}</span>
                      <Badge variant="outline">v{i}.0.0</Badge>
                    </div>
                    <Separator className="my-2" />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Aspect Ratio */}
        <Card>
          <CardHeader>
            <CardTitle>Aspect Ratio</CardTitle>
            <CardDescription>
              Maintain aspect ratios for media content
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div>
              <AspectRatio
                ratio={16 / 9}
                className="bg-muted overflow-hidden rounded-lg"
              >
                <div className="flex h-full w-full items-center justify-center">
                  <span className="text-muted-foreground">16:9</span>
                </div>
              </AspectRatio>
            </div>
            <div>
              <AspectRatio
                ratio={4 / 3}
                className="bg-muted overflow-hidden rounded-lg"
              >
                <div className="flex h-full w-full items-center justify-center">
                  <span className="text-muted-foreground">4:3</span>
                </div>
              </AspectRatio>
            </div>
            <div>
              <AspectRatio
                ratio={1 / 1}
                className="bg-muted overflow-hidden rounded-lg"
              >
                <div className="flex h-full w-full items-center justify-center">
                  <span className="text-muted-foreground">1:1</span>
                </div>
              </AspectRatio>
            </div>
          </CardContent>
        </Card>

        {/* Keyboard Shortcuts */}
        <Card>
          <CardHeader>
            <CardTitle>Keyboard Shortcuts</CardTitle>
            <CardDescription>
              Display keyboard shortcuts with Kbd component
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Copy</span>
                <div>
                  <Kbd>⌘</Kbd> + <Kbd>C</Kbd>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Paste</span>
                <div>
                  <Kbd>⌘</Kbd> + <Kbd>V</Kbd>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Save</span>
                <div>
                  <Kbd>⌘</Kbd> + <Kbd>S</Kbd>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Search</span>
                <div>
                  <Kbd>⌘</Kbd> + <Kbd>K</Kbd>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        <Card>
          <CardHeader>
            <CardTitle>Pagination</CardTitle>
            <CardDescription>Page navigation component</CardDescription>
          </CardHeader>
          <CardContent>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious href="#" />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#">1</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#" isActive>
                    2
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#">3</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext href="#" />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </CardContent>
        </Card>

        {/* Progress Examples */}
        <Card>
          <CardHeader>
            <CardTitle>Progress Indicators</CardTitle>
            <CardDescription>
              Various progress states and animations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Installation</span>
                <span className="text-muted-foreground">25%</span>
              </div>
              <Progress value={25} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Configuration</span>
                <span className="text-muted-foreground">50%</span>
              </div>
              <Progress value={50} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Deployment</span>
                <span className="text-muted-foreground">75%</span>
              </div>
              <Progress value={75} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Complete</span>
                <span className="text-muted-foreground">100%</span>
              </div>
              <Progress value={100} />
            </div>
          </CardContent>
        </Card>

        {/* Data Table Extended */}
        <Card>
          <CardHeader>
            <CardTitle>Rich Data Table</CardTitle>
            <CardDescription>
              Complex table with avatars, badges, and actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-chart-1">
                          JD
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">John Doe</p>
                        <p className="text-muted-foreground text-xs">
                          john@example.com
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge>Active</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">Developer</Badge>
                  </TableCell>
                  <TableCell>Engineering</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={85} className="w-[60px]" />
                      <span className="text-muted-foreground text-xs">85%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>View details</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-chart-2">
                          JS
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">Jane Smith</p>
                        <p className="text-muted-foreground text-xs">
                          jane@example.com
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">Pending</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">Designer</Badge>
                  </TableCell>
                  <TableCell>Creative</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={62} className="w-[60px]" />
                      <span className="text-muted-foreground text-xs">62%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>View details</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Complex Stats Dashboard */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue
              </CardTitle>
              <Activity className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$45,231.89</div>
              <p className="text-muted-foreground text-xs">
                +20.1% from last month
              </p>
              <Progress value={20} className="mt-2 h-1" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Subscriptions
              </CardTitle>
              <Users className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+2,350</div>
              <p className="text-muted-foreground text-xs">
                +180.1% from last month
              </p>
              <Progress value={80} className="mt-2 h-1" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sales</CardTitle>
              <Zap className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+12,234</div>
              <p className="text-muted-foreground text-xs">
                +19% from last month
              </p>
              <Progress value={19} className="mt-2 h-1" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Now</CardTitle>
              <Activity className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+573</div>
              <p className="text-muted-foreground text-xs">
                +201 since last hour
              </p>
              <Progress value={57} className="mt-2 h-1" />
            </CardContent>
          </Card>
        </div>

        {/* Toast Notification Demo */}
        <Card>
          <CardHeader>
            <CardTitle>Toast Notifications</CardTitle>
            <CardDescription>
              Trigger toast notifications with different styles
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              onClick={() =>
                toast("Event has been created", {
                  description: "Sunday, December 03, 2023 at 9:00 AM",
                })
              }
            >
              Show Toast
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                toast.success("Success!", {
                  description: "Your changes have been saved.",
                })
              }
            >
              Success Toast
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                toast.error("Error!", {
                  description: "Something went wrong.",
                })
              }
            >
              Error Toast
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                toast.warning("Warning!", {
                  description: "Please review your input.",
                })
              }
            >
              Warning Toast
            </Button>
          </CardContent>
        </Card>

        {/* Theme Customization Guide */}
        <Card>
          <CardHeader>
            <CardTitle>Complete CSS Variable Reference</CardTitle>
            <CardDescription>
              All CSS variables used by shadcn/ui components
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted rounded-lg p-4">
              <p className="mb-4 font-mono text-sm">
                Edit{" "}
                <code className="text-primary">src/styles/globals.css</code> to
                customize:
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="mb-2 text-sm font-medium">Core Colors</h4>
                  <ul className="text-muted-foreground space-y-1 font-mono text-xs">
                    <li>• --background / --foreground</li>
                    <li>• --primary / --primary-foreground</li>
                    <li>• --secondary / --secondary-foreground</li>
                    <li>• --muted / --muted-foreground</li>
                    <li>• --accent / --accent-foreground</li>
                    <li>• --destructive / --destructive-foreground</li>
                  </ul>
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-medium">Component Colors</h4>
                  <ul className="text-muted-foreground space-y-1 font-mono text-xs">
                    <li>• --card / --card-foreground</li>
                    <li>• --popover / --popover-foreground</li>
                    <li>• --border (all borders)</li>
                    <li>• --input (form field borders)</li>
                    <li>• --ring (focus rings)</li>
                    <li>• --radius (border radius)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-medium">Chart Colors</h4>
                  <ul className="text-muted-foreground space-y-1 font-mono text-xs">
                    <li>• --chart-1 (primary data)</li>
                    <li>• --chart-2 (secondary data)</li>
                    <li>• --chart-3 (tertiary data)</li>
                    <li>• --chart-4 (quaternary data)</li>
                    <li>• --chart-5 (quinary data)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-medium">Sidebar Colors</h4>
                  <ul className="text-muted-foreground space-y-1 font-mono text-xs">
                    <li>• --sidebar / --sidebar-foreground</li>
                    <li>• --sidebar-primary / --sidebar-primary-foreground</li>
                    <li>• --sidebar-accent / --sidebar-accent-foreground</li>
                    <li>• --sidebar-border</li>
                    <li>• --sidebar-ring</li>
                  </ul>
                </div>
              </div>
            </div>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Testing Tip</AlertTitle>
              <AlertDescription>
                Modify any CSS variable in globals.css and refresh this page to
                see how it affects all components. The same variables are
                defined for both light mode (in :root) and dark mode (in .dark).
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
