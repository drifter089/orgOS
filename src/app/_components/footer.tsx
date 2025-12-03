import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-border/50 bg-background/95 w-full border-t px-6 py-12 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          {/* Brand */}
          <div>
            <h3 className="text-foreground mb-4 text-lg font-bold">Ryo</h3>
            <p className="text-muted-foreground text-sm">
              Your organizational operating system
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-foreground mb-4 text-sm font-semibold">
              Product
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="#demo"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="/docs"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Documentation
                </Link>
              </li>
              <li>
                <Link
                  href="/workflow"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Workflow
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-foreground mb-4 text-sm font-semibold">
              Company
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/mission"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Mission
                </Link>
              </li>
              <li>
                <a
                  href="#"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Blog
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Careers
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-foreground mb-4 text-sm font-semibold">
              Legal
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Privacy
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Terms
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-border/50 mt-12 border-t pt-8 text-center">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} Ryo. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
