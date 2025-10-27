import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ShadcnShowcasePage() {
  return (
    <div className="container mx-auto space-y-8 p-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">
          Shadcn Component Showcase
        </h1>
        <p className="text-muted-foreground text-lg">
          Demonstrating how global CSS variables control component theming
        </p>
      </div>

      <Separator />

      {/* Color Palette Display */}
      <Card>
        <CardHeader>
          <CardTitle>Color Palette</CardTitle>
          <CardDescription>
            CSS variables defined in globals.css that control component styling
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <div className="bg-background border-border h-20 rounded-lg border"></div>
              <div className="text-sm">
                <p className="font-medium">Background</p>
                <p className="text-muted-foreground text-xs">
                  --color-background
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="bg-primary h-20 rounded-lg"></div>
              <div className="text-sm">
                <p className="font-medium">Primary</p>
                <p className="text-muted-foreground text-xs">--color-primary</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="bg-secondary h-20 rounded-lg"></div>
              <div className="text-sm">
                <p className="font-medium">Secondary</p>
                <p className="text-muted-foreground text-xs">
                  --color-secondary
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="bg-muted h-20 rounded-lg"></div>
              <div className="text-sm">
                <p className="font-medium">Muted</p>
                <p className="text-muted-foreground text-xs">--color-muted</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="bg-accent h-20 rounded-lg"></div>
              <div className="text-sm">
                <p className="font-medium">Accent</p>
                <p className="text-muted-foreground text-xs">--color-accent</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="bg-destructive h-20 rounded-lg"></div>
              <div className="text-sm">
                <p className="font-medium">Destructive</p>
                <p className="text-muted-foreground text-xs">
                  --color-destructive
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="bg-card border-border h-20 rounded-lg border"></div>
              <div className="text-sm">
                <p className="font-medium">Card</p>
                <p className="text-muted-foreground text-xs">--color-card</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="bg-popover border-border h-20 rounded-lg border"></div>
              <div className="text-sm">
                <p className="font-medium">Popover</p>
                <p className="text-muted-foreground text-xs">--color-popover</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Buttons</CardTitle>
          <CardDescription>
            Using --color-primary, --color-secondary, --color-destructive
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button>Primary Button</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
        </CardContent>
      </Card>

      {/* Badges */}
      <Card>
        <CardHeader>
          <CardTitle>Badges</CardTitle>
          <CardDescription>
            Using various color variables for status indicators
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </CardContent>
      </Card>

      {/* Alerts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Alert>
          <AlertTitle>Default Alert</AlertTitle>
          <AlertDescription>
            Uses --color-background and --color-foreground variables
          </AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <AlertTitle>Destructive Alert</AlertTitle>
          <AlertDescription>
            Uses --color-destructive variable
          </AlertDescription>
        </Alert>
      </div>

      {/* Progress Bars */}
      <Card>
        <CardHeader>
          <CardTitle>Progress Indicators</CardTitle>
          <CardDescription>Using --color-primary variable</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress 25%</span>
            </div>
            <Progress value={25} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress 50%</span>
            </div>
            <Progress value={50} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress 75%</span>
            </div>
            <Progress value={75} />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Data Table</CardTitle>
          <CardDescription>
            Using --color-muted, --color-border, and text colors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Avatar>
                      <AvatarFallback>JD</AvatarFallback>
                    </Avatar>
                    John Doe
                  </div>
                </TableCell>
                <TableCell>
                  <Badge>Active</Badge>
                </TableCell>
                <TableCell>Developer</TableCell>
                <TableCell className="text-right">85%</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Avatar>
                      <AvatarFallback>JS</AvatarFallback>
                    </Avatar>
                    Jane Smith
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">Pending</Badge>
                </TableCell>
                <TableCell>Designer</TableCell>
                <TableCell className="text-right">62%</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Avatar>
                      <AvatarFallback>BJ</AvatarFallback>
                    </Avatar>
                    Bob Johnson
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="destructive">Blocked</Badge>
                </TableCell>
                <TableCell>Manager</TableCell>
                <TableCell className="text-right">30%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Chart Colors Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Chart Color Variables</CardTitle>
          <CardDescription>
            Special color variables for data visualization (--color-chart-1
            through --color-chart-5)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            <div className="space-y-2">
              <div className="bg-chart-1 h-24 rounded-lg"></div>
              <p className="text-center text-sm font-medium">Chart 1</p>
            </div>
            <div className="space-y-2">
              <div className="bg-chart-2 h-24 rounded-lg"></div>
              <p className="text-center text-sm font-medium">Chart 2</p>
            </div>
            <div className="space-y-2">
              <div className="bg-chart-3 h-24 rounded-lg"></div>
              <p className="text-center text-sm font-medium">Chart 3</p>
            </div>
            <div className="space-y-2">
              <div className="bg-chart-4 h-24 rounded-lg"></div>
              <p className="text-center text-sm font-medium">Chart 4</p>
            </div>
            <div className="space-y-2">
              <div className="bg-chart-5 h-24 rounded-lg"></div>
              <p className="text-center text-sm font-medium">Chart 5</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$45,231.89</div>
            <p className="text-muted-foreground text-xs">
              +20.1% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+2,350</div>
            <p className="text-muted-foreground text-xs">
              +180.1% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+12,234</div>
            <p className="text-muted-foreground text-xs">
              +19% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Theme Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Customize</CardTitle>
          <CardDescription>
            All components derive their colors from CSS variables in
            globals.css
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <p className="font-mono text-sm">
              Edit <code className="text-primary">src/styles/globals.css</code>{" "}
              to change:
            </p>
            <ul className="text-muted-foreground mt-2 space-y-1 font-mono text-sm">
              <li>• --background, --foreground (main colors)</li>
              <li>• --primary, --secondary (button colors)</li>
              <li>• --muted, --accent (subtle backgrounds)</li>
              <li>• --destructive (error states)</li>
              <li>• --border, --input, --ring (borders/focus)</li>
              <li>• --chart-1 through --chart-5 (data viz)</li>
            </ul>
          </div>
          <p className="text-muted-foreground text-sm">
            The same variables are defined for both light mode (in :root) and
            dark mode (in .dark), allowing automatic theme switching.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
